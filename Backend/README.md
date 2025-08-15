# IntelliRoute Africa Backend API

A comprehensive logistics and supply chain management platform backend built with Node.js, Express, and MongoDB.

## Features

### Core Functionality
- **User Management**: Multi-role authentication system (Admin, Driver, Fleet Manager, Producer, Wholesaler, Retailer)
- **Order Management**: Complete order lifecycle management with real-time tracking
- **Vehicle Management**: Fleet management with maintenance tracking and performance metrics
- **Route Optimization**: AI-powered route planning and optimization
- **Inventory Management**: Stock tracking, movement history, and automated alerts
- **Real-time Notifications**: WebSocket-based notifications and updates
- **Analytics Dashboard**: Role-based analytics and reporting

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation and sanitization
- Helmet.js security headers
- CORS configuration

### Performance Features
- Compression middleware
- Database indexing
- Connection pooling
- Caching support (Redis ready)
- File upload handling

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **File Upload**: Multer
- **Logging**: Winston
- **Validation**: Express Validator

## Project Structure

```
Backend/
├── config/
│   └── database.js          # Database connection configuration
├── controllers/             # Route controllers
│   ├── auth.js             # Authentication controller
│   ├── users.js            # User management controller
│   ├── orders.js           # Order management controller
│   ├── vehicles.js         # Vehicle management controller
│   ├── routes.js           # Route management controller
│   ├── inventory.js        # Inventory management controller
│   └── notifications.js    # Notification controller
├── middleware/             # Custom middleware
│   ├── auth.js            # Authentication middleware
│   ├── errorHandler.js    # Global error handler
│   └── upload.js          # File upload middleware
├── models/                # Database models
│   ├── User.js           # User model
│   ├── Order.js          # Order model
│   ├── Vehicle.js        # Vehicle model
│   ├── Route.js          # Route model
│   ├── Inventory.js      # Inventory model
│   └── Notification.js   # Notification model
├── routes/               # API routes
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User routes
│   ├── orders.js        # Order routes
│   ├── vehicles.js      # Vehicle routes
│   ├── routes.js        # Route routes
│   ├── inventory.js     # Inventory routes
│   ├── notifications.js # Notification routes
│   └── analytics.js     # Analytics routes
├── utils/               # Utility functions
│   ├── logger.js       # Winston logger configuration
│   └── sendEmail.js    # Email utility
├── uploads/            # File upload directory
├── logs/              # Application logs
├── .env.example       # Environment variables template
├── package.json       # Dependencies and scripts
└── server.js         # Main application entry point
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/intelliroute-africa.git
   cd intelliroute-africa/Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/intelliroute-africa
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=30d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or if using MongoDB service
   sudo service mongod start
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "driver",
  "phone": "+1234567890"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### User Management

#### Get All Users (Admin only)
```http
GET /api/users
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

### Order Management

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "delivery",
  "pickup": {
    "location": {
      "coordinates": { "lat": 40.7128, "lng": -74.0060 },
      "address": "New York, NY"
    },
    "contact": {
      "name": "John Sender",
      "phone": "+1234567890"
    },
    "timeWindow": {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T11:00:00Z"
    }
  },
  "delivery": {
    "location": {
      "coordinates": { "lat": 40.7589, "lng": -73.9851 },
      "address": "Manhattan, NY"
    },
    "contact": {
      "name": "Jane Receiver",
      "phone": "+1987654321"
    },
    "timeWindow": {
      "start": "2024-01-15T14:00:00Z",
      "end": "2024-01-15T16:00:00Z"
    }
  },
  "cargo": {
    "items": [{
      "name": "Electronics",
      "quantity": 5,
      "weight": 10.5
    }],
    "totalWeight": 52.5
  },
  "pricing": {
    "basePrice": 100,
    "totalAmount": 115
  }
}
```

#### Get Orders
```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

#### Track Order
```http
GET /api/orders/:id/tracking
# or with tracking number (public)
GET /api/orders/:id/tracking?trackingNumber=TRK123456789
```

### Vehicle Management

