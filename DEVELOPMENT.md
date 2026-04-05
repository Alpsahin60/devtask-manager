# DevTask Manager - Setup & Development Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MongoDB** - Local installation or [MongoDB Atlas](https://cloud.mongodb.com)
- **Git** - [Download](https://git-scm.com/)

### 1️⃣ Clone & Install
```bash
git clone https://github.com/Alpsahin60/devtask-manager.git
cd devtask-manager

# Install dependencies for both frontend and backend
npm run install:all
```

### 2️⃣ Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB connection string

# Frontend environment  
cp frontend/.env.example frontend/.env.local
# Default API URL should work for local development
```

### 3️⃣ Start Development
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:backend    # Backend only (port 5000)
npm run dev:frontend   # Frontend only (port 3000)
```

### 4️⃣ Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start both frontend & backend
npm run dev:frontend     # Frontend only (Next.js dev server)
npm run dev:backend      # Backend only (Express + ts-node-dev)

# Installation
npm run install:all      # Install dependencies for both projects

# Building
npm run build           # Build both projects for production
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only

# Testing & Quality
npm run lint            # Lint both projects
npm run lint:frontend   # Lint frontend only  
npm run lint:backend    # Lint backend only
npm run format:backend  # Format backend code with Prettier
```

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier available)
3. Get connection string and add to `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devtask-manager
   ```

### Option 2: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use local connection in `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/devtask-manager
   ```

## 🔐 Security Notes

- **JWT Secrets:** Production-ready secrets are already generated
- **Environment Files:** Never commit `.env` files to version control
- **CORS:** Configured for localhost development, update for production

## 🎨 Features Implemented

- ✅ **JWT Authentication** (Login/Register/Logout)
- ✅ **Kanban Board** with Drag & Drop  
- ✅ **Dark Mode Toggle**
- ✅ **Responsive Design**
- ✅ **Error Handling** with ErrorBoundary
- ✅ **Loading States** with improved UI
- ✅ **Toast Notifications** (ready to use)
- ✅ **TypeScript** throughout
- ✅ **Secure Backend** with rate limiting

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build:frontend
# Deploy to Vercel
```

### Backend (Railway/Heroku)
```bash
npm run build:backend
# Set production environment variables
# Deploy to your preferred platform
```

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Kill processes on ports 3000 and 5000
npx kill-port 3000 5000
```

**MongoDB connection issues:**
- Check your connection string format
- Ensure network access is allowed (Atlas)
- Verify username/password

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 Architecture

- **Frontend:** Next.js 14.2 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + MongoDB
- **Authentication:** JWT (Access + Refresh tokens)
- **State Management:** React Context + Custom Hooks
- **Styling:** Tailwind CSS with Dark Mode support
- **Build Tools:** Native Next.js, tsc for backend