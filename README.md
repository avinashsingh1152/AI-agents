# Flipkart Seller Dashboard

A comprehensive seller dashboard for Flipkart with product management, order tracking, and AI-powered chatbot assistance.

## Features

- 📊 **Analytics Dashboard** - Revenue, orders, and inventory insights
- 📦 **Product Management** - Add, edit, and manage products with instant updates
- 📋 **Order Management** - Track and update order statuses
- 🤖 **AI Chatbot** - Natural language interface for business operations
- 🔐 **Secure Authentication** - Session-based login system
- 💾 **PostgreSQL Database** - Robust data storage and management

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Seller-Hack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Ensure PostgreSQL is running
   - Create a database named `flipkart_seller`
   - Update database connection in `db.js` if needed

4. **Start the server**

   **For Development (with auto-restart):**
   ```bash
   npm run dev
   ```

   **For Production:**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Login with: `seller1` / `password123`

## Development Workflow

### Using Nodemon (Recommended for Development)

The project is configured with **nodemon** for automatic server restart on file changes:

```bash
npm run dev
```

**Benefits:**
- ✅ Auto-restart on code changes
- ✅ Watch specific file types (js, json, ejs, css, html)
- ✅ Ignore unnecessary files (node_modules, logs)
- ✅ 1-second delay to prevent rapid restarts

### File Watching Configuration

Nodemon watches these directories and files:
- `server.js` - Main server file
- `db.js` - Database operations
- `views/` - EJS templates
- `public/` - Static assets

### Manual Restart (if needed)

If you need to manually restart:
```bash
# Stop the server
pkill -f "node server.js"

# Start with nodemon
npm run dev

# Or start without nodemon
npm start
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `GET /logout` - User logout

### Dashboard
- `GET /seller-dashboard` - Main dashboard (protected)
- `GET /` - Redirects to login

### Products
- `GET /api/product/:id` - Get product by ID
- `POST /api/update-product` - Add/update product

### Orders
- `POST /api/update-order-status` - Update order status

### Chatbot
- `POST /api/seller-chatbot` - AI-powered business assistant

## Chatbot Commands

The AI chatbot supports natural language commands:

### Product Management
- `"Update the price of Wireless Bluetooth Headphones to ₹6999"`
- `"Update USB-C Cable to ₹267"`
- `"Add Wireless Keyboard price 1500 stock 30 category Electronics"`

### Order Management
- `"Change order ORD003 status to shipped"`
- `"Update order ORD002 to delivered"`

### Profile Updates
- `"Update my business phone number"`
- `"Change my email address"`

## Database Schema

### Tables
- `seller_users` - User authentication
- `seller_profile` - Business profile information
- `products` - Product inventory
- `orders` - Order information
- `order_items` - Order line items

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Template Engine**: EJS
- **Frontend**: Bootstrap 5, Font Awesome
- **Development**: Nodemon
- **AI Integration**: OpenAI API (fallback to keyword-based system)

## Project Structure

```
Seller-Hack/
├── server.js          # Main server file
├── db.js             # Database operations
├── package.json      # Dependencies and scripts
├── nodemon.json      # Nodemon configuration
├── views/            # EJS templates
│   └── seller-dashboard.ejs
├── public/           # Static assets
└── README.md         # This file
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   pkill -f "node server.js"
   npm run dev
   ```

2. **Database connection error**
   - Check PostgreSQL is running
   - Verify database credentials in `db.js`

3. **Nodemon not restarting**
   - Check `nodemon.json` configuration
   - Ensure files are in watched directories

### Development Tips

- Use `npm run dev` for development with auto-restart
- Check server logs for detailed error messages
- Test API endpoints with curl or Postman
- Use browser developer tools for frontend debugging

## License

ISC License
