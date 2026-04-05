# MongoDB Setup Guide

## Problem: MongoDB Connection Failed ❌
```
MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
```

## Solution: Choose Your Database Option

---

## 🌐 **Option 1: MongoDB Atlas (Recommended - 5 Minutes Setup)**

### Step 1: Create Atlas Account
1. Go to https://cloud.mongodb.com
2. Sign up for free (no credit card required)
3. Create a new project

### Step 2: Create Database
1. Click "Build a Database" 
2. Choose **FREE** tier (M0 Sandbox)
3. Select region closest to you
4. Create cluster (takes 3-5 minutes)

### Step 3: Setup Access
1. **Database Access**: Create user with read/write permissions
2. **Network Access**: Add your IP address (or 0.0.0.0/0 for development)

### Step 4: Get Connection String
1. Click "Connect" → "Connect your application"
2. Copy connection string
3. Replace `<username>` and `<password>` with your database user credentials

### Step 5: Update .env
```bash
# In backend/.env, replace the MONGODB_URI line:
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/devtask-manager
```

---

## 💻 **Option 2: Local MongoDB Installation**

### Windows (using winget):
```bash
winget install MongoDB.Server
# Start MongoDB service
net start MongoDB
```

### Windows (Manual):
1. Download from https://www.mongodb.com/try/download/community
2. Install with default settings
3. Start MongoDB service via Services app

### Update .env:
```bash
# In backend/.env, use local connection:
MONGODB_URI=mongodb://localhost:27017/devtask-manager
```

---

## 🚀 **Quick Test After Setup**

```bash
# Restart backend after fixing MongoDB
cd backend
npm run dev

# Should see:
# ✅ MongoDB connected successfully
# 🚀 Server running on port 5000
```

---

## 🎯 **Your Application URLs**
- **Frontend**: http://localhost:3002 (port auto-adjusted)
- **Backend**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## ✅ **Status After Fixes**
- ✅ JSX Syntax Error → **FIXED** (useTheme.tsx)
- ✅ Frontend Running → **Port 3002**
- ⚠️ MongoDB Connection → **Choose Option 1 or 2 above**
- ⚠️ Backend Waiting → **Will start after MongoDB fix**

**Recommendation: Use MongoDB Atlas (Option 1) for quickest setup!**