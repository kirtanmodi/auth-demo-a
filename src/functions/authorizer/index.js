import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

// Initialize SSM client
const ssm = new SSMClient({ region: process.env.AWS_REGION });

// Cache for tokens to minimize SSM API calls
const tokenCache = {};
const TOKEN_CACHE_MINUTES = 5;

/**
 * Retrieves the API token from SSM Parameter Store
 * @param stage The current environment stage
 * @returns The API token from parameter store
 */
async function getApiToken(stage) {
  // Check cache first
  const cacheKey = `api-token-${stage}`;
  const now = Date.now();

  if (tokenCache[cacheKey] && tokenCache[cacheKey].expiration > now) {
    return tokenCache[cacheKey].token;
  }

  try {
    // Parameter name follows the pattern /auth-demo-a/{stage}/api-token
    const paramName = `/auth-demo-a/${stage}/api-token`;

    const command = new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    });

    const response = await ssm.send(command);

    if (!response.Parameter?.Value) {
      throw new Error(`No token found in parameter store at ${paramName}`);
    }

    // Cache the token
    tokenCache[cacheKey] = {
      token: response.Parameter.Value,
      expiration: now + TOKEN_CACHE_MINUTES * 60 * 1000,
    };

    return response.Parameter.Value;
  } catch (error) {
    console.error("Error retrieving API token from SSM:", error);
    throw error;
  }
}

/**
 * Lambda authorizer to validate tokens for API Gateway requests
 */
export const handler = async (event) => {
  console.log("Authorizer event:", JSON.stringify(event, null, 2));

  try {
    // Get the token from the Authorization header
    const authHeader = event.authorizationToken;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    // Get stage from event
    const stage = process.env.STAGE || "dev";

    // Retrieve expected token from parameter store
    const expectedToken = await getApiToken(stage);

    // Validate token
    if (token !== expectedToken) {
      throw new Error("Unauthorized: Invalid token");
    }

    // Generate policy document for authorized request
    return generatePolicy(token, "Allow", event.methodArn);
  } catch (error) {
    console.error("Authorization failed:", error);
    // Generate policy document for denied request
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

/**
 * Generates an IAM policy document for the API Gateway
 */
function generatePolicy(principalId, effect, resource) {
  // Extract the base resource ARN and allow all methods
  const baseResource = resource.split("/").slice(0, -1).join("/") + "/*";

  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: baseResource,
        },
      ],
    },
    context: {
      // Additional context can be passed to the backend
      // These values can be accessed from $context.authorizer.key in API Gateway
      timestamp: Date.now().toString(),
      stage: process.env.STAGE || "dev",
    },
  };
}
