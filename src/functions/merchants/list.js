const { Client } = require("pg");
const AWS = require("aws-sdk");

/**
 * Lambda function to list all merchants
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

    // Query to get all merchants
    const query = `
      SELECT * FROM merchants
      ORDER BY created_at DESC
    `;

    const result = await client.query(query);
    await client.end();

    responseBody = result.rows;
  } catch (error) {
    console.error("Error listing merchants:", error);
    statusCode = 500;
    responseBody = { error: "Failed to list merchants", details: error.message };
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