#### Add Vehicle
```http
POST /api/vehicles
Authorization: Bearer <token>
Content-Type: application/json

{
  "registrationNumber": "ABC-123",
  "make": "Ford",
  "model": "Transit",
  "year": 2022,
  "type": "van",
  "capacity": {
    "weight": 1000,
    "volume": 10
  },
  "fuelType": "diesel"
}
```

#### Get Available Vehicles
```http
GET /api/vehicles/available?minWeight=500&type=van
Authorization: Bearer <token>
```

### Route Management

#### Create Route
```http
POST /api/routes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Daily Delivery Route #1",
  "waypoints": [
    {
      "location": {
        "coordinates": { "lat": 40.7128, "lng": -74.0060 },
        "address": "Start Point"
      },
      "type": "pickup",
      "order": 1
    },
    {
      "location": {
        "coordinates": { "lat": 40.7589, "lng": -73.9851 },
        "address": "End Point"
      },
      "type": "delivery",
      "order": 2
    }
  ],
  "scheduling": {
    "plannedStartTime": "2024-01-15T08:00:00Z",
    "plannedEndTime": "2024-01-15T18:00:00Z"
  }
}
```

#### Optimize Route
```http
POST /api/routes/:id/optimize
Authorization: Bearer <token>
```

### Inventory Management

#### Add Inventory Item
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Product A",
  "sku": "PROD-A-001",
  "category": "electronics",
  "stock": {
    "current": 100,
    "minimum": 10,
    "reorderPoint": 20
  },
  "unit": {
    "base": "piece"
  },
  "pricing": {
    "cost": 50,
    "price": 75,
    "currency": "USD"
  },
  "warehouse": {
    "location": {
      "name": "Main Warehouse",
      "address": "123 Storage St"
    }
  }
}
```

#### Get Low Stock Items
```http
GET /api/inventory/low-stock
Authorization: Bearer <token>
```

#### Add Stock Movement
```http
POST /api/inventory/:id/movements
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "in",
  "quantity": 50,
  "reason": "New stock arrival",
  "reference": "PO-2024-001"
}
```

## User Roles and Permissions

### Admin
- Full system access
- User management
- System configuration
- All CRUD operations

### Fleet Manager
- Manage assigned drivers
- Vehicle fleet management
- Route planning and optimization
- Order assignment

### Driver
- View assigned orders and routes
- Update order status
- Update location
- View vehicle information

### Producer/Wholesaler/Retailer
- Manage inventory
- Create and track orders
- View analytics
- Manage business profile

## Real-time Features

The application uses Socket.io for real-time communication:

### Client Connection
```javascript
const socket = io('http://localhost:5000');

// Join user's personal room
socket.emit('join-user-room', userId);

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Listen for order updates
socket.on('order-status-update', (data) => {
  console.log('Order update:', data);
});
```

### Server Events
- `join-user-room`: Join personal notification room
- `join-tracking`: Join order tracking room
- `location-update`: Real-time location updates
- `order-status-update`: Order status changes
- `notification`: New notifications

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Logging

The application uses Winston for structured logging:

- **Development**: Console output with colors
- **Production**: File-based logging with rotation
- **Log Levels**: error, warn, info, http, debug

Log files are stored in the `logs/` directory:
- `error.log` - Error messages only
- `combined.log` - All log messages

## Security Considerations

### Authentication
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Email verification for new accounts

### Rate Limiting
- API-wide rate limiting (100 requests/15min)
- Authentication endpoint limiting (10 requests/15min)

### Data Validation
- Input validation using express-validator
- MongoDB injection prevention
- XSS protection with Helmet.js

### CORS
- Configurable CORS origins
- Credentials support for authenticated requests

## Performance Optimization

### Database
- Proper indexing on frequently queried fields
- Connection pooling with Mongoose
- Aggregation pipelines for complex queries

### Caching
- Redis support for session storage
- Query result caching (implementation ready)

### File Handling
- Multer for efficient file uploads
- File size limits and type validation
- Static file serving optimization

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build (if applicable)
npm run build

# Start production server
npm start

# Using PM2
pm2 start ecosystem.config.js
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@intelliroute-africa.com or create an issue in the GitHub repository.
