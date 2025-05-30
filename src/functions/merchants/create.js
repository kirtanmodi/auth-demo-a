import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pg from "pg";
import { randomUUID } from "crypto";

const { Client } = pg;

// Initialize database connection
let dbClient = null;

async function initializeDatabase() {
  if (dbClient) return dbClient;

  try {
    let dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    };

    // Get database credentials from Secrets Manager if in AWS
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const secretArn = process.env.DB_SECRET_ARN;
      if (secretArn) {
        const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });
        const command = new GetSecretValueCommand({ SecretId: secretArn });
        const response = await secretsManager.send(command);

        if (response.SecretString) {
          const credentials = JSON.parse(response.SecretString);
          dbConfig.user = credentials.username;
          dbConfig.password = credentials.password;
        }
      }
    }

    dbClient = new Client(dbConfig);
    await dbClient.connect();
    return dbClient;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

export const handler = async (event) => {
  try {
    // Initialize database connection
    const client = await initializeDatabase();

    // Parse request body
    const body = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!body.businessName || !body.legalName || !body.email || !body.phone) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing required fields: businessName, legalName, email, phone",
        }),
      };
    }

    // Create merchant in database
    const merchantId = randomUUID();
    const query = `
      INSERT INTO merchants (
        merchant_id, business_name, legal_name, email, phone, website, 
        status, entity_type, country, tc_version, currency, mcc, 
        verification_status, is_new, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING merchant_id, business_name, legal_name, email, phone, website, status, created_at
    `;

    const values = [
      merchantId,
      body.businessName,
      body.legalName,
      body.email,
      body.phone,
      body.website || null,
      1, // Active status
      1, // Entity type
      "US", // Country
      "1.0", // TC version
      "USD", // Currency
      "5999", // MCC
      0, // Verification status
      true, // Is new
    ];

    const result = await client.query(query, values);
    const merchant = result.rows[0];

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Merchant created successfully",
        data: {
          id: merchant.merchant_id,
          businessName: merchant.business_name,
          legalName: merchant.legal_name,
          email: merchant.email,
          phone: merchant.phone,
          website: merchant.website,
          status: merchant.status,
          createdAt: merchant.created_at,
        },
      }),
    };
  } catch (error) {
    console.error("Error creating merchant:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
