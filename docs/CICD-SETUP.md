# CI/CD Setup Guide for Task-App

This guide provides step-by-step instructions to set up a complete CI/CD pipeline for the Task-App using GitHub Actions and AWS Secrets Manager.

## Prerequisites

- AWS Account
- GitHub Repository
- Linux server for deployment with SSH access
- Node.js and PM2 installed on the server

## Step 1: Set Up AWS Resources

### Create Secrets in AWS Secrets Manager

1. **Log in to AWS Console**
   - Navigate to the AWS Secrets Manager service

2. **Store your environment variables**
   - Click "Store a new secret"
   - Select "Other type of secret"
   - Add your environment variables as key-value pairs, similar to your .env file
   - Name the secret: `task-app-production`
   - Note the ARN (you'll need it later): `arn:aws:secretsmanager:region:account:secret:task-app-production-xxxxx`

   Alternatively, you can use our script:
   ```bash
   # Make sure you have AWS CLI configured with appropriate credentials
   npm run secrets:create task-app-production .env
   ```

### Create IAM User for GitHub Actions

1. **Create IAM Policy**
   - Navigate to IAM → Policies → Create policy
   - Use the JSON policy in the file `docs/aws-iam-policy.json` (replace placeholder values with your actual AWS account ID and region)
   - Name the policy: `TaskAppDeploymentPolicy`

2. **Create IAM User**
   - Go to IAM → Users → Add user
   - Name: `github-actions-task-app`
   - Access type: Programmatic access
   - Attach the `TaskAppDeploymentPolicy`
   - Complete user creation
   - **Save the Access Key ID and Secret Access Key** - you'll need these for GitHub

## Step 2: Set Up GitHub Repository Secrets

1. **Access Repository Settings**
   - Navigate to your GitHub repository
   - Go to Settings → Secrets and variables → Actions

2. **Add Required Secrets**
   Add the following repository secrets:

   **AWS Authentication:**
   - `AWS_ACCESS_KEY_ID`: Your IAM user's access key ID
   - `AWS_SECRET_ACCESS_KEY`: Your IAM user's secret access key
   - `AWS_REGION`: Your AWS region (e.g., `us-east-1`)
   - `AWS_SECRET_ARN`: ARN of your AWS Secrets Manager secret

   **Deployment:**
   - `DEPLOY_HOST`: Server hostname/IP
   - `DEPLOY_USERNAME`: SSH username
   - `DEPLOY_KEY`: Private SSH key for deployment (the entire key including BEGIN/END lines)
   - `DEPLOY_PATH`: Directory path on server (e.g., `/var/www/task-app`)

## Step 3: Configure Server for Deployment

1. **Install Node.js and PM2**
   ```bash
   # On your server
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

2. **Create Deployment Directory**
   ```bash
   # On your server
   sudo mkdir -p /var/www/task-app
   sudo chown $USER:$USER /var/www/task-app
   ```

3. **Set Up SSH Key Authentication**
   - Generate SSH key pair if you don't have one already
   - Add the public key to your server's `~/.ssh/authorized_keys` file
   - Add the private key to GitHub secrets as `DEPLOY_KEY`

## Step 4: Triggering the CI/CD Pipeline

The CI/CD pipeline is configured to run automatically when:
- Pull requests are created or updated targeting the `main` branch (runs only tests)
- Code is pushed to the `main` branch (runs the full build and deploy process)

The workflow will:
1. Run tests for all pushes
2. For pushes to `main`:
   - Build the application
   - Fetch secrets from AWS Secrets Manager
   - Package and deploy to your server
   - Restart the application using PM2

## Troubleshooting

- **GitHub Actions Failures**: Check the GitHub Actions logs for detailed error messages
- **Deployment Issues**: Check server logs with `pm2 logs task-app`
- **AWS Secrets**: Verify IAM permissions and secret format by using the AWS CLI:
  ```bash
  aws secretsmanager get-secret-value --secret-id your-secret-arn
  ```

## Updating Secrets

To update secrets in AWS Secrets Manager, you can use our scripts:

```bash
# Update an existing secret
npm run secrets:update task-app-production .env.updated

# Retrieve a secret and save it as .env
npm run secrets:get task-app-production .env.retrieved
``` 