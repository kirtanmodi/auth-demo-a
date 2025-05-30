import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pg from "pg";

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

    // Get merchants from database
    const query = `
      SELECT merchant_id, business_name, legal_name, email, phone, website, status, created_at
      FROM merchants 
      ORDER BY created_at DESC 
      LIMIT 100
    `;

    const result = await client.query(query);

    // Transform data for frontend
    const transformedMerchants = result.rows.map((merchant) => ({
      id: merchant.merchant_id,
      businessName: merchant.business_name,
      legalName: merchant.legal_name,
      email: merchant.email,
      phone: merchant.phone,
      website: merchant.website,
      status: getStatusText(merchant.status),
      createdAt: merchant.created_at,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Merchants listed successfully",
        data: transformedMerchants,
        count: transformedMerchants.length,
      }),
    };
  } catch (error) {
    console.error("Error listing merchants:", error);
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

function getStatusText(status) {
  switch (status) {
    case 1:
      return "Active";
    case 2:
      return "Pending";
    case 3:
      return "Suspended";
    case 4:
      return "Rejected";
    default:
      return "Unknown";
  }
}
