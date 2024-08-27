Real-Time Chat Application
Overview

This project is a real-time chat application built with Node.js, Express.js, Socket.IO, Redis, and JWT for secure user authentication. The project is structured into two main folders:

    api: Contains the backend, which handles the server-side logic, API endpoints, and database interactions.
    app: Contains the frontend, which provides the user interface for interacting with the chat application.

The application enables users to register, log in, join chat rooms, and send and receive messages in real-time. The backend is deployed on Render, and the frontend is built using React.js and deployed on Vercel.

Application Link:
[HulkChat](https://hulkchat-zeta.vercel.app)

Features
User Registration and Authentication

    User Registration: Users can sign up with a username and password.
    User Login: Upon successful authentication, a JWT token is provided for secure access to protected routes.
    Token Security: JWT tokens are securely stored and managed.

Real-Time Chat

    Join/Leave Chat Rooms: Users can join or leave chat rooms dynamically.
    Real-Time Messaging: Messages sent to chat rooms are broadcasted in real-time to all participants.
    User Identification: Each message displays the sender's information.

Message Storage

    Persistent Storage: All messages are stored in a PostgreSQL database.
    Message Retrieval: New users joining a chat room can view recent chat history.

Rate Limiting

    Spam Prevention: Rate limiting is implemented to restrict the number of messages a user can send per minute.

Frontend Application

    Responsive UI: A clean and responsive web interface that interacts with the backend.
    User Registration and Login: Easy-to-use forms for user registration and login.
    Real-Time Chat Interface: A dynamic chat interface providing real-time messaging capabilities.

Extra Features

    Private Messages: Users can send direct messages to other users.
    User Online Status: Displays the online/offline status of users.
    Persistent Chat Rooms: Users can create and join chat rooms that persist in the database.
    Message Status: Tracks the status of messages (sent, delivered, read).

Technologies Used
Backend

    Node.js
    Express.js
    Socket.IO
    PostgreSQL
    Redis

Frontend

    React.js

Authentication

    JWT (JSON Web Token)

Database Schema

The database schema includes the following tables:

sql

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL
);

CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_members (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, room_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent'
);

ALTER TABLE messages
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC';

Setup and Installation
Prerequisites

    Node.js
    Redis
    PostgreSQL

Backend Setup (api folder)

    Clone the repository:

    bash

git clone https://github.com/your-username/real-time-chat-app.git
cd real-time-chat-app/api

Install dependencies:

bash

npm install

Set up environment variables:

Create a .env file in the api directory and add the following variables:

env

DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
SECURE_KEY=your_jwt_secure_key
REDIS_PASSWORD=your_redis_password
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
PORT=4000

Run the backend application:

bash

    node app.js

    The backend will be running at http://localhost:4000.

Frontend Setup (app folder)

    Navigate to the app directory:

    bash

cd ../app

Install dependencies:

bash

npm install

Set up environment variables:

Create a .env file in the app directory and add the following variable:

env

REACT_APP_BACKEND_URL=http://localhost:4000

Start the frontend:

bash

npm start

The frontend will be running at http://localhost:3000.
