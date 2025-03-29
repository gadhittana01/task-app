# Deploying to AWS ECS Fargate

This document outlines the steps to deploy the Task Management application to AWS ECS Fargate using GitHub Actions for CI/CD.

## Prerequisites

- AWS Account with necessary permissions
- GitHub repository for the application
- Docker installed locally for testing

## Required AWS Resources

1. **ECR Repository**: Stores Docker images
2. **ECS Cluster**: Runs the containerized application
3. **ECS Task Definition**: Defines how the container should run
4. **ECS Service**: Manages task instances
5. **Load Balancer**: Routes traffic to the containers
6. **IAM Roles**: Permissions for ECS tasks and services
7. **Parameter Store**: Stores environment variables and secrets

## Setup Steps

### 1. AWS Resource Setup

Use the following commands or AWS Console to create required resources:

```bash
# Create ECR Repository
aws ecr create-repository --repository-name task-app

# Create ECS Cluster
aws ecs create-cluster --cluster-name task-app-cluster --capacity-providers FARGATE

# Create CloudWatch Logs group
aws logs create-log-group --log-group-name /ecs/task-app
```

### 2. IAM Roles

Create two IAM roles:
- **Task Execution Role**: Allows ECS to pull images and read secrets
- **Task Role**: Permissions needed by the application (S3, DynamoDB, etc.)

### 3. Parameter Store

Store application secrets in AWS Parameter Store:

```bash
aws ssm put-parameter --name "/task-app/production/MONGODB_URI" --value "your-mongodb-uri" --type SecureString
aws ssm put-parameter --name "/task-app/production/JWT_SECRET" --value "your-jwt-secret" --type SecureString
# Add other secrets as needed
```

### 4. Task Definition

Use the provided `ecs-task-definition.json` template and register it:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 5. ECS Service

Create an ECS service:

```bash
aws ecs create-service \
  --cluster task-app-cluster \
  --service-name task-app-service \
  --task-definition task-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-zzzzz],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:region:account-id:targetgroup/target-group-name/target-group-id,containerName=task-app,containerPort=3000"
```

## CI/CD Setup

### GitHub Repository Secrets

Add the following secrets to your GitHub repository:

1. `AWS_ACCESS_KEY_ID`: AWS access key
2. `AWS_SECRET_ACCESS_KEY`: AWS secret key
3. `AWS_REGION`: AWS region (e.g., us-east-1)
4. `ECR_REPOSITORY_NAME`: ECR repository name (e.g., task-app)
5. `ECS_TASK_DEFINITION_NAME`: Task definition name (e.g., task-app)
6. `ECS_CONTAINER_NAME`: Container name in task definition (e.g., task-app)
7. `ECS_SERVICE_NAME`: ECS service name (e.g., task-app-service)
8. `ECS_CLUSTER_NAME`: ECS cluster name (e.g., task-app-cluster)

## Deploying Your Application

The GitHub Actions workflow will automatically deploy your application whenever:

1. Code is pushed to the main branch
2. The workflow is manually triggered with confirmation

## Monitoring and Troubleshooting

Monitor your deployment:

1. **GitHub Actions**: Check workflow runs for build and deployment status
2. **AWS ECS Console**: Monitor services and tasks
3. **CloudWatch Logs**: Review application logs
4. **CloudWatch Alarms**: Set up alarms for metrics like CPU and memory usage

## Rolling Back Deployments

To roll back to a previous version:

1. Identify the previous task definition version
2. Update the service to use that version:

```bash
aws ecs update-service --cluster task-app-cluster --service task-app-service --task-definition task-app:<previous-version>
``` 