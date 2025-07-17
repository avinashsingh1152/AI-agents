require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const FlipkartSellerAgentEnhanced = require('./flipkart-ai-agent-enhanced');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'flipkart-seller-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Helper function to get seller data
async function getSellerData(userId) {
    try {
        const [profile, products, orders, analytics, paymentAnalytics] = await Promise.all([
            db.getSellerProfile(userId),
            db.getProducts(userId),
            db.getOrders(userId),
            db.getAnalytics(userId),
            db.getPaymentAnalytics(userId, 30)
        ]);

        return {
            profile: {
                businessName: profile.business_name,
                ownerName: profile.owner_name,
                email: profile.email,
                phone: profile.phone,
                address: profile.address,
                gstNumber: profile.gst_number,
                rating: parseFloat(profile.rating || 0),
                totalSales: parseFloat(profile.total_sales || 0)
            },
            products,
            orders,
            analytics,
            paymentAnalytics
        };
    } catch (error) {
        console.error('Error getting seller data:', error);
        throw error;
    }
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'N/A';
    }
}

// Set up EJS
app.locals.formatDate = formatDate;

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/seller-dashboard');
    } else {
        res.render('login');
    }
});

// Login handler
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await db.authenticateUser(username, password);
        
        if (result.success) {
            req.session.userId = result.user.id;
            req.session.username = result.user.username;
            console.log('Login successful, redirecting to dashboard');
            res.redirect('/seller-dashboard');
        } else {
            res.render('login', { error: result.message });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login' });
    }
});

// Onboarding route
app.post('/onboarding', async (req, res) => {
    const { email, businessName, ownerName } = req.body;
    
    try {
        // Generate a unique username from email
        const username = email.split('@')[0] + '_' + Date.now().toString().slice(-4);
        
        // Create demo account
        const result = await db.createDemoAccount(username, email, businessName, ownerName);
        
        if (result.success) {
            // Auto-login the user
            req.session.userId = result.userId;
            req.session.username = username;
            console.log('Onboarding successful, redirecting to dashboard');
            res.redirect('/seller-dashboard');
    } else {
            res.render('login', { error: result.message });
        }
    } catch (error) {
        console.error('Onboarding error:', error);
        res.render('login', { error: 'An error occurred during onboarding' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard
app.get('/seller-dashboard', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        res.render('seller-dashboard', { sellerData });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Profile page
app.get('/profile', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        const agentEnabled = await db.getAgentEnabled(req.session.userId);
        res.render('profile', { sellerData, agentEnabled });
    } catch (error) {
        console.error('Error rendering profile:', error);
        res.status(500).send('Error loading profile');
    }
});

// Chat logs page
app.get('/chat-logs', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        res.render('chat-logs', { sellerData });
    } catch (error) {
        console.error('Error rendering chat logs:', error);
        res.status(500).send('Error loading chat logs');
    }
});

// Order History page
app.get('/order-history-page', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        res.render('order-history', { sellerData });
    } catch (error) {
        console.error('Error rendering order history:', error);
        res.status(500).send('Error loading order history');
    }
});

// WhatsApp Clone page
app.get('/whatsapp', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        res.render('whatsapp-clone', { sellerData });
    } catch (error) {
        console.error('Error rendering WhatsApp clone:', error);
        res.status(500).send('Error loading WhatsApp clone');
    }
});

// Product History page
app.get('/product-history', requireLogin, async (req, res) => {
    try {
        const sellerData = await getSellerData(req.session.userId);
        res.render('product-history', { sellerData });
    } catch (error) {
        console.error('Error rendering product history:', error);
        res.status(500).send('Error loading product history');
    }
});

// Serve demo CSV file
app.get('/demo-orders.csv', (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="demo-orders.csv"');
    res.sendFile(path.join(__dirname, 'demo-orders.csv'));
});

