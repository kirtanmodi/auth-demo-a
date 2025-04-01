const { Client } = require("pg");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

/**
 * Lambda function to create a new merchant
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @returns {Object} - API Gateway Lambda Proxy Output Format
 */
exports.handler = async (event) => {
  // Initialize response
  let statusCode = 200;
  let responseBody = {};

  // Get database credentials from Secrets Manager
  const secretsManager = new AWS.SecretsManager();
  let dbCredentials;

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!requestBody.name) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Merchant name is required" }),
      };
    }

    // Get database credentials
    const secretData = await secretsManager
      .getSecretValue({
        SecretId: process.env.DB_SECRET_ARN,
      })
      .promise();

    const secret = JSON.parse(secretData.SecretString);
    dbCredentials = {
      user: secret.username,
      password: secret.password,
      host: process.env.DB_ENDPOINT,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    };

    // Connect to database
    const client = new Client(dbCredentials);
    await client.connect();

    // Generate unique ID for merchant
    const merchantId = uuidv4();

    // Insert merchant into database
    const query = `
      INSERT INTO merchants (id, name, email, phone, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const values = [merchantId, requestBody.name, requestBody.email || null, requestBody.phone || null, requestBody.status || "pending"];

    const result = await client.query(query, values);
    await client.end();

    responseBody = result.rows[0];
  } catch (error) {
    console.error("Error creating merchant:", error);
    statusCode = 500;
    responseBody = { error: "Failed to create merchant", details: error.message };
  }

  // Return response
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(responseBody),
  };
};
