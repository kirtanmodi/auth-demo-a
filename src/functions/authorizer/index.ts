import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pg from "pg";
import { createHash, timingSafeEqual } from "crypto";
import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, Context } from "aws-lambda";

const { Client } = pg;

// Initialize database connection
let dbClient: pg.Client | null = null;

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface DatabaseCredentials {
  username: string;
  password: string;
}

interface UserRow {
  user_id: string;
  email: string;
  role: string;
  status: number;
  api_token: string | null;
  api_token_expires_at: Date | null;
}

async function initializeDatabase(): Promise<pg.Client> {
  if (dbClient) return dbClient;

  try {
    let dbConfig: DatabaseConfig = {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME!,
      user: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
    };

    // Get database credentials from Secrets Manager if in AWS
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const secretArn = process.env.DB_SECRET_ARN;
      if (secretArn) {
        const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });
        const command = new GetSecretValueCommand({ SecretId: secretArn });
        const response = await secretsManager.send(command);

        if (response.SecretString) {
          const credentials: DatabaseCredentials = JSON.parse(response.SecretString);
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

async function validateToken(token: string): Promise<UserRow | null> {
  try {
    const client = await initializeDatabase();

    // Query user by API token
    const query = `
      SELECT user_id, email, role, status, api_token, api_token_expires_at
      FROM users 
      WHERE api_token = $1 
        AND status = 1 
        AND (api_token_expires_at IS NULL OR api_token_expires_at > NOW())
    `;

    const result = await client.query(query, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0] as UserRow;

    // Verify token using timing-safe comparison
    const providedTokenBuffer = Buffer.from(token, "utf8");
    const storedTokenBuffer = Buffer.from(user.api_token!, "utf8");

    if (providedTokenBuffer.length !== storedTokenBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedTokenBuffer, storedTokenBuffer)) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Token validation failed:", error);
    return null;
  }
}

/**
 * Lambda authorizer to validate user API tokens for API Gateway requests
 * Uses direct PostgreSQL connection instead of TypeORM to avoid ESM issues
 */
export const handler = async (event: APIGatewayTokenAuthorizerEvent, context: Context): Promise<APIGatewayAuthorizerResult> => {
  console.log("Authorizer event:", JSON.stringify(event, null, 2));

  try {
    // Parse methodArn: "arn:aws:execute-api:region:account:apiId/stage/METHOD/resource"
    const parts = event.methodArn.split("/");
    const method = parts[parts.length - 2]; // GET, POST, etc.
    const resource = parts[parts.length - 1]; // merchants, etc.

    console.log(`Request: ${method} ${resource}`);

    // Check if this is a public endpoint (POST /merchants for registration)
    if (method === "POST" && resource === "merchants") {
      console.log("Public endpoint accessed - allowing without authentication");
      return generatePolicy("public-user", "Allow", event.methodArn);
    }

    // For protected endpoints, require valid user authentication
    const authHeader = event.authorizationToken;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      console.log("No token provided");
      throw new Error("Unauthorized");
    }

    // Validate token using direct database query
    const user = await validateToken(token);

    if (!user) {
      console.log("Invalid or expired token");
      throw new Error("Unauthorized");
    }

    // Check if user has admin privileges for admin-only endpoints
    if (user.role !== "admin" && user.role !== "super_admin") {
      console.log(`User ${user.email} does not have admin privileges (role: ${user.role})`);
      throw new Error("Forbidden");
    }

    console.log(`Authentication successful for admin user: ${user.email} (${user.role})`);

    return generatePolicy(user.user_id, "Allow", event.methodArn, {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.log("Authorization failed:", (error as Error).message);
    throw new Error("Unauthorized");
  }
};

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  context: Record<string, any> = {}
): APIGatewayAuthorizerResult {
  const authResponse: APIGatewayAuthorizerResult = {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: context,
  };

  console.log("Generated policy:", JSON.stringify(authResponse, null, 2));
  return authResponse;
}
