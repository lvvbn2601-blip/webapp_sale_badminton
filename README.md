# ABMT Badminton E-commerce & Stringing Service

A modern, full-stack web application designed for a badminton store. It features a comprehensive e-commerce platform for selling badminton equipment (rackets, shoes, apparel, etc.) and a specialized booking system for racket stringing services.

## 🌟 Features

### E-commerce Core
* **Product Catalog**: Browse badminton equipment by categories, brands, and variants (size, color, weight, grip).
* **Shopping Cart & Checkout**: Add items to the cart, apply discount coupons, and complete orders.
* **Payments**: Integrated payment gateway support (e.g., MoMo, as referenced in the codebase).
* **Order Tracking**: Track the status of purchases and orders.
* **Reviews**: Customers can leave product reviews and ratings.

### Specialized Services
* **Stringing Service Wizard**: A dedicated booking flow for racket stringing services.
* **String Spools & Stringers**: Manage available stringers and string types.

### User Management
* **Authentication**: User registration and login (JWT based).
* **User Profiles**: Manage personal information, addresses, and view order history.
* **Wishlist**: Save favorite products for later.

### Admin Dashboard
* **Full Management**: Dedicated admin area to manage products, variants, brands, categories, coupons, stringers, orders, and users.
* **Notifications & Chatbot**: Manage customer interactions and store alerts.
* **Settings**: Configure store settings.

## 🛠️ Tech Stack

### Frontend
* **Framework**: Next.js (React)
* **Styling**: Tailwind CSS, Headless UI
* **Animations**: Framer Motion
* **Language**: TypeScript
* **State/Requests**: Axios, Context API

### Backend
* **Framework**: Node.js with Express
* **Language**: TypeScript
* **Database**: MongoDB (Mongoose)
* **Cache & Queues**: Redis (ioredis) with BullMQ
* **Security & Auth**: JWT, Bcrypt, Helmet, Express-Rate-Limit
* **Scheduling**: node-cron

## 📁 Project Structure

```
Web_Sale_ABMT/
├── frontend/             # Next.js frontend application
│   ├── components/       # Reusable React components
│   ├── pages/            # Next.js pages and routing
│   ├── context/          # React Context providers
│   ├── lib/              # Utility functions and API clients
│   ├── styles/           # Global styles and Tailwind configs
│   ├── types/            # TypeScript type definitions
│   └── public/           # Static assets
└── backend/              # Node.js + Express backend application
    ├── src/
    │   ├── controllers/  # Request handlers
    │   ├── services/     # Business logic
    │   └── ...           # Models, routes, middlewares, config
    └── dist/             # Compiled JavaScript output
```

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16 or higher recommended)
* **MongoDB** (Local or Atlas)
* **Redis** (Local or Upstash)

### 1. Clone the repository
Ensure you have the project cloned locally.

### 2. Backend Setup
Navigate to the backend directory, install dependencies, configure environment variables, and start the development server.

```bash
cd backend
npm install
```

Copy the example environment file and update it with your actual credentials (MongoDB URI, JWT secret, Redis URL, etc.):
```bash
cp .env.example .env
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the frontend directory, install dependencies, set up environment variables, and start the frontend application.

```bash
cd frontend
npm install
```

Copy the example environment file and ensure the API URL points to your backend (default is usually `http://localhost:5000` or similar):
```bash
cp .env.local.example .env.local
```

Start the frontend server:
```bash
npm run dev
```

### 4. Access the Application
* **Frontend**: Open `http://localhost:3000` in your browser.
* **Backend API**: The backend typically runs on `http://localhost:5000` (or the port specified in your `.env`).

## 📜 Scripts Overview

**Backend (`/backend`)**
* `npm run dev`: Starts the server in development mode using `ts-node-dev`.
* `npm run build`: Compiles TypeScript to JavaScript.
* `npm start`: Runs the compiled output.

**Frontend (`/frontend`)**
* `npm run dev`: Starts the Next.js development server.
* `npm run build`: Builds the application for production.
* `npm start`: Starts a Next.js production server.
* `npm run lint`: Runs ESLint to catch issues.

## 📄 License
This project is licensed under the ISC License.