// AI Chatbot endpoint
app.post('/chatbot', requireLogin, async (req, res) => {
    try {
        const { message, csvData } = req.body;
        console.log('Chatbot request received:', { message: message?.substring(0, 50), hasCsvData: !!csvData });
        
        // Use the logged-in user's ID instead of hardcoded seller4
        const userId = req.session.userId;

        // Initialize AI agent
        const aiAgent = new FlipkartSellerAgentEnhanced();
        await aiAgent.initialize(userId);

        // Check if agent is enabled
        if (!aiAgent.isAgentEnabled()) {
            return res.json({
                success: false,
                message: 'AI agent is disabled for this account.'
            });
        }

        // Get request info for logging
        const requestInfo = {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            sessionId: req.sessionID
        };

        // Handle CSV processing if CSV data is provided
        if (csvData && message.toLowerCase().includes('csv')) {
            console.log('Processing CSV data...');
            const startTime = Date.now();
            try {
                const csvResult = await aiAgent.processCSVOrders(csvData);
                const processingTime = Date.now() - startTime;
                console.log('CSV processing result:', { success: csvResult.success, processedOrders: csvResult.processedOrders });
                
                // Log the CSV processing
                await db.insertChatLog({
                    seller_id: userId,
                    user_message: 'Uploaded CSV file for processing',
                    ai_response: csvResult.message,
                    response_type: 'csv_processing',
                    message_category: 'orders',
                    processing_time_ms: processingTime,
                    success: csvResult.success
                });

                return res.json({
                    success: csvResult.success,
                    message: csvResult.message,
                    responseType: 'csv_processing',
                    messageCategory: 'orders'
                });
            } catch (csvError) {
                const processingTime = Date.now() - startTime;
                console.error('CSV processing error:', csvError);
                
                // Log the error
                await db.insertChatLog({
                    seller_id: userId,
                    user_message: 'Uploaded CSV file for processing',
                    ai_response: `Error processing CSV: ${csvError.message}`,
                    response_type: 'csv_processing_error',
                    message_category: 'orders',
                    processing_time_ms: processingTime,
                    success: false,
                    error_message: csvError.message
                });
                
                return res.json({
                    success: false,
                    message: `Error processing CSV: ${csvError.message}`,
                    responseType: 'csv_processing_error',
                    messageCategory: 'orders'
                });
            }
        }

        // Handle regular message with AI agent
        const response = await aiAgent.handleMessage(message, requestInfo);
        
        console.log('Chatbot response:', response);

        // Handle different response formats from AI agent
        let messageContent, responseType, messageCategory;
        
        if (response && typeof response === 'object') {
            // New format: { success: true, message: "...", responseType: "...", messageCategory: "..." }
            if (response.success !== undefined && response.message) {
                messageContent = response.message;
                responseType = response.responseType || 'general';
                messageCategory = response.messageCategory || 'query';
            }
            // Old format: { response: "...", responseType: "...", messageCategory: "..." }
            else if (response.response) {
                messageContent = response.response;
                responseType = response.responseType || 'general';
                messageCategory = response.messageCategory || 'query';
            }
            // Fallback: treat as string
            else {
                messageContent = response;
                responseType = 'general';
                messageCategory = 'query';
    }
  } else {
            // String response
            messageContent = response;
            responseType = 'general';
            messageCategory = 'query';
        }

        res.json({
            success: true,
            message: messageContent,
            responseType: responseType,
            messageCategory: messageCategory
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            success: false,
            message: `Error processing your request: ${error.message}`
        });
    }
});

// Product management API
app.post('/api/products', requireLogin, async (req, res) => {
    try {
        const productData = req.body;
        const productId = await db.addProduct(req.session.userId, productData);
        res.json({ success: true, productId });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, error: 'Failed to add product' });
    }
});

app.put('/api/products/:id', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        await db.updateProduct(req.session.userId, parseInt(id), updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, error: 'Failed to update product' });
    }
});

// New API endpoint for updating products with profit tracking
app.put('/api/products/:id/profit', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const result = await db.updateProductWithProfit(req.session.userId, parseInt(id), updates);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error updating product with profit:', error);
        res.status(500).json({ success: false, error: 'Failed to update product' });
    }
});

// Product history API
app.get('/api/products/:id/history', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const history = await db.getProductHistory(req.session.userId, parseInt(id), limit, offset);
        res.json(history);
    } catch (error) {
        console.error('Error fetching product history:', error);
        res.status(500).json({ error: 'Failed to fetch product history' });
    }
});

// Profit analytics API
app.get('/api/profit-analytics', requireLogin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const analytics = await db.getProfitAnalytics(req.session.userId, days);
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching profit analytics:', error);
        res.status(500).json({ error: 'Failed to fetch profit analytics' });
    }
});

// Product profit history API
app.get('/api/products/:id/profit-history', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const days = parseInt(req.query.days) || 30;
        const history = await db.getProductProfitHistory(req.session.userId, parseInt(id), days);
        res.json(history);
    } catch (error) {
        console.error('Error fetching product profit history:', error);
        res.status(500).json({ error: 'Failed to fetch product profit history' });
    }
});

