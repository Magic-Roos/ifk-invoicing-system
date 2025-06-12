# IFK Göteborg Orientering - Member Invoicing System

This project is a full-stack web application designed to help the IFK Göteborg Orientering cashier manage invoicing of members based on their competition participation.

## Project Structure

- `/frontend`: Contains the React + TypeScript frontend application (Vite).
- `/backend`: Contains the Node.js backend API.

## Prerequisites

- Node.js and npm (or Yarn)

## Setup

### Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file by copying `.env.example` and add your `OPENAI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
4. Start the development server (details to be added).

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Linting and Formatting

Both `frontend` and `backend` projects are equipped with ESLint and Prettier.

To lint:
```bash
npm run lint
```

To fix linting issues:
```bash
npm run lint:fix
```

To format code:
```bash
npm run format
```

## Tech Stack

- **Frontend:** React, TypeScript, Vite, React Router, Material UI (MUI)
- **Backend:** Node.js, Express.js (planned), OpenAI GPT API
- **Package Manager:** npm
- **Deployment:** Docker (planned)
