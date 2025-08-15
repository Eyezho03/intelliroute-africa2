# IntelliRoute Africa Backend - Quick Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - MONGODB_URI
# - JWT_SECRET
```

### 3. Start MongoDB
```bash
# Local MongoDB
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Verify Setup
```bash
# Run health check
npm run health

# Or manually check
curl http://localhost:5000/health
```

## 🔧 Configuration

### Required Environment Variables
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/intelliroute-africa
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:3000
```

### Optional Environment Variables
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Endpoints

### Health Check
```bash
GET http://localhost:5000/health
```

### Authentication
```bash
# Register
POST http://localhost:5000/api/auth/register
# Login
POST http://localhost:5000/api/auth/login
# Get current user
GET http://localhost:5000/api/auth/me
```

### Main Resources
```bash
# Users
GET http://localhost:5000/api/users

# Orders
GET http://localhost:5000/api/orders
POST http://localhost:5000/api/orders

# Vehicles
GET http://localhost:5000/api/vehicles
POST http://localhost:5000/api/vehicles

# Routes
GET http://localhost:5000/api/routes
POST http://localhost:5000/api/routes

# Inventory
GET http://localhost:5000/api/inventory
POST http://localhost:5000/api/inventory

# Notifications
GET http://localhost:5000/api/notifications

# Analytics
GET http://localhost:5000/api/analytics/dashboard
```

## 🧪 Testing

### Create Test User (Admin)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@intelliroute.com",
    "password": "admin123",
    "role": "admin",
    "phone": "+1234567890"
  }'
```

### Login and Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@intelliroute.com",
    "password": "admin123"
  }'
```

### Use Token for Authenticated Requests
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔍 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
mongod
# or
sudo service mongod start
```

#### 2. Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=5001
```

#### 3. JWT Secret Error
```bash
# Make sure JWT_SECRET is set in .env
echo "JWT_SECRET=your-super-secret-key-here" >> .env
```

#### 4. File Upload Issues
```bash
# Check if uploads directory exists and has permissions
ls -la uploads/

# Create if missing
mkdir -p uploads/avatars uploads/vehicles uploads/documents uploads/misc
```

#### 5. Email Service Issues
```bash
# For development, emails use Ethereal (test emails)
# Check console logs for test email URLs
# For production, configure SMTP settings
```

## 📊 Monitoring

### Logs
```bash
# View logs
tail -f logs/combined.log
tail -f logs/error.log

# Or check console output in development mode
```

### Health Check
```bash
# Automated health check
npm run health

# Manual checks
curl http://localhost:5000/health
curl http://localhost:5000/api
```

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Start with PM2
```bash
npm install -g pm2
pm2 start server.js --name "intelliroute-api"
pm2 startup
pm2 save
```

### Docker Deployment
```bash
# Build image
docker build -t intelliroute-africa-api .

# Run container
docker run -d \
  --name intelliroute-api \
  -p 5000:5000 \
  --env-file .env \
  intelliroute-africa-api
```

## 📚 Next Steps

1. **Frontend Integration**: Connect your frontend application
2. **Database Seeding**: Add initial data using seed scripts
3. **Testing**: Implement comprehensive test suite
4. **API Documentation**: Set up Swagger/OpenAPI documentation
5. **Monitoring**: Add application monitoring (e.g., New Relic, DataDog)
6. **CI/CD**: Set up automated deployment pipeline

## 💡 Tips

- Use Postman or Insomnia for API testing
- Enable MongoDB logs for debugging database issues
- Use Winston logger for structured logging
- Implement rate limiting for production environments
- Set up SSL/TLS certificates for HTTPS in production
- Regular database backups for production data

## 🆘 Support

If you encounter issues:

1. Check the console logs
2. Verify environment variables
3. Ensure MongoDB is running
4. Check network connectivity
5. Review the comprehensive README.md for detailed documentation

For additional help, please refer to the main README.md file or create an issue in the repository.
