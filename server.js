const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;
const axios = require('axios');
const OPENAI_API_KEY = "eadd36ff773c4c659b2372403eba44f8"

// Sample seller data
let sellerData = {
  profile: {
    businessName: "TechGadgets Store",
    ownerName: "Pankaj Tripathi",
    email: "pakaj.tripathi@techgadgets.com",
    phone: "+91-9155530123",
    address: "123 Commerce St, Delhi, India - 123456",
    gstNumber: "GST123456789",
    rating: 4.5,
          totalSales: 2500000
  },
  products: [
    {
      id: 1,
      name: "Wireless Bluetooth Headphones",
      price: 7999,
      stock: 50,  
      category: "Electronics",
      description: "High-quality wireless headphones with noise cancellation",
      status: "active"
    },
    {
      id: 2,
      name: "Smart Phone Case",
      price: 1999,
      stock: 100,
      category: "Accessories", 
      description: "Protective case for smartphones with wireless charging support",
      status: "active"
    },
    {
      id: 3,
      name: "USB-C Cable",
      price: 999,
      stock: 200,
      category: "Accessories",
      description: "Fast charging USB-C cable 6ft length", 
      status: "active"
    },
    {
      id: 4,
      name: "Laptop Stand",
      price: 3699,
      stock: 25,
      category: "Office Supplies",
      description: "Adjustable aluminum laptop stand for better ergonomics",
      status: "active"
    }
  ],
  orders: [
          {
        id: "ORD001",
        customerName: "Anuradha",
        products: ["Wireless Bluetooth Headphones"],
        total: 7999,
        status: "delivered",
        date: "2024-01-15"
      },
      {
        id: "ORD002",
        customerName: "Bhavesh",
        products: ["Smart Phone Case", "USB-C Cable"],
        total: 2998,
        status: "shipped",
        date: "2024-01-18"
      },
      {
        id: "ORD003",
        customerName: "Chirag",
        products: ["Laptop Stand"],
        total: 3699,
        status: "processing",
        date: "2024-01-20"
      }
  ],
  analytics: {
    totalRevenue: 125000,
    totalOrders: 85,
    pendingOrders: 12,
    lowStockItems: 3,
    monthlyGrowth: 15.5
  }
};

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static('public'));

const bodyParser = require("body-parser");
const cors = require("cors");

app.use(bodyParser.json());
app.use(cors());

// Serve views (EJS files)
app.set('view engine', 'ejs');

// Seller Dashboard Route
app.get('/seller-dashboard', (req, res) => {
  res.render('seller-dashboard', { sellerData }); // Renders seller-dashboard.ejs
});

// API endpoint to get seller data
app.get('/api/seller-data', (req, res) => {
  res.json(sellerData);
});

// API endpoint to update seller profile
app.post('/api/update-seller-profile', (req, res) => {
  const updates = req.body;
  sellerData.profile = { ...sellerData.profile, ...updates };
  res.json({ success: true, message: 'Profile updated successfully', profile: sellerData.profile });
});

