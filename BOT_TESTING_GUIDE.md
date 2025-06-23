# 🤖 AI Bot Testing Guide - Code & Cartel

## 🎯 **Complete List of Test Statements for Stage Demo**

### **1. Basic Greetings & Help**
```
"Hello"
"Hi"
"Help"
"What can you do?"
"Show me what you can do"
"Tell me about your features"
```

### **2. Business Analytics & Insights**
```
"What's my business summary?"
"Show me my business analytics"
"What's my revenue today?"
"How are my sales performing?"
"Give me a business overview"
"Show me my performance metrics"
"What's my current GMV?"
"Tell me about my business health"
```

### **3. Product Management**
```
"Show me all products"
"List all my products"
"What products do I have?"
"Show me product details"
"Display my inventory"
"Show me my catalog"
"List all items"
"Show me my product list"
```

### **4. Product History & Details**
```
"Show me Wireless Headphones history"
"Tell me about Wireless Headphones"
"Show me Smartphone history"
"Give me details about Smartphone"
"Show me Laptop history"
"What's the history of Laptop?"
"Show me Smartwatch history"
"Tell me about Smartwatch sales"
"Show me Tablet history"
"What's the story with Tablet?"
```

### **5. Inventory Management**
```
"Any low stock alerts?"
"Show me low stock items"
"What's running low?"
"Check my inventory levels"
"Show me stock status"
"Any products out of stock?"
"What needs restocking?"
"Show me inventory alerts"
"Check stock levels"
"Any inventory issues?"
```

### **6. Bulk Inventory Updates**
```
"Update all Electronics stock to 100"
"Set all Electronics to 50 units"
"Update Electronics category to 75"
"Set Electronics stock to 200"
"Update all Electronics to 150"
"Set Electronics inventory to 80"
"Update Electronics to 120 units"
"Set all Electronics to 90"
```

### **7. CSV Processing & File Upload**
```
"I have a CSV file to upload"
"Upload my orders CSV"
"Process my CSV file"
"I want to upload orders"
"Handle my CSV data"
"Upload order file"
"Process CSV orders"
"Upload my data file"
```

### **8. Business Predictions & Forecasting**
```
"Show me business predictions"
"What's my business forecast?"
"Predict my sales"
"Show me future predictions"
"Give me a forecast"
"What can I expect next month?"
"Show me revenue predictions"
"Predict my business growth"
"Show me sales forecast"
"What's my business outlook?"
```

### **9. Payment Analytics**
```
"Show me payment status"
"What's my payment summary?"
"Check my payments"
"Show me payment analytics"
"Payment overview"
"Payment status report"
"Show me payment details"
"Payment summary please"
```

### **10. Order Management**
```
"Show me my orders"
"List all orders"
"Order status"
"Show me order history"
"Check my orders"
"Order summary"
"Show me recent orders"
"Order analytics"
```

### **11. Change Management & Updates**
```
"What changed?"
"What's new?"
"Show me recent changes"
"What updates are there?"
"Tell me about changes"
"What's different?"
"Show me new features"
"What's been updated?"
"Recent changes please"
"New features?"
```

### **12. Business Impact & Benefits**
```
"How do these changes help my business?"
"What are the benefits?"
"How does this help me?"
"Business benefits"
"Show me the advantages"
"What's in it for me?"
"How does this improve my business?"
"Benefits of these features"
```

### **13. Specific Product Queries**
```
"Show me Wireless Headphones sales"
"Smartphone performance"
"Laptop analytics"
"Smartwatch data"
"Tablet sales"
"Headphones performance"
"Phone sales data"
"Computer analytics"
"Watch performance"
"Pad sales data"
```

### **14. Category-Based Queries**
```
"Show me Electronics performance"
"Electronics sales"
"Electronics analytics"
"Electronics data"
"Electronics summary"
"Electronics overview"
"Electronics report"
"Electronics insights"
```

### **15. Error Handling & Edge Cases**
```
"Update stock to -5"
"Set inventory to abc"
"Invalid command"
"Wrong format"
"Error test"
"Break the system"
"Invalid input"
"Wrong data"
```

