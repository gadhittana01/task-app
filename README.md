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
- AWS Lambda and API Gateway deployment

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
SECRET_NAME=task-app-secrets

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
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

## Docker Deployment

Build the Docker image:
```bash
docker build -t task-app .
```

Run the container:
```bash
docker run -p 3000:3000 task-app
```

## AWS Deployment

The application is configured to be deployed on AWS Lambda with API Gateway. The CI/CD pipeline will automatically:

1. Build and test the application
2. Create a Docker image
3. Push the image to Amazon ECR
4. Update the Lambda function
5. Update the API Gateway configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 