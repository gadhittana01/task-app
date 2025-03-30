# Task Management API

A robust task management API built with TypeScript, Express.js, MongoDB, and Redis. The API provides endpoints for managing tasks with features like authentication, role-based access control, and caching.

## Features

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, User)
- Task CRUD operations
- Task assignment and tracking
- Task history and audit logging
- Task comments and notifications
- Redis caching for improved performance
- Rate limiting and input validation
- AWS integration with SNS/SQS for event handling
- CI/CD pipeline with GitHub Actions and AWS Secrets Manager

## Prerequisites

- Node.js 18 or higher
- MongoDB Atlas account
- Redis Cloud account
- AWS account (for deployment)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=3000

# AWS Configuration
AWS_REGION=us-east-1

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# MongoDB and Redis
MONGODB_URI=your-mongodb-connection-string
REDIS_URL=your-redis-connection-string

# SNS/SQS
SNS_TASK_LOGGING_TOPIC=arn:aws:sns:region:account:topic
SNS_USER_NOTIFICATIONS_TOPIC=arn:aws:sns:region:account:topic
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/task-app.git
cd task-app
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Tasks

- `POST /tasks` - Create a new task
- `GET /tasks/{id}` - Get task details
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task
- `GET /tasks/user/{userId}` - Get all tasks assigned to a user

### Authentication

- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

## CI/CD Pipeline

This project uses GitHub Actions for CI/CD with AWS Secrets Manager integration. The pipeline:

1. Runs tests on every push and pull request
2. Builds the application on pushes to main
3. Retrieves secrets from AWS Secrets Manager
4. Packages and deploys to the configured server using SSH
5. Restarts the application using PM2

### Setting Up CI/CD

To set up the CI/CD pipeline:

1. Create secrets in AWS Secrets Manager
2. Configure GitHub Secrets with AWS credentials and deployment details
3. Push to main branch to trigger deployment

For detailed instructions, see [docs/CICD-SETUP.md](docs/CICD-SETUP.md).

### AWS Secrets Management

The application includes scripts to help manage AWS Secrets:

```bash
# Create a new secret
npm run secrets:create task-app-production .env.production

# Update an existing secret
npm run secrets:update task-app-production .env.production

# Retrieve a secret
npm run secrets:get task-app-production .env
```

## Server Deployment

The application is configured to be deployed on a Linux server with PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs task-app

# Restart the application
pm2 restart task-app
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Task App ECS Deployment Guide

## Overview

This repository contains a Node.js application deployed to AWS ECS Fargate with environment variables stored in AWS Parameter Store.

## Environment Setup

### AWS Parameter Store

All environment variables are stored in AWS Parameter Store with the path prefix `/task-app/production/`.

To upload environment variables:
```bash
# Run the parameter store script
node scripts/aws-param-store.js upload --env-file .env
```

To download environment variables:
```bash
# Retrieve all parameters
node scripts/aws-param-store.js download
```

### IAM Permissions

The following roles and policies are required:

1. **ECS Execution Role** (`ecsTaskExecutionRole`)
   - Needs access to Parameter Store
   - Attach the `TaskAppParameterStoreAccess-ECS` policy

2. **ECS Task Role** (`task-app-ecs-task-role`)
   - Needs access to AWS services used by the application
   - Required policies:
     - `TaskAppParameterStoreAccess-ECS` - For Parameter Store access
     - `TaskAppSQSAccess` - For SQS operations
     - `AmazonDynamoDBFullAccess` - For DynamoDB access

### Deployment

The application is deployed using:
1. ECR for container images
2. ECS Fargate for container orchestration
3. Parameter Store for secure environment variables

## Troubleshooting

### Diagnostic Scripts

Run the diagnostic scripts to verify the setup:

```bash
# Check Parameter Store access
./scripts/test-param-store-access.sh

# Verify deployment
./scripts/verify-ecs-deployment.sh
```

### Common Issues

1. **Missing Environment Variables**: Ensure all required parameters exist in Parameter Store with the correct prefix
2. **IAM Permissions**: Verify both the execution role and task role have the necessary permissions 
3. **Connection Issues**: Check that the application can connect to MongoDB and Redis

### Logs

View application logs in CloudWatch:

```bash
aws logs get-log-events --log-group-name /ecs/task-app --log-stream-name <log-stream-name>
```

## Maintenance

### Updating Environment Variables

1. Update the local `.env` file
2. Upload to Parameter Store:
   ```bash
   node scripts/aws-param-store.js upload --env-file .env
   ```
3. Force a new deployment:
   ```bash
   aws ecs update-service --cluster task-app-cluster --service task-app-service --force-new-deployment
   ```

### Adding New AWS Resources

When adding new AWS resources:
1. Create a policy document (JSON)
2. Create the policy using AWS CLI:
   ```bash
   aws iam create-policy --policy-name <PolicyName> --policy-document file://<policy-file.json>
   ```
3. Attach the policy to the task role:
   ```bash
   aws iam attach-role-policy --role-name task-app-ecs-task-role --policy-arn <policy-arn>
   ```
4. Force a new deployment