// Profit recommendations API
app.get('/api/profit-recommendations', requireLogin, async (req, res) => {
    try {
        const recommendations = await db.calculateProfitRecommendations(req.session.userId);
        res.json(recommendations);
    } catch (error) {
        console.error('Error calculating profit recommendations:', error);
        res.status(500).json({ error: 'Failed to calculate profit recommendations' });
    }
});

app.delete('/api/products/:id', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.deleteProduct(req.session.userId, parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
});

// Order management API
app.put('/api/orders/:id/status', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.updateOrderStatus(req.session.userId, id, status);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
});

// Chat logs API
app.get('/api/chat-logs', requireLogin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await db.getChatLogsBySeller(req.session.userId, limit, offset);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching chat logs:', error);
        res.status(500).json({ error: 'Failed to fetch chat logs' });
    }
});

// AI Agent toggle API
app.post('/api/agent-toggle', requireLogin, async (req, res) => {
    try {
        const { enabled } = req.body;
        const updatedStatus = await db.updateAgentEnabled(req.session.userId, enabled);
        res.json({ 
            success: true, 
            message: `AI Agent ${enabled ? 'enabled' : 'disabled'} successfully`,
            agentEnabled: updatedStatus
        });
    } catch (error) {
        console.error('Error updating agent status:', error);
        res.status(500).json({ success: false, message: 'Failed to update agent status' });
    }
});

// Update seller profile API
app.post('/api/update-seller-profile', requireLogin, async (req, res) => {
    try {
        const updates = req.body;
        // Map frontend field names to database column names
        const dbUpdates = {};
        if (updates.businessName) dbUpdates.business_name = updates.businessName;
        if (updates.ownerName) dbUpdates.owner_name = updates.ownerName;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.gstNumber) dbUpdates.gst_number = updates.gstNumber;

        const updatedProfile = await db.updateSellerProfile(req.session.userId, dbUpdates);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            profile: {
                businessName: updatedProfile.business_name,
                ownerName: updatedProfile.owner_name,
                email: updatedProfile.email,
                phone: updatedProfile.phone,
                address: updatedProfile.address,
                gstNumber: updatedProfile.gst_number,
                rating: parseFloat(updatedProfile.rating),
                totalSales: parseFloat(updatedProfile.total_sales)
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Order History API
app.get('/api/order-history', requireLogin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const filters = {
            order_status: req.query.order_status,
            payment_status: req.query.payment_status,
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };
        
        const orders = await db.getOrderHistory(req.session.userId, limit, offset, filters);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Failed to fetch order history' });
    }
});

app.get('/api/order-history/:id', requireLogin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await db.getOrderHistoryById(req.session.userId, orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order history by ID:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

app.post('/api/order-history', requireLogin, async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            user_id: req.session.userId
        };
        
        const orderId = await db.createOrderHistory(orderData);
        res.status(201).json({ 
            message: 'Order history created successfully', 
            order_id: orderId 
        });
    } catch (error) {
        console.error('Error creating order history:', error);
        res.status(500).json({ error: 'Failed to create order history' });
    }
});

app.put('/api/order-history/:id', requireLogin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const updates = req.body;
        
        const success = await db.updateOrderHistory(req.session.userId, orderId, updates);
        
        if (!success) {
            return res.status(404).json({ error: 'Order not found or no changes made' });
        }
        
        res.json({ message: 'Order history updated successfully' });
    } catch (error) {
        console.error('Error updating order history:', error);
        res.status(500).json({ error: 'Failed to update order history' });
    }
});

app.delete('/api/order-history/:id', requireLogin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        const success = await db.deleteOrderHistory(req.session.userId, orderId);
        
        if (!success) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ message: 'Order history deleted successfully' });
    } catch (error) {
        console.error('Error deleting order history:', error);
        res.status(500).json({ error: 'Failed to delete order history' });
    }
});

