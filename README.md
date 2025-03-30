# Task Management API

A task management API built with TypeScript, Express.js, MongoDB, and Redis. This application is deployed to AWS ECS Fargate with environment variables stored in AWS Parameter Store.

## Features

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, User)
- Task CRUD operations with history tracking
- Real-time notifications via AWS SNS/SQS
- Fully containerized deployment on AWS ECS
- CI/CD pipeline with GitHub Actions and AWS ECR

## AWS Infrastructure

This application uses the following AWS services:
- **ECS Fargate** for containerized deployment
- **ECR** for Docker image storage
- **Parameter Store** for environment variables
- **SNS/SQS** for messaging and notifications
- **Application Load Balancer** for load balancing
- **CloudWatch** for logging and monitoring

## Environment Variables

Our application uses the following environment variables, stored in AWS Parameter Store:

```env
# Core Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority

# Caching
REDIS_URL=redis://<username>:<password>@<host>:<port>

# Authentication
JWT_SECRET=<your-jwt-secret>
JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AWS Configuration
AWS_REGION=us-east-1
SNS_TASK_LOGGING_TOPIC=arn:aws:sns:us-east-1:<account-id>:notifications-task-logging
SNS_USER_NOTIFICATIONS_TOPIC=arn:aws:sns:us-east-1:<account-id>:notifications-user
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/<account-id>/task-events-queue

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## CI/CD Pipeline

Our GitHub Actions workflow (`ecs-deploy.yml`) automates the deployment process:

1. **Build & Test**
   - Checks out code and sets up Node.js
   - Installs dependencies and verifies TypeScript setup
   - Builds TypeScript and runs tests

2. **Docker Image Creation**
   - Configures AWS credentials
   - Logs in to Amazon ECR
   - Builds and pushes the Docker image with tags

3. **ECS Deployment**
   - Downloads the current ECS task definition
   - Updates the task definition with the new image
   - Deploys the updated task definition to ECS
   - Waits for service stability

4. **Parameter Store Integration**
   - All environment variables are stored in AWS Parameter Store
   - The ECS task fetches parameters at runtime
   - Sensitive data is securely managed without being stored in repositories

## Application Access

The application is accessible through an Application Load Balancer:

```
http://task-app-alb-96327532.us-east-1.elb.amazonaws.com
```

Health check endpoint:
```
http://task-app-alb-96327532.us-east-1.elb.amazonaws.com/health
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request