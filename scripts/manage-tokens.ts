#!/usr/bin/env node

import { SSMClient, PutParameterCommand, GetParameterCommand } from "@aws-sdk/client-ssm";
import { randomBytes } from "crypto";

// Simple command-line argument parsing
const args = process.argv.slice(2);
const command = args[0]; // First argument is the command
let stage = "";
let profile = "payrix";

// Parse remaining arguments
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--stage" || args[i] === "-s") {
    stage = args[i + 1];
    i++; // Skip next argument
  } else if (args[i] === "--profile" || args[i] === "-p") {
    profile = args[i + 1];
    i++; // Skip next argument
  }
}

// Validate arguments
if (!command || (command !== "create-token" && command !== "rotate-token")) {
  console.error("Error: Command must be either 'create-token' or 'rotate-token'");
  showUsage();
  process.exit(1);
}

if (!stage || !["dev", "test", "prod"].includes(stage)) {
  console.error("Error: Stage must be one of: dev, test, prod");
  showUsage();
  process.exit(1);
}

// Generate a secure random token
function generateToken(length = 32): string {
  return randomBytes(length).toString("hex");
}

// Create or update a parameter in SSM
async function putParameter(paramName: string, value: string, description: string): Promise<void> {
  // Set AWS_PROFILE environment variable
  process.env.AWS_PROFILE = profile;

  const ssm = new SSMClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    await ssm.send(
      new PutParameterCommand({
        Name: paramName,
        Value: value,
        Type: "SecureString",
        Description: description,
        Overwrite: true,
      })
    );

    console.log(`Parameter ${paramName} successfully created/updated.`);
  } catch (error) {
    console.error(`Error putting parameter ${paramName}:`, error);
    process.exit(1);
  }
}

// Get a parameter from SSM
async function getParameter(paramName: string): Promise<string | null> {
  // Set AWS_PROFILE environment variable
  process.env.AWS_PROFILE = profile;

  const ssm = new SSMClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    const response = await ssm.send(
      new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      })
    );

    return response.Parameter?.Value || null;
  } catch (error) {
    // Parameter might not exist yet
    if ((error as any).name === "ParameterNotFound") {
      return null;
    }

    console.error(`Error getting parameter ${paramName}:`, error);
    process.exit(1);
  }
}

// Create a new token
async function createToken(): Promise<void> {
  const paramName = `/auth-demo-a/${stage}/api-token`;
  const existingToken = await getParameter(paramName);

  if (existingToken) {
    console.log(`A token for stage '${stage}' already exists.`);
    console.log("Use rotate-token command to replace it.");
    return;
  }

  const token = generateToken();
  await putParameter(paramName, token, `API token for auth-demo-a ${stage} environment`);

  console.log(`New token created for ${stage} environment.`);
  console.log(`Token: ${token}`);
  console.log("IMPORTANT: Save this token securely as it won't be displayed again.");
}

// Rotate an existing token
async function rotateToken(): Promise<void> {
  const paramName = `/auth-demo-a/${stage}/api-token`;
  const existingToken = await getParameter(paramName);

  if (!existingToken) {
    console.log(`No token found for stage '${stage}'.`);
    console.log("Use create-token command to create a new one.");
    return;
  }

  // Generate and store new token
  const newToken = generateToken();
  await putParameter(paramName, newToken, `API token for auth-demo-a ${stage} environment (rotated)`);

  console.log(`Token rotated for ${stage} environment.`);
  console.log(`Old token: ${existingToken.substring(0, 4)}...${existingToken.substring(existingToken.length - 4)}`);
  console.log(`New token: ${newToken}`);
  console.log("IMPORTANT: Save this token securely as it won't be displayed again.");
  console.log("Remember to update this token in your frontend applications as well.");
}

function showUsage() {
  console.log("\nUSAGE:");
  console.log("  tsx scripts/manage-tokens.ts <command> --stage <stage> [--profile <profile>]");
  console.log("\nCOMMANDS:");
  console.log("  create-token    Create a new API token");
  console.log("  rotate-token    Rotate an existing API token");
  console.log("\nOPTIONS:");
  console.log("  --stage, -s     Required. Environment stage: dev, test, or prod");
  console.log("  --profile, -p   Optional. AWS profile to use (default: 'default')");
  console.log("\nEXAMPLES:");
  console.log("  tsx scripts/manage-tokens.ts create-token --stage dev --profile payrix");
  console.log("  tsx scripts/manage-tokens.ts rotate-token --stage prod --profile payrix");
}

// Main function
async function main() {
  console.log(`Command: ${command}`);
  console.log(`Stage: ${stage}`);
  console.log(`Using AWS profile: ${profile}`);

  if (command === "create-token") {
    await createToken();
  } else if (command === "rotate-token") {
    await rotateToken();
  }
}

// Run the application
main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