### **16. Complex Multi-Part Queries**
```
"Show me Wireless Headphones history and update its stock to 100"
"Give me business summary and low stock alerts"
"Show me Electronics performance and predict next month"
"Check my payments and show me business forecast"
"List all products and show me trending items"
"Show me order history and payment status"
"Give me inventory overview and business predictions"
"Show me sales data and update Electronics to 150"
```

### **17. Natural Language Variations**
```
"Can you show me my business summary?"
"I'd like to see my business analytics"
"Please display my products"
"Could you tell me about my sales?"
"I want to know my inventory status"
"Can you check my stock levels?"
"Please show me my orders"
"I need to see my payment status"
"Could you predict my sales?"
"Please update my inventory"
```

### **18. Performance Testing**
```
"Show me everything"
"Give me all data"
"Display complete information"
"Show me full report"
"Complete business overview"
"All analytics please"
"Full dashboard"
"Complete summary"
"Everything about my business"
"All my data"
```

### **19. Feature Discovery**
```
"What features do you have?"
"Show me all capabilities"
"What can this system do?"
"List all functions"
"Show me available features"
"What tools are available?"
"Display all options"
"Show me system capabilities"
"What's possible here?"
"All available features"
```

### **20. Stage Demo Flow Suggestions**

#### **Quick Demo (2-3 minutes):**
1. "Hello" → Basic greeting
2. "What's my business summary?" → Analytics
3. "Show me low stock alerts" → Inventory
4. "Update all Electronics stock to 100" → Bulk update
5. "What changed?" → Change management
6. "Show me business predictions" → AI forecasting

#### **Comprehensive Demo (5-7 minutes):**
1. "Hello" → Introduction
2. "What can you do?" → Feature overview
3. "Show me my business summary" → Analytics
4. "Show me Wireless Headphones history" → Product details
5. "Any low stock alerts?" → Inventory management
6. "Update all Electronics stock to 100" → Bulk operations
7. "I have a CSV file to upload" → File processing
8. "Show me business predictions" → AI forecasting
9. "What changed?" → Change management
10. "How do these changes help my business?" → Business impact

#### **Advanced Demo (10+ minutes):**
1. "Hello" → Introduction
2. "What can you do?" → Feature overview
3. "Show me my business summary" → Analytics
4. "Show me all products" → Product management
5. "Show me Wireless Headphones history" → Detailed product info
6. "Any low stock alerts?" → Inventory alerts
7. "Update all Electronics stock to 100" → Bulk inventory update
8. "I have a CSV file to upload" → File processing demo
9. "Show me business predictions" → AI forecasting
10. "Show me payment status" → Payment analytics
11. "What changed?" → Change management
12. "How do these changes help my business?" → Business impact
13. "Show me order history" → Order management
14. "Give me a complete business overview" → Full system demo

## 🎭 **Stage Demo Tips**

### **Before Demo:**
- Ensure server is running (`node server.js`)
- Have demo-orders.csv ready for file upload
- Test a few commands beforehand
- Prepare backup responses for potential errors

### **During Demo:**
- Start with simple commands to build confidence
- Show progression from basic to advanced features
- Highlight AI capabilities and natural language processing
- Demonstrate real-time responses
- Show business value and time savings

### **Key Features to Highlight:**
- 🤖 **AI-Powered**: Natural language understanding
- 📊 **Real-Time**: Live data and analytics
- 📦 **Smart Inventory**: Automated stock management
- 💳 **Payment Intelligence**: Advanced payment insights
- 🧠 **Predictive Analytics**: Business forecasting
- 📁 **CSV Processing**: Bulk operations
- 🔄 **Change Management**: Personalized updates

### **Expected Responses:**
- Business summaries with metrics
- Product histories with detailed data
- Inventory alerts and stock levels
- Bulk update confirmations
- AI predictions and forecasts
- Change summaries and benefits
- Payment analytics and status

## 🚀 **Ready for Stage Success!**

This comprehensive guide covers all the test statements you need to demonstrate the AI bot's full capabilities. Practice these commands and you'll be ready to showcase the power of the Code & Cartel Flipkart Seller Dashboard! 