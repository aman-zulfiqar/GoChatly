# GoChat - Complete Real-time Chat Application

A full-stack real-time chat application built with Go backend and Next.js frontend.

## 🚀 Features

### Backend (Go)
- **Real-time WebSocket messaging**
- **MongoDB for message persistence**
- **Redis for job queuing**
- **Email notifications via MailHog**
- **Room-based chat system**
- **User presence management**
- **CORS-enabled API**
- **Docker containerization**

### Frontend (Next.js)
- **Modern React with TypeScript**
- **Real-time messaging interface**
- **Connection testing & diagnostics**
- **Responsive design with Tailwind CSS**
- **shadcn/ui components**
- **User presence indicators**

## 📁 Project Structure

\`\`\`
gochat-server/
├── cmd/
│   └── main.go                 # Application entry point
├── internal/
│   ├── config/                 # Configuration management
│   ├── database/               # MongoDB connection
│   ├── handlers/               # HTTP & WebSocket handlers
│   ├── hub/                    # WebSocket hub & client management
│   ├── models/                 # Data models
│   ├── queue/                  # Job queue management
│   └── services/               # Business logic services
├── frontend/                   # Next.js frontend application
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   └── lib/                    # Utility functions
├── docker-compose.yaml         # Docker services configuration
├── dockerfile                  # Go application container
├── go.mod                      # Go dependencies
└── README.md                   # This file
\`\`\`

## 🛠️ Setup & Installation

### Prerequisites
- **Go 1.23+**
- **Node.js 18+**
- **Docker & Docker Compose**

### 1. Clone the Repository
\`\`\`bash
git clone <your-repo-url>
cd gochat-server
\`\`\`

### 2. Start Backend Services
\`\`\`bash
# Start all services (MongoDB, Redis, MailHog, Go server)
docker-compose up -d

# Check services are running
docker-compose ps
\`\`\`

### 3. Setup Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Connection Test**: http://localhost:3000/test

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

\`\`\`env
# Server Configuration
PORT=8080

# Database Configuration
MONGO_URI=mongodb://admin:password123@localhost:27017/chatdb?authSource=admin
DATABASE_NAME=chatdb

# Redis Configuration
REDIS_ADDR=localhost:6379

# SMTP Configuration (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
\`\`\`

## 🚀 Usage

### 1. Test Connection
1. Visit http://localhost:3000/test
2. Click "Run All Tests" to verify backend connectivity
3. Ensure all tests pass before proceeding

### 2. Start Chatting
1. Go to http://localhost:3000
2. Enter your username, user ID, and room ID
3. Click "Join Room" to start chatting
4. Open multiple browser tabs to test real-time messaging

### 3. Monitor Services
- **MailHog UI**: http://localhost:8025 (Email testing)
- **Mongo Express**: http://localhost:8082 (Database admin)
- **Redis Commander**: http://localhost:8081 (Redis admin)
- **Asynq Monitor**: http://localhost:8083 (Job queue monitoring)

## 🏗️ Architecture

### Backend Architecture
\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   REST API      │    │   Job Queue     │
│   Handlers      │    │   Handlers      │    │   Workers       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Hub (Message Broker)               │
         └─────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │     Redis       │    │    SMTP         │
│   (Messages)    │    │   (Queues)      │    │  (MailHog)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
\`\`\`

### Frontend Architecture
\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
├─────────────────────────────────────────────────────────────┤
│  HomePage  │  ChatRoom  │  ConnectionTest  │  UI Components │
├─────────────────────────────────────────────────────────────┤
│              WebSocket Client & REST API Client             │
└─────────────────────────────────────────────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   Go Backend API    │
                    │   (localhost:8080)  │
                    └─────────────────────┘
\`\`\`

## 🔍 API Endpoints

### WebSocket
- `ws://localhost:8080/ws/{roomID}/{userID}?username={username}`

### REST API
- `GET /health` - Health check
- `GET /test` - Frontend connectivity test
- `GET /rooms/{roomID}/messages?limit={limit}` - Get message history
- `GET /rooms/{roomID}/users` - Get room users
- `POST /queue-email` - Queue email notification

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS middleware is properly configured in `cmd/main.go`
   - Check that frontend URL is in allowed origins

2. **WebSocket Connection Failed**
   - Verify Go server is running on port 8080
   - Check WebSocket upgrader configuration
   - Ensure no firewall blocking connections

3. **Database Connection Issues**
   - Verify MongoDB is running: `docker-compose ps`
   - Check MongoDB credentials in environment variables
   - Ensure database is accessible on port 27017

4. **Frontend Build Errors**
   - Run `npm install` in frontend directory
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed

### Debug Commands
\`\`\`bash
# Check Docker services
docker-compose ps

# View Go server logs
docker-compose logs gochat-server

# Check MongoDB connection
docker-compose exec mongodb mongosh

# Check Redis connection
docker-compose exec redis redis-cli ping

# Test backend health
curl http://localhost:8080/health
\`\`\`

## 🚀 Deployment

### Production Deployment
1. Update environment variables for production
2. Build frontend: `cd frontend && npm run build`
3. Build Go binary: `go build -o main cmd/main.go`
4. Deploy using Docker or your preferred platform

### Docker Production Build
\`\`\`bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly using the connection test
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Echo Framework** for the Go web framework
- **Gorilla WebSocket** for WebSocket implementation
- **Next.js** for the React framework
- **shadcn/ui** for the UI components
- **MongoDB** for data persistence
- **Redis** for job queuing
- **MailHog** for email testing