app.get('/api/order-history-stats', requireLogin, async (req, res) => {
    try {
        const stats = await db.getOrderHistoryStats(req.session.userId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching order history stats:', error);
        res.status(500).json({ error: 'Failed to fetch order statistics' });
    }
});

// Payment Details page
app.get('/payment-details', requireLogin, async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        // Get filters from query parameters
        const filters = {
            status: req.query.status,
            payment_method: req.query.payment_method,
            customer_name: req.query.customer_name,
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };
        
        // Get payments with filters
        const payments = await db.getPayments(userId, limit, offset, filters);
        
        // Get total count for pagination
        const totalPayments = await db.getPayments(userId, 1000, 0, filters);
        const totalPages = Math.ceil(totalPayments.length / limit);
        
        // Get payment analytics
        const paymentAnalytics = await db.getPaymentAnalytics(userId, 30);
        
        // Build query string for pagination
        const queryParams = new URLSearchParams(req.query);
        queryParams.delete('page');
        const queryString = queryParams.toString();
        
        res.render('payment-details', {
            payments,
            paymentAnalytics,
            currentPage: page,
            totalPages,
            queryString
        });
    } catch (error) {
        console.error('Error rendering payment details:', error);
        res.status(500).send('Error loading payment details');
    }
});

// Payment API endpoints
app.get('/api/payments/:id', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await db.getPaymentById(req.session.userId, parseInt(id));
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
});

app.put('/api/payments/:id/status', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const updatedPayment = await db.updatePaymentStatus(req.session.userId, parseInt(id), status, notes);
        
        if (!updatedPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ success: true, payment: updatedPayment });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

app.put('/api/payments/:id/dispute', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const { disputeStatus, disputeReason } = req.body;
        
        const updatedPayment = await db.updateDisputeStatus(req.session.userId, parseInt(id), disputeStatus, disputeReason);
        
        if (!updatedPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ success: true, payment: updatedPayment });
    } catch (error) {
        console.error('Error updating dispute status:', error);
        res.status(500).json({ error: 'Failed to update dispute status' });
    }
});

// Payment analytics API
app.get('/api/payment-analytics', requireLogin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const analytics = await db.getPaymentAnalytics(req.session.userId, days);
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching payment analytics:', error);
        res.status(500).json({ error: 'Failed to fetch payment analytics' });
    }
});

// Payment methods API
app.get('/api/payment-methods', requireLogin, async (req, res) => {
    try {
        const methods = await db.getPaymentMethods(req.session.userId);
        res.json(methods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
});

// Test endpoint for update announcements
app.post('/test-update-announcement', async (req, res) => {
    try {
        const { updateData } = req.body;
        
        if (!updateData) {
            return res.json({
                success: false,
                message: 'Please provide updateData in the request body'
            });
        }

        // Use the logged-in user's ID
        const userId = req.session.userId;
        if (!userId) {
            return res.json({
                success: false,
                message: 'Please log in to use this feature'
            });
        }

        const agent = new FlipkartSellerAgentEnhanced();
        await agent.initialize(userId);
        
        const announcement = agent.generateUpdateAnnouncement(updateData);
        
        res.json(announcement);
    } catch (error) {
        console.error('Error generating update announcement:', error);
        res.json({
            success: false,
            message: 'Failed to generate update announcement'
        });
    }
});

// Test endpoint for feature explanations
app.post('/test-feature-explanation', async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.json({
                success: false,
                message: 'Please provide a question in the request body'
            });
        }

        // Use the logged-in user's ID
        const userId = req.session.userId;
        if (!userId) {
            return res.json({
                success: false,
                message: 'Please log in to use this feature'
            });
        }

        const agent = new FlipkartSellerAgentEnhanced();
        await agent.initialize(userId);
        
        const explanation = agent.handleFeatureExplanation(question);
        
        res.json(explanation);
    } catch (error) {
        console.error('Error generating feature explanation:', error);
        res.json({
            success: false,
            message: 'Failed to generate feature explanation'
        });
    }
});

// Test endpoint for version management
app.post('/test-version-info', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.json({
                success: false,
                message: 'Please provide a query in the request body'
            });
        }

        // Use the logged-in user's ID
        const userId = req.session.userId;
        if (!userId) {
            return res.json({
                success: false,
                message: 'Please log in to use this feature'
            });
        }

        const agent = new FlipkartSellerAgentEnhanced();
        await agent.initialize(userId);
        
        const versionInfo = agent.handleVersionQueries(query);
        
        if (versionInfo) {
            res.json(versionInfo);
        } else {
            res.json({
                success: false,
                message: 'No version information found for this query'
            });
        }
    } catch (error) {
        console.error('Error generating version info:', error);
        res.json({
            success: false,
            message: 'Failed to generate version information'
        });
    }
});