// API endpoint to add/update product
app.post('/api/update-product', (req, res) => {
  const { id, ...productData } = req.body;
  
  if (id) {
    // Update existing product
    const productIndex = sellerData.products.findIndex(p => p.id === parseInt(id));
    if (productIndex !== -1) {
      sellerData.products[productIndex] = { ...sellerData.products[productIndex], ...productData };
      res.json({ success: true, message: 'Product updated successfully', product: sellerData.products[productIndex] });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } else {
    // Add new product
    const newProduct = {
      id: Math.max(...sellerData.products.map(p => p.id)) + 1,
      ...productData,
      status: 'active'
    };
    sellerData.products.push(newProduct);
    res.json({ success: true, message: 'Product added successfully', product: newProduct });
  }
});

// API endpoint to update order status
app.post('/api/update-order-status', (req, res) => {
  const { orderId, status } = req.body;
  const order = sellerData.orders.find(o => o.id === orderId);
  
  if (order) {
    order.status = status;
    res.json({ success: true, message: 'Order status updated successfully', order });
  } else {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

// Enhanced chatbot endpoint for seller data modifications
app.post('/api/seller-chatbot', async (req, res) => {
  const { message } = req.body;
  
  const systemPrompt = `You are a helpful Flipkart seller assistant. You help sellers manage their products, orders, and business profile on the Flipkart e-commerce platform. 
  
  Current seller data:
  - Business: ${sellerData.profile.businessName}
  - Products: ${sellerData.products.map(p => `${p.name} (ID: ${p.id}, Stock: ${p.stock}, Price: ₹${p.price})`).join(', ')}
  - Orders: ${sellerData.orders.map(o => `${o.id} - ${o.customerName} (Status: ${o.status})`).join(', ')}
  
  You can help with:
  1. Updating product prices, stock, or descriptions
  2. Changing order statuses  
  3. Updating business profile information
  4. Adding new products
  5. Providing analytics insights
  
  When the user asks to make changes, provide a helpful explanation followed by the specific JSON action format.
  
  JSON Action Examples:
     - For updating product: {"action": "updateProduct", "productId": 1, "updates": {"price": 6999}}
  - For updating order status: {"action": "updateOrderStatus", "orderId": "ORD003", "status": "shipped"}
  - For updating profile: {"action": "updateProfile", "updates": {"phone": "+1-555-9999"}}
  - For adding product: {"action": "addProduct", "productData": {"name": "New Product", "price": 50, "stock": 100, "category": "Electronics", "description": "Description"}}
  
  Always end your response with the appropriate JSON action if changes are requested.`;

  const chatPrompt = `User request: ${message}
  
  Please provide a helpful response and if the user is requesting changes to seller data, include specific instructions in JSON format at the end of your response.`;

  const data = {
    "messages": [
      {
        "role": "system",
        "content": systemPrompt
      },
      {
        "role": "user",  
        "content": [
          {
            "type": "text",
            "text": chatPrompt
          }
        ]
      }
    ],
    "max_tokens": 1000,
    "temperature": 0.7,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "top_p": 0.95
  };

  try {
    const response = await axios.post('http://10.83.64.112/gpt-4o/chat/completions?api-version=2023-07-01-preview', data, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': OPENAI_API_KEY
      }
    });

    const chatResponse = response.data.choices[0].message.content.trim();
    console.log('Chatbot response:', chatResponse);
    
    // Try to parse any JSON instructions from the response
    let actionData = null;
    try {
      // Look for JSON at the end of the response
      const jsonMatch = chatResponse.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        actionData = JSON.parse(jsonMatch[0]);
        console.log('Parsed action data:', actionData);
      } else {
        // Also try to find JSON anywhere in the response
        const anyJsonMatch = chatResponse.match(/\{[\s\S]*\}/);
        if (anyJsonMatch) {
          actionData = JSON.parse(anyJsonMatch[0]);
          console.log('Found action data:', actionData);
        }
      }
    } catch (jsonError) {
      console.log('JSON parsing error:', jsonError.message);
      console.log('Response text:', chatResponse);
    }

    // Execute actions if provided
    let updateResult = null;
    if (actionData) {
      if (actionData.action === 'updateProduct') {
        const productIndex = sellerData.products.findIndex(p => p.id === actionData.productId);
        if (productIndex !== -1) {
          sellerData.products[productIndex] = { ...sellerData.products[productIndex], ...actionData.updates };
          updateResult = { success: true, message: 'Product updated successfully' };
        }
      } else if (actionData.action === 'updateProfile') {
        sellerData.profile = { ...sellerData.profile, ...actionData.updates };
        updateResult = { success: true, message: 'Profile updated successfully' };
      } else if (actionData.action === 'updateOrderStatus') {
        console.log('Attempting to update order:', actionData.orderId, 'to status:', actionData.status);
        const order = sellerData.orders.find(o => o.id === actionData.orderId);
        if (order) {
          console.log('Found order:', order);
          order.status = actionData.status;
          console.log('Updated order:', order);
          updateResult = { success: true, message: `Order ${actionData.orderId} status updated to ${actionData.status}` };
        } else {
          console.log('Order not found:', actionData.orderId);
          updateResult = { success: false, message: `Order ${actionData.orderId} not found` };
        }
      } else if (actionData.action === 'addProduct') {
        const newProduct = {
          id: Math.max(...sellerData.products.map(p => p.id)) + 1,
          ...actionData.productData,
          status: 'active'
        };
        sellerData.products.push(newProduct);
        updateResult = { success: true, message: 'Product added successfully' };
      }
    }

    res.json({ 
      response: chatResponse, 
      actionExecuted: updateResult !== null,
      updateResult: updateResult,
      updatedData: actionData ? sellerData : null 
    });
    
  } catch (error) {
    console.error("Error with seller chatbot:", error.response ? error.response.data : error.message);
    res.status(500).json({error: 'Error processing chatbot request'});
  }
});

// Main application route - redirect to seller dashboard
app.get('/', (req, res) => {
  res.redirect('/seller-dashboard');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
