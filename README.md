# Habit Tracker Backend

Node.js/Express backend for the habit tracking application with MongoDB integration.

## Features
- User authentication (register/login)
- Task management with MongoDB storage
- Monthly progress tracking
- Global task deletion across all months
- RESTful API endpoints

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Update MongoDB connection string with your credentials

3. **Start the server:**
   ```bash
   npm start
   ```
   Server runs on http://localhost:5000

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/savedata` - Save user tasks and progress
- `GET /api/getdata/:userId/:month/:year` - Get user data for specific month/year
- `POST /api/deletetask` - Delete task from all months globally

## Database Schema

### Users Collection
- username (String, unique)
- email (String)
- password (String)
- createdAt (Date)

### UserData Collection
- userId (ObjectId, reference to User)
- tasks (Array of Strings)
- checkedTasks (Map of Boolean values)
- month (Number)
- year (Number)
- updatedAt (Date)