// Seller Management API endpoints
app.get('/api/sellers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, username, business_name, email, 
                   CASE 
                       WHEN business_name LIKE '%Tech%' OR business_name LIKE '%Electronics%' THEN 'Electronics'
                       WHEN business_name LIKE '%Fashion%' OR business_name LIKE '%Clothing%' THEN 'Fashion'
                       WHEN business_name LIKE '%Home%' OR business_name LIKE '%Garden%' THEN 'Home & Garden'
                       WHEN business_name LIKE '%Accessory%' OR business_name LIKE '%Cable%' THEN 'Accessories'
                       WHEN business_name LIKE '%Office%' OR business_name LIKE '%Supply%' THEN 'Office Supplies'
                       WHEN business_name LIKE '%Premium%' THEN 'Premium'
                       WHEN created_at > NOW() - INTERVAL '30 days' THEN 'New'
                       ELSE 'General'
                   END as category,
                   created_at,
                   is_active
            FROM seller_users 
            ORDER BY business_name
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sellers:', error);
        res.status(500).json({ error: 'Failed to fetch sellers' });
    }
});

app.get('/api/seller-stats', async (req, res) => {
    try {
        // Get total sellers
        const totalSellersResult = await db.query('SELECT COUNT(*) as count FROM seller_users');
        const totalSellers = totalSellersResult.rows[0].count;
        
        // Get active sellers
        const activeSellersResult = await db.query('SELECT COUNT(*) as count FROM seller_users WHERE is_active = true');
        const activeSellers = activeSellersResult.rows[0].count;
        
        // Get total products
        const totalProductsResult = await db.query('SELECT COUNT(*) as count FROM products');
        const totalProducts = totalProductsResult.rows[0].count;
        
        // Get total revenue
        const totalRevenueResult = await db.query('SELECT COALESCE(SUM(total), 0) as total FROM orders');
        const totalRevenue = totalRevenueResult.rows[0].total;
        
        res.json({
            totalSellers: parseInt(totalSellers),
            activeSellers: parseInt(activeSellers),
            totalProducts: parseInt(totalProducts),
            totalRevenue: parseFloat(totalRevenue)
        });
    } catch (error) {
        console.error('Error fetching seller stats:', error);
        res.status(500).json({ error: 'Failed to fetch seller statistics' });
    }
});

// Broadcast announcement endpoint
app.post('/test-broadcast-announcement', async (req, res) => {
    try {
        const { type, targetSellers, category, customMessage, updateData } = req.body;
        
        if (!updateData) {
            return res.json({
                success: false,
                message: 'Please provide updateData in the request body'
            });
        }

        // Use the logged-in user's ID
        const userId = req.session.userId;
        if (!userId) {
            return res.json({
                success: false,
                message: 'Please log in to use this feature'
            });
        }

        const agent = new FlipkartSellerAgentEnhanced();
        await agent.initialize(userId);
        
        // Generate the announcement
        const announcement = agent.generateUpdateAnnouncement(updateData);
        
        // Determine target audience
        let targetInfo = '';
        let sentCount = 0;
        let failedCount = 0;
        
        if (type === 'all') {
            const allSellersResult = await db.query('SELECT COUNT(*) as count FROM seller_users WHERE is_active = true');
            sentCount = parseInt(allSellersResult.rows[0].count);
            targetInfo = `📢 Broadcast sent to ALL ${sentCount} active sellers`;
        } else if (type === 'category') {
            const categorySellersResult = await db.query(`
                SELECT COUNT(*) as count FROM seller_users 
                WHERE is_active = true AND business_name ILIKE $1
            `, [`%${category}%`]);
            sentCount = parseInt(categorySellersResult.rows[0].count);
            targetInfo = `📂 Broadcast sent to ${sentCount} ${category} sellers`;
        } else if (type === 'specific') {
            sentCount = targetSellers.length;
            targetInfo = `🎯 Broadcast sent to ${sentCount} specific sellers`;
        }
        
        // Add custom message to the announcement
        const fullMessage = `${customMessage}\n\n${announcement.message}`;

    res.json({ 
            success: true,
            message: fullMessage,
            targetInfo,
            sentCount,
            failedCount,
            broadcastType: type,
            timestamp: new Date().toISOString()
    });
    
  } catch (error) {
        console.error('Error generating broadcast announcement:', error);
        res.json({
            success: false,
            message: 'Failed to generate broadcast announcement'
        });
    }
});

// Initialize database and start server
async function startServer() {
    try {
        await db.initializeDatabase();
        console.log('Database initialized successfully');
        
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
