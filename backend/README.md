# TypeScript CRUD API with Node.js, Express & MySQL

This is the backend of the application converted to TypeScript, using Sequelize ORM, MySQL database, and Joi input validation.

## Prerequisites

1. **MySQL**: Ensure MySQL is running on your machine.
2. **Database Configuration**:
   Update `config.json` in the root of the `backend` folder with your database credentials:
   ```json
   {
     "database": {
       "host": "localhost",
       "port": 3306,
       "user": "root",
       "password": "your_mysql_password",
       "database": "typescript_crud_api"
     },
     "jwtSecret": "your_jwt_secret"
   }
   ```
   *Note: The application will automatically create the `typescript_crud_api` database if it does not exist.*

## Getting Started

1. Navigate to the `backend` directory (if not already there):
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in Development Mode (with hot reloading via `nodemon` + `ts-node`):
   ```bash
   npm run start:dev
   ```

4. Build and Run in Production:
   - Build TypeScript to JavaScript:
     ```bash
     npm run build
     ```
   - Start the compiled application:
     ```bash
     npm start
     ```

## API Testing Guide

### 1. Create User
- **Method**: `POST`
- **URL**: `http://localhost:4000/users`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "title": "Mr",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "password": "secret123",
    "confirmPassword": "secret123",
    "role": "User"
  }
  ```

### 2. Get All Users
- **Method**: `GET`
- **URL**: `http://localhost:4000/users`

### 3. Get User by ID
- **Method**: `GET`
- **URL**: `http://localhost:4000/users/:id`

### 4. Update User
- **Method**: `PUT`
- **URL**: `http://localhost:4000/users/:id`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "firstName": "Janet",
    "password": "newsecret456",
    "confirmPassword": "newsecret456"
  }
  ```

### 5. Delete User
- **Method**: `DELETE`
- **URL**: `http://localhost:4000/users/:id`
