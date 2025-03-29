#!/usr/bin/env node

const { 
  SecretsManagerClient, 
  CreateSecretCommand, 
  GetSecretValueCommand, 
  UpdateSecretCommand 
} = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Initialize the Secrets Manager client
const secretsManager = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Function to create a new secret from .env file
async function createSecret(secretName, envFile = '.env') {
  try {
    // Read the .env file
    const envPath = path.resolve(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) {
      console.error(`Error: File ${envPath} not found`);
      process.exit(1);
    }

    // Parse the .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    // Create the secret
    const command = new CreateSecretCommand({
      Name: secretName,
      SecretString: JSON.stringify(envConfig),
      Description: `Environment variables for the task app from ${envFile}`,
      Tags: [
        {
          Key: 'Project',
          Value: 'task-app'
        },
        {
          Key: 'ManagedBy',
          Value: 'github-actions'
        }
      ]
    });

    const response = await secretsManager.send(command);
    console.log(`Secret created successfully: ${response.ARN}`);
    return response;
  } catch (error) {
    console.error('Error creating secret:', error);
    process.exit(1);
  }
}

// Function to update an existing secret from .env file
async function updateSecret(secretName, envFile = '.env') {
  try {
    // Read the .env file
    const envPath = path.resolve(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) {
      console.error(`Error: File ${envPath} not found`);
      process.exit(1);
    }

    // Parse the .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    // Update the secret
    const command = new UpdateSecretCommand({
      SecretId: secretName,
      SecretString: JSON.stringify(envConfig),
    });

    const response = await secretsManager.send(command);
    console.log(`Secret updated successfully: ${response.ARN}`);
    return response;
  } catch (error) {
    console.error('Error updating secret:', error);
    process.exit(1);
  }
}

// Function to retrieve a secret and save it as .env file
async function getSecret(secretName, outputFile = '.env') {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await secretsManager.send(command);
    const secrets = JSON.parse(response.SecretString);
    
    // Convert back to .env format
    let envContent = '';
    Object.entries(secrets).forEach(([key, value]) => {
      envContent += `${key}=${value}\n`;
    });
    
    // Write to file
    fs.writeFileSync(outputFile, envContent);
    console.log(`Secret retrieved and saved to ${outputFile}`);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    process.exit(1);
  }
}

// Command line interface
function printUsage() {
  console.log(`
Usage:
  node aws-secrets-manager.js create <secret-name> [env-file]
  node aws-secrets-manager.js update <secret-name> [env-file]
  node aws-secrets-manager.js get <secret-name> [output-file]

Examples:
  node aws-secrets-manager.js create task-app-production .env.production
  node aws-secrets-manager.js update task-app-production .env.production
  node aws-secrets-manager.js get task-app-production .env
  `);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const secretName = args[1];
  const filePath = args[2];

  if (!command || !secretName) {
    printUsage();
    process.exit(1);
  }

  switch(command) {
    case 'create':
      await createSecret(secretName, filePath || '.env');
      break;
    case 'update':
      await updateSecret(secretName, filePath || '.env');
      break;
    case 'get':
      await getSecret(secretName, filePath || '.env');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main(); 