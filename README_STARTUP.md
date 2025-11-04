# 🚀 SCRAPI - Web Scraping Platform

Complete web scraping platform similar to Apify with JWT authentication, 8 pre-built scrapers, and user-specific data management.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### 1. Start All Services (Recommended)

```bash
./start-app.sh
```

This single command will:
- ✅ Check system requirements
- ✅ Start MongoDB (port 27017)
- ✅ Start Backend (port 8001)
- ✅ Start Frontend (port 3000)
- ✅ Display service status

### 2. Alternative: Quick Start (Minimal)

```bash
./quick-start.sh
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8001
- **MongoDB**: mongodb://localhost:27017

---

## 🎯 Features

### Authentication & User Management
- ✅ JWT-based authentication
- ✅ User registration and login
- ✅ Password hashing with bcrypt
- ✅ API token management
- ✅ User profile and settings

### Web Scrapers (8 Pre-built)
- 🗺️ **Google Maps** - Business data extraction
- 📦 **Amazon** - Product information
- 📸 **Instagram** - Profile and posts
- 🐦 **Twitter** - Tweets and engagement
- 👥 **Facebook** - Page data
- 💼 **LinkedIn** - Profile information
- 🎵 **TikTok** - User profiles and videos
- 🌐 **Website** - Generic web scraping

### Platform Features
- 📊 Actor marketplace (Store)
- 🔐 User-specific private actors
- ⚡ Run execution and history
- 📈 Usage tracking
- 🎨 Dark/Light theme
- 📱 Responsive design

---

## 🏗️ Architecture

### Technology Stack

**Backend**
- Node.js v18+ / Express.js
- MongoDB v7.0+ / Mongoose
- JWT Authentication
- Puppeteer + Axios + Cheerio

**Frontend**
- React v19
- React Router v7
- Axios (API client)
- Tailwind CSS v3
- shadcn/ui components
- Lucide icons

**Infrastructure**
- Supervisor (process management)
- Yarn (package manager)

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React app |
| Backend | 8001 | Express API |
| MongoDB | 27017 | Database |

### Directory Structure

```
/app/
├── backend/                    # Node.js/Express backend
│   ├── actors/                # Actor registry
│   │   ├── registry.js        # Actor definitions
│   │   └── syncActors.js      # Auto-sync to DB
│   ├── middleware/            # Auth middleware
│   ├── models/                # MongoDB models
│   ├── routes/                # API routes
│   ├── scrapers/              # Scraper implementations
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Main server
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   └── services/         # API services
│   ├── .env
│   └── package.json
│
├── start-app.sh               # Main startup script ⭐
├── quick-start.sh             # Quick startup
├── install-dependencies.sh    # Dependency installer
├── health-check.sh            # Health check
└── README_STARTUP.md          # This file
```

---

## 📦 Installation

### Prerequisites

- **Node.js** v18+ (with npm)
- **Yarn** v1.22+
- **MongoDB** v7.0+

### Check Installed Versions

```bash
node --version
npm --version
yarn --version
mongod --version
```

### Install Dependencies

```bash
# Option 1: Using install script
./install-dependencies.sh

# Option 2: Manual installation
cd /app/backend && yarn install
cd /app/frontend && yarn install
```

### Setup Environment Variables

#### Backend (.env)
```bash
cat > /app/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=scrapi
PORT=8001
NODE_ENV=development
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

#### Frontend (.env)
```bash
cat > /app/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF
```

---

## 🚀 Usage

### Using Startup Scripts

| Command | Description |
|---------|-------------|
| `./start-app.sh` | Start all services |
| `./start-app.sh stop` | Stop all services |
| `./start-app.sh restart` | Restart all services |
| `./start-app.sh status` | Check service status |
| `./start-app.sh backend` | Start backend only |
| `./start-app.sh frontend` | Start frontend only |
| `./start-app.sh logs [service]` | View logs |
| `./start-app.sh help` | Show help |

### Manual Startup

#### Start MongoDB
```bash
mongod --bind_ip_all
```

#### Start Backend
```bash
cd /app/backend
yarn install
node server.js
```

#### Start Frontend
```bash
cd /app/frontend
yarn install
yarn start
```

### Using Supervisor (Production)

```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart all

# View logs
sudo supervisorctl tail -f backend stderr
sudo supervisorctl tail -f frontend stderr
```

---

## 📝 Available Scripts

### Main Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-app.sh` | Complete startup & management | `./start-app.sh [command]` |
| `quick-start.sh` | Fast minimal startup | `./quick-start.sh` |
| `install-dependencies.sh` | Install all dependencies | `./install-dependencies.sh` |
| `health-check.sh` | Check service health | `./health-check.sh` |

### Script Examples

```bash
# Start everything
./start-app.sh

# Check if services are healthy
./health-check.sh

# View backend logs
./start-app.sh logs backend

# Restart all services
./start-app.sh restart

# Stop all services
./start-app.sh stop

# Get help
./start-app.sh help
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8001/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/password` | Change password |
| GET | `/auth/api-tokens` | List API tokens |
| POST | `/auth/api-tokens` | Create API token |
| DELETE | `/auth/api-tokens/:id` | Delete API token |

### Actor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/actors` | List public actors |
| GET | `/actors?myActors=true` | List user's actors |
| GET | `/actors/:id` | Get actor details |
| POST | `/actors` | Create private actor |

### Run Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/runs` | List user's runs |
| GET | `/runs/:id` | Get run details |
| POST | `/runs` | Create and execute run |

### Example API Calls

#### Register User
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### List Actors
```bash
curl -X GET http://localhost:8001/api/actors \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Run
```bash
curl -X POST http://localhost:8001/api/runs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actorId": "google-maps",
    "input": {
      "query": "restaurants",
      "location": "New York"
    }
  }'
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using a port
lsof -i :8001  # Backend
lsof -i :3000  # Frontend
lsof -i :27017 # MongoDB

# Kill process on port
kill -9 $(lsof -t -i :8001)
```

#### 2. MongoDB Connection Failed

```bash
# Check if MongoDB is running
lsof -i :27017

# Restart MongoDB
pkill mongod
mongod --bind_ip_all &

# Check logs
tail -f /var/log/mongodb.err.log
```

#### 3. Backend Not Starting

```bash
# Check backend logs
tail -f /var/log/backend.err.log

# Restart backend
cd /app/backend
pkill -f "node server.js"
node server.js
```

#### 4. Frontend Build Errors

```bash
# Reinstall dependencies
cd /app/frontend
rm -rf node_modules
yarn install

# Restart frontend
pkill -f "craco start"
yarn start
```

#### 5. Missing Dependencies

```bash
# Backend
cd /app/backend
yarn install

# Frontend
cd /app/frontend
yarn install

# Or use the install script
./install-dependencies.sh
```

#### 6. Puppeteer/Chromium Issues

```bash
# Install Chromium
cd /app/backend
node node_modules/puppeteer/install.js
```

### Viewing Logs

```bash
# Using startup script
./start-app.sh logs all
./start-app.sh logs backend
./start-app.sh logs frontend

# Direct log files
tail -f /var/log/backend.err.log
tail -f /var/log/frontend.err.log
tail -f /var/log/mongodb.err.log

# Supervisor logs
sudo supervisorctl tail -f backend stderr
sudo supervisorctl tail -f frontend stderr
```

### Health Check

```bash
# Run health check
./health-check.sh

# Manual checks
curl http://localhost:8001/api/
curl http://localhost:3000
mongosh --eval "db.adminCommand('ping')"
```

---

## 📊 Service Management

### Check Service Status

```bash
./start-app.sh status
```

### Start Services

```bash
# All services
./start-app.sh start

# Backend only
./start-app.sh backend

# Frontend only
./start-app.sh frontend
```

### Stop Services

```bash
./start-app.sh stop
```

### Restart Services

```bash
./start-app.sh restart
```

---

## 🔒 Security Notes

- JWT tokens are stored in localStorage
- Passwords are hashed using bcrypt
- API tokens are masked when displayed
- Protected routes require authentication
- User data is isolated per user

---

## 📈 Performance Tips

1. **Development**: Use `yarn start` for hot reload
2. **Production**: Build frontend with `yarn build`
3. **MongoDB**: Index frequently queried fields
4. **Logs**: Clear old logs regularly
5. **Dependencies**: Keep packages updated

---

## 🤝 Contributing

This is a complete MVP platform. To extend:

1. Add new scrapers in `/app/backend/scrapers/`
2. Register scrapers in `/app/backend/actors/registry.js`
3. Create UI pages in `/app/frontend/src/pages/`
4. Add routes in `/app/backend/routes/`

---

## 📄 License

Part of the SCRAPI platform.

---

## 🆘 Support

- Check logs: `./start-app.sh logs all`
- Run health check: `./health-check.sh`
- Check status: `./start-app.sh status`
- Review `/app/test_result.md` for testing data

---

## 🎉 Quick Reference

```bash
# Install everything
./install-dependencies.sh

# Start everything
./start-app.sh

# Check health
./health-check.sh

# View logs
./start-app.sh logs all

# Stop everything
./start-app.sh stop
```

**That's it! Your SCRAPI platform is ready to use! 🚀**
