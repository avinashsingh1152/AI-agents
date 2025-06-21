const db = require('./db');

class FlipkartSellerAgent {
    constructor() {
        this.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "eadd36ff773c4c659b2372403eba44f8";
        this.agentEnabled = false;
        this.currentSellerId = null;
        this.sellerData = null;
    }

    // Initialize agent with seller context
    async initialize(sellerId) {
        this.currentSellerId = sellerId;
        this.agentEnabled = await db.getAgentEnabled(sellerId);
        this.sellerData = await this.getSellerData(sellerId);
        return this.agentEnabled;
    }

    // Get comprehensive seller data
    async getSellerData(userId) {
        try {
            const profile = await db.getSellerProfile(userId);
            const products = await db.getProducts(userId);
            const orders = await db.getOrders(userId);
            const analytics = await db.getAnalytics(userId);

            return {
                profile: {
                    businessName: profile.business_name,
                    ownerName: profile.owner_name,
                    email: profile.email,
                    phone: profile.phone,
                    address: profile.address,
                    gstNumber: profile.gst_number,
                    rating: parseFloat(profile.rating),
                    totalSales: parseFloat(profile.total_sales)
                },
                products: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price),
                    stock: p.stock,
                    category: p.category,
                    description: p.description,
                    status: p.status
                })),
                orders: orders.map(o => ({
                    id: o.id,
                    customerName: o.customer_name,
                    products: o.products || [],
                    total: parseFloat(o.total),
                    status: o.status,
                    date: o.order_date
                })),
                analytics
            };
        } catch (error) {
            console.error('Error fetching seller data:', error);
            throw error;
        }
    }

    // Check if agent is enabled for current seller
    isAgentEnabled() {
        return this.agentEnabled;
    }

    // Main agent processing function
    async handleMessage(message, requestInfo = {}) {
        const startTime = Date.now();
        let responseType = 'general';
        let messageCategory = 'query';
        let success = true;
        let errorMessage = null;
        let tokensUsed = null;
        let aiResponse = '';

        // Guardrail: Block out-of-scope or privacy-violating questions
        const forbiddenPatterns = [
            /other seller/i,
            /other sellers/i,
            /customer( |'|"|s|:|\.|,|\?|\!|$)/i,
            /user( |'|"|s|:|\.|,|\?|\!|$)/i,
            /personal data/i,
            /private data/i,
            /email( |'|"|s|:|\.|,|\?|\!|$)/i,
            /phone( |'|"|s|:|\.|,|\?|\!|$)/i,
            /address( |'|"|s|:|\.|,|\?|\!|$)/i,
            /contact( |'|"|s|:|\.|,|\?|\!|$)/i,
            /general knowledge/i,
            /chatgpt/i,
            /openai/i,
            /ai model/i,
            /who are you/i,
            /tell me a joke/i,
            /write code/i,
            /solve math/i,
            /translate/i,
            /news/i,
            /weather/i,
            /currency/i,
            /stock price/i,
            /politics/i,
            /sports/i,
            /movie/i,
            /music/i,
            /history/i,
            /science/i,
            /technology/i
        ];
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(message)) {
                aiResponse = "I'm sorry, I can only assist you with your own seller account, products, orders, analytics, and business profile on this ecommerce platform. I cannot provide information about other sellers, customers, or any unrelated topics.";
                await this.logInteraction({
                    seller_id: this.currentSellerId,
                    user_message: message,
                    ai_response: aiResponse,
                    response_type: 'blocked',
                    message_category: 'forbidden',
                    processing_time_ms: 0,
                    tokens_used: 0,
                    success: false,
                    error_message: 'Blocked forbidden query',
                    user_agent: requestInfo.userAgent,
                    ip_address: requestInfo.ipAddress,
                    session_id: requestInfo.sessionId
                });
                return aiResponse;
            }
        }
        
        try {
            const lowerMessage = message.toLowerCase();
            
            // Determine response type and category based on message content
            if (lowerMessage.includes('product') && (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('all'))) {
                responseType = 'product_list';
                messageCategory = 'inventory';
                aiResponse = this.generateProductList();
                return aiResponse;
            }
            
            if (lowerMessage.includes('order') && (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('all'))) {
                responseType = 'order_list';
                messageCategory = 'orders';
                aiResponse = this.generateOrderList();
                return aiResponse;
            }
            
            if (lowerMessage.includes('summary') || lowerMessage.includes('report') || lowerMessage.includes('overview')) {
                responseType = 'business_summary';
                messageCategory = 'analytics';
                aiResponse = this.generateBusinessSummary();
                return aiResponse;
            }
            
            // Handle other specific queries with formatted responses
            if (lowerMessage.includes('low stock') || lowerMessage.includes('out of stock')) {
                responseType = 'stock_alert';
                messageCategory = 'inventory';
                const lowStockProducts = this.sellerData.products.filter(p => p.stock < 10);
                const outOfStockProducts = this.sellerData.products.filter(p => p.stock === 0);
                
                aiResponse = `<div class="ai-summary-container">
                    <div class="summary-header">
                        <h3>⚠️ Stock Alerts</h3>
                    </div>
                    
                    ${lowStockProducts.length > 0 ? `
                        <div class="summary-section alert-section">
                            <h4>🟡 Low Stock Items</h4>
                            <div class="alert-list">
                                ${lowStockProducts.map(p => `
                                    <div class="alert-item">
                                        <span class="alert-icon">⚠️</span>
                                        <span class="alert-text">${p.name} - Only ${p.stock} left (₹${p.price})</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${outOfStockProducts.length > 0 ? `
                        <div class="summary-section alert-section">
                            <h4>🔴 Out of Stock Items</h4>
                            <div class="alert-list">
                                ${outOfStockProducts.map(p => `
                                    <div class="alert-item">
                                        <span class="alert-icon">❌</span>
                                        <span class="alert-text">${p.name} - Out of stock (₹${p.price})</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="summary-footer">
                        <p>Would you like me to help you restock these items? 🚀</p>
                    </div>
                </div>`;
                
                return aiResponse;
            }

            // Handle sales queries with real data
            if (lowerMessage.includes('sales') && (lowerMessage.includes('last') || lowerMessage.includes('5') || lowerMessage.includes('days'))) {
                responseType = 'sales_report';
                messageCategory = 'analytics';
                
                // Get sales data for last 5 days
                const salesData = await this.getSalesData(5);
                aiResponse = this.generateSalesReport(salesData);
                return aiResponse;
            }

            // Handle product history queries
            if (lowerMessage.includes('product') && (lowerMessage.includes('history') || lowerMessage.includes('performance') || lowerMessage.includes('details'))) {
                responseType = 'product_history';
                messageCategory = 'products';
                
                aiResponse = this.generateProductHistory();
                return aiResponse;
            }

            // Handle selling history queries
            if (lowerMessage.includes('selling') && lowerMessage.includes('history')) {
                responseType = 'selling_history';
                messageCategory = 'analytics';
                
                aiResponse = this.generateSellingHistory();
                return aiResponse;
            }

            // Handle selling history queries (more flexible patterns)
            if ((lowerMessage.includes('selling') || lowerMessage.includes('sales')) && 
                (lowerMessage.includes('history') || lowerMessage.includes('performance') || lowerMessage.includes('analytics'))) {
                responseType = 'selling_history';
                messageCategory = 'analytics';
                
                aiResponse = this.generateSellingHistory();
                return aiResponse;
            }

            // Handle business performance and history queries
            if ((lowerMessage.includes('business') || lowerMessage.includes('performance') || lowerMessage.includes('history')) && 
                (lowerMessage.includes('my') || lowerMessage.includes('show') || lowerMessage.includes('get'))) {
                responseType = 'selling_history';
                messageCategory = 'analytics';
                
                aiResponse = this.generateSellingHistory();
                return aiResponse;
            }

            // Handle order history queries (more flexible patterns)
            if (lowerMessage.includes('order') || lowerMessage.includes('orders')) {
                responseType = 'order_history';
                messageCategory = 'orders';
                
                aiResponse = this.generateOrderHistory();
                return aiResponse;
            }

            // Handle top selling products queries
            if ((lowerMessage.includes('most') || lowerMessage.includes('top') || lowerMessage.includes('best')) && 
                (lowerMessage.includes('selling') || lowerMessage.includes('sold') || lowerMessage.includes('products'))) {
                responseType = 'top_products';
                messageCategory = 'analytics';
                
                const topProducts = await this.getTopSellingProducts();
                aiResponse = this.generateTopProductsReport(topProducts);
                return aiResponse;
            }
            
            // For other queries, use Azure OpenAI
            responseType = 'ai_generated';
            messageCategory = 'general';
            
            const systemPrompt = `You are a specialized ecommerce seller assistant for Flipkart. Your role is to help the current seller (ID: ${this.currentSellerId}) manage their business on this platform.

DATABASE STRUCTURE:
- seller_users: id, username, email, business_name, agent_enabled
- seller_profile: user_id, business_name, owner_name, email, phone, address, gst_number, rating, total_sales
- products: id, user_id, name, price, stock, category, description, status
- orders: id, user_id, customer_name, total, status, order_date
- order_items: id, order_id, product_name, quantity, price
- chat_logs: seller_id, user_message, ai_response, response_type, message_category

IMPORTANT RULES:
1. ONLY help with the current seller's own data (products, orders, profile, analytics)
2. NEVER share information about other sellers or customers
3. NEVER provide personal information about customers
4. ALWAYS verify data belongs to the current seller before sharing
5. For business-related queries about the seller's own data, provide helpful insights
6. If asked about other sellers' data, politely decline and redirect to their own business
7. Use REAL data from the database, never generate fake information
8. ALWAYS provide order details when customers ask about orders or order history
9. Be helpful and provide comprehensive order information for the current seller

ALLOWED QUERIES:
- Product management (add, update, delete, view seller's own products)
- Order management (view, update status of seller's own orders)
- Business profile updates
- Sales analytics and reports for seller's own business
- Product history, sales history, and performance metrics for seller's own data
- Inventory management
- Business insights and recommendations based on seller's own data
- Top selling products analysis using real sales data
- Order history and details for the current seller's business
- ANY order-related queries (order history, my orders, view orders, etc.)

FORBIDDEN QUERIES:
- Information about other sellers
- Customer personal information
- Competitor analysis using other sellers' data
- General knowledge questions unrelated to ecommerce
- Questions about other platforms or businesses
- Generating fake data or statistics
- Providing order details for other sellers or customers

When responding:
- Use clear, structured formatting with bullet points and sections
- Provide actionable insights and recommendations
- Format responses with HTML for better presentation
- Be helpful and professional while maintaining data security
- Always base responses on actual database data
- ALWAYS provide order details when asked about orders
- Be comprehensive and helpful with order information

Current seller context: ${this.sellerData.profile.businessName} (ID: ${this.currentSellerId})`;

            const data = {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            };

            const response = await fetch('http://10.83.64.112/gpt-4o/chat/completions?api-version=2023-07-01-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': 'eadd36ff773c4c659b2372403eba44f8'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();
            aiResponse = responseData.choices[0].message.content.trim();
            tokensUsed = responseData.usage?.total_tokens || null;
            console.log('Chatbot response:', aiResponse);
            
            return aiResponse;
        } catch (error) {
            console.error('Azure OpenAI API error:', error);
            success = false;
            errorMessage = error.message;
            aiResponse = `I'm sorry, I'm having trouble connecting to my AI service right now. But I can help you with basic queries about your business! Try asking me about:
            <ul>
                <li>📊 Business summary</li>
                <li>📦 Product inventory</li>
                <li>📋 Order history</li>
                <li>⚠️ Stock alerts</li>
            </ul>`;
            
            return aiResponse;
        } finally {
            // Log the interaction
            const processingTime = Date.now() - startTime;
            await this.logInteraction({
                seller_id: this.currentSellerId,
                user_message: message,
                ai_response: aiResponse,
                response_type: responseType,
                message_category: messageCategory,
                processing_time_ms: processingTime,
                tokens_used: tokensUsed,
                success: success,
                error_message: errorMessage,
                user_agent: requestInfo.userAgent,
                ip_address: requestInfo.ipAddress,
                session_id: requestInfo.sessionId
            });
        }
    }

    // Log interaction to database
    async logInteraction(logData) {
        try {
            await db.insertChatLog(logData);
        } catch (error) {
            console.error('Error logging interaction:', error);
            // Don't throw error to avoid breaking the main flow
        }
    }

    // Create comprehensive context for the AI
    createContext() {
        const { profile, products, orders, analytics } = this.sellerData;
        
        return {
            seller: {
                id: this.currentSellerId,
                businessName: profile.businessName,
                ownerName: profile.ownerName,
                email: profile.email,
                phone: profile.phone,
                address: profile.address,
                gstNumber: profile.gstNumber,
                rating: profile.rating,
                totalSales: profile.totalSales
            },
            products: {
                count: products.length,
                items: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    stock: p.stock,
                    category: p.category,
                    status: p.status
                })),
                categories: [...new Set(products.map(p => p.category))],
                lowStock: products.filter(p => p.stock < 10).length,
                outOfStock: products.filter(p => p.stock === 0).length
            },
            orders: {
                count: orders.length,
                items: orders.map(o => ({
                    id: o.id,
                    customerName: o.customerName,
                    total: o.total,
                    status: o.status,
                    date: o.date
                })),
                totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
                statusBreakdown: orders.reduce((acc, o) => {
                    acc[o.status] = (acc[o.status] || 0) + 1;
                    return acc;
                }, {})
            },
            analytics: analytics
        };
    }

    // Create system prompt with comprehensive instructions
    createSystemPrompt(context) {
        return `You are an AI assistant for a Flipkart seller dashboard. You have access to the seller's complete business data and can perform various operations.

SELLER CONTEXT:
- Business: ${context.seller.businessName}
- Owner: ${context.seller.ownerName}
- Total Sales: ₹${context.seller.totalSales.toLocaleString()}
- Rating: ${context.seller.rating}/5

PRODUCTS (${context.products.count}):
${context.products.items.map(p => `- ${p.name}: ₹${p.price} (Stock: ${p.stock}) - ${p.category}`).join('\n')}

ORDERS (${context.orders.count}):
${context.orders.items.map(o => `- ${o.id}: ${o.customerName} - ₹${o.total} - ${o.status}`).join('\n')}

CAPABILITIES:
1. PRODUCT MANAGEMENT:
   - Add new products with name, price, stock, category, description
   - Update product details (price, stock, name, category, description)
   - Delete products
   - List all products or filter by category
   - Check stock levels and inventory status

2. ORDER MANAGEMENT:
   - View order details and history
   - Update order status (processing → confirmed → shipped → delivered → cancelled)
   - List orders with analytics
   - Track order progress

3. BUSINESS INSIGHTS:
   - Generate business reports and summaries
   - Show sales analytics and revenue trends
   - Check inventory status and low stock alerts
   - Analyze order patterns and customer behavior

4. PROFILE MANAGEMENT:
   - Update business information
   - Modify contact details
   - Update GST number and address

SECURITY RULES:
- NEVER show other sellers' data
- Only operate on data belonging to seller ID: ${context.seller.id}
- All operations must be restricted to this seller's data only
- If asked about other sellers, politely decline

RESPONSE FORMAT:
- Use clear, structured formatting with proper spacing
- Use bullet points and numbered lists for better readability
- Group related information together
- Use emojis sparingly but effectively
- Use bold text for important information
- Separate sections with clear headers
- Keep responses concise but informative
- Always be professional and business-focused

FORMATTING GUIDELINES:
- Use **bold** for section headers and important data
- Use bullet points (•) for lists
- Use numbered lists for sequential information
- Separate sections with line breaks
- Use tables or structured layouts when presenting data
- Highlight key metrics and insights

When the user asks for operations, respond naturally and indicate if you can perform the action.`;
    }

    // Parse AI response and execute actions
    async parseAndExecuteActions(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        const lowerResponse = aiResponse.toLowerCase();

        try {
            // Product Operations
            if (this.shouldAddProduct(lowerMessage, lowerResponse)) {
                return await this.handleAddProduct(userMessage);
            }

            if (this.shouldUpdateProduct(lowerMessage, lowerResponse)) {
                return await this.handleUpdateProduct(userMessage);
            }

            if (this.shouldDeleteProduct(lowerMessage, lowerResponse)) {
                return await this.handleDeleteProduct(userMessage);
            }

            if (this.shouldListProducts(lowerMessage, lowerResponse)) {
                return await this.handleListProducts(userMessage);
            }

            // Order Operations
            if (this.shouldUpdateOrderStatus(lowerMessage, lowerResponse)) {
                return await this.handleUpdateOrderStatus(userMessage);
            }

            if (this.shouldListOrders(lowerMessage, lowerResponse)) {
                return await this.handleListOrders(userMessage);
            }

            // Profile Operations
            if (this.shouldUpdateProfile(lowerMessage, lowerResponse)) {
                return await this.handleUpdateProfile(userMessage);
            }

            // Analytics Operations
            if (this.shouldGenerateReport(lowerMessage, lowerResponse)) {
                return await this.handleGenerateReport(userMessage);
            }

            return {
                actionExecuted: false,
                updateResult: null,
                updatedData: null,
                requiresAction: false
            };

        } catch (error) {
            console.error('Error executing action:', error);
            return {
                actionExecuted: false,
                updateResult: { success: false, message: error.message },
                updatedData: null,
                requiresAction: false
            };
        }
    }

    // Action detection methods
    shouldAddProduct(message, response) {
        return (message.includes('add') || message.includes('create') || message.includes('new')) &&
               (message.includes('product') || response.includes('add product') || response.includes('create product'));
    }

    shouldUpdateProduct(message, response) {
        return (message.includes('update') || message.includes('change') || message.includes('modify')) &&
               (message.includes('product') || response.includes('update product') || response.includes('modify product'));
    }

    shouldDeleteProduct(message, response) {
        return (message.includes('delete') || message.includes('remove')) &&
               (message.includes('product') || response.includes('delete product') || response.includes('remove product'));
    }

    shouldListProducts(message, response) {
        return (message.includes('show') || message.includes('list') || message.includes('view')) &&
               (message.includes('product') || response.includes('show products') || response.includes('list products'));
    }

    shouldUpdateOrderStatus(message, response) {
        return (message.includes('update') || message.includes('change')) &&
               (message.includes('order') || message.includes('status') || response.includes('update order'));
    }

    shouldListOrders(message, response) {
        return (message.includes('show') || message.includes('list') || message.includes('view')) &&
               (message.includes('order') || response.includes('show orders') || response.includes('list orders'));
    }

    shouldUpdateProfile(message, response) {
        return (message.includes('update') || message.includes('change') || message.includes('modify')) &&
               (message.includes('profile') || message.includes('business') || response.includes('update profile'));
    }

    shouldGenerateReport(message, response) {
        return (message.includes('report') || message.includes('summary') || message.includes('analytics')) &&
               (response.includes('generate') || response.includes('create') || response.includes('show'));
    }

    // Action execution methods
    async handleAddProduct(message) {
        // Return form for adding product
        return {
            actionExecuted: false,
            updateResult: null,
            updatedData: null,
            requiresAction: true,
            actionType: 'ADD_PRODUCT_FORM'
        };
    }

    async handleUpdateProduct(message) {
        // Extract product name and updates from message
        const productMatch = message.match(/update.*?(?:price|stock|name|category|description).*?(?:of|for)\s+(.+?)(?:\s+to\s+(.+))?/i);
        
        if (!productMatch) {
            return {
                actionExecuted: false,
                updateResult: null,
                updatedData: null,
                requiresAction: false
            };
        }

        const productName = productMatch[1].trim();
        const updateValue = productMatch[2] ? productMatch[2].trim() : null;
        
        const product = this.sellerData.products.find(p => 
            p.name.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (!product) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: `Product "${productName}" not found` },
                updatedData: null,
                requiresAction: false
            };
        }

        // Determine what to update
        let updateField = '';
        let updateData = null;
        
        if (message.toLowerCase().includes('price')) {
            updateField = 'price';
            updateData = parseFloat(updateValue.replace('₹', '').replace(',', ''));
        } else if (message.toLowerCase().includes('stock')) {
            updateField = 'stock';
            updateData = parseInt(updateValue);
        } else if (message.toLowerCase().includes('name')) {
            updateField = 'name';
            updateData = updateValue;
        } else if (message.toLowerCase().includes('category')) {
            updateField = 'category';
            updateData = updateValue;
        } else if (message.toLowerCase().includes('description')) {
            updateField = 'description';
            updateData = updateValue;
        }

        if (!updateField || !updateData) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: "Please specify what to update and the new value" },
                updatedData: null,
                requiresAction: false
            };
        }

        // Update the product
        await db.updateProduct(this.currentSellerId, product.id, { [updateField]: updateData });
        
        // Refresh seller data
        this.sellerData = await this.getSellerData(this.currentSellerId);
        
        return {
            actionExecuted: true,
            updateResult: { success: true, message: `Product ${updateField} updated successfully` },
            updatedData: this.sellerData,
            requiresAction: false
        };
    }

    async handleDeleteProduct(message) {
        const productMatch = message.match(/delete.*?(?:product)?.*?(?:called\s+)?(.+)/i);
        
        if (!productMatch) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: "Please specify which product to delete" },
                updatedData: null,
                requiresAction: false
            };
        }

        const productName = productMatch[1].trim();
        const product = this.sellerData.products.find(p => 
            p.name.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (!product) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: `Product "${productName}" not found` },
                updatedData: null,
                requiresAction: false
            };
        }

        // Delete the product
        await db.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [product.id, this.currentSellerId]);
        
        // Refresh seller data
        this.sellerData = await this.getSellerData(this.currentSellerId);
        
        return {
            actionExecuted: true,
            updateResult: { success: true, message: "Product deleted successfully" },
            updatedData: this.sellerData,
            requiresAction: false
        };
    }

    async handleListProducts(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('all') || lowerMessage.includes('list')) {
            return {
                actionExecuted: false,
                updateResult: null,
                updatedData: null,
                requiresAction: false
            };
        }
        
        if (lowerMessage.includes('category')) {
            const categoryMatch = message.match(/category\s+(.+)/i);
            if (categoryMatch) {
                const category = categoryMatch[1].trim();
                const filteredProducts = this.sellerData.products.filter(p => 
                    p.category.toLowerCase().includes(category.toLowerCase())
                );
                
                if (filteredProducts.length === 0) {
                    return {
                        actionExecuted: false,
                        updateResult: { success: false, message: `No products found in category "${category}"` },
                        updatedData: null,
                        requiresAction: false
                    };
                }
            }
        }
        
        return {
            actionExecuted: false,
            updateResult: null,
            updatedData: null,
            requiresAction: false
        };
    }

    async handleUpdateOrderStatus(message) {
        const orderMatch = message.match(/order\s+(\w+).*?(?:to|status)\s+(.+)/i);
        
        if (!orderMatch) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: "Please specify order ID and new status" },
                updatedData: null,
                requiresAction: false
            };
        }

        const orderId = orderMatch[1].toUpperCase();
        const newStatus = orderMatch[2].trim().toLowerCase();
        
        const validStatuses = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
        if (!validStatuses.includes(newStatus)) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` },
                updatedData: null,
                requiresAction: false
            };
        }

        const order = this.sellerData.orders.find(o => o.id === orderId);
        if (!order) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: `Order ${orderId} not found` },
                updatedData: null,
                requiresAction: false
            };
        }

        // Update order status
        await db.updateOrderStatus(this.currentSellerId, orderId, newStatus);
        
        // Refresh seller data
        this.sellerData = await this.getSellerData(this.currentSellerId);
        
        return {
            actionExecuted: true,
            updateResult: { success: true, message: `Order status updated to ${newStatus}` },
            updatedData: this.sellerData,
            requiresAction: false
        };
    }

    async handleListOrders(message) {
        return {
            actionExecuted: false,
            updateResult: null,
            updatedData: null,
            requiresAction: false
        };
    }

    async handleUpdateProfile(message) {
        const lowerMessage = message.toLowerCase();
        let updateField = '';
        let updateValue = '';
        
        if (lowerMessage.includes('phone')) {
            const phoneMatch = message.match(/phone.*?(?:to|number)\s+(.+)/i);
            if (phoneMatch) {
                updateField = 'phone';
                updateValue = phoneMatch[1].trim();
            }
        } else if (lowerMessage.includes('email')) {
            const emailMatch = message.match(/email.*?(?:to|address)\s+(.+)/i);
            if (emailMatch) {
                updateField = 'email';
                updateValue = emailMatch[1].trim();
            }
        } else if (lowerMessage.includes('address')) {
            const addressMatch = message.match(/address.*?(?:to|location)\s+(.+)/i);
            if (addressMatch) {
                updateField = 'address';
                updateValue = addressMatch[1].trim();
            }
        } else if (lowerMessage.includes('gst')) {
            const gstMatch = message.match(/gst.*?(?:to|number)\s+(.+)/i);
            if (gstMatch) {
                updateField = 'gst_number';
                updateValue = gstMatch[1].trim();
            }
        }
        
        if (!updateField || !updateValue) {
            return {
                actionExecuted: false,
                updateResult: { success: false, message: "Please specify what to update" },
                updatedData: null,
                requiresAction: false
            };
        }
        
        // Update the profile
        await db.updateSellerProfile(this.currentSellerId, { [updateField]: updateValue });
        
        // Refresh seller data
        this.sellerData = await this.getSellerData(this.currentSellerId);
        
        return {
            actionExecuted: true,
            updateResult: { success: true, message: `Profile ${updateField} updated successfully` },
            updatedData: this.sellerData,
            requiresAction: false
        };
    }

    async handleGenerateReport(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('summary') || lowerMessage.includes('report') || lowerMessage.includes('overview')) {
            return {
                actionExecuted: false,
                updateResult: null,
                updatedData: null,
                requiresAction: false,
                customResponse: this.generateBusinessSummary()
            };
        }
        
        return {
            actionExecuted: false,
            updateResult: null,
            updatedData: null,
            requiresAction: false
        };
    }

    // Generate formatted business summary
    generateBusinessSummary() {
        const { profile, products, orders, analytics } = this.sellerData;
        
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const lowStockProducts = products.filter(p => p.stock < 10);
        const outOfStockProducts = products.filter(p => p.stock === 0);
        const categoryBreakdown = products.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        }, {});
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 ${profile.businessName} - Business Summary</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card business-overview">
                    <h4>🏢 Business Overview</h4>
                    <ul>
                        <li><strong>Owner:</strong> ${profile.ownerName}</li>
                        <li><strong>Total Revenue:</strong> ₹${totalRevenue.toLocaleString()}</li>
                        <li><strong>Rating:</strong> ${profile.rating}/5 ⭐</li>
                        <li><strong>Total Products:</strong> ${products.length}</li>
                        <li><strong>Total Orders:</strong> ${orders.length}</li>
                    </ul>
                </div>
                
                <div class="summary-card inventory-status">
                    <h4>📦 Product Inventory</h4>
                    <ul>
                        <li><strong>Categories:</strong> ${Object.keys(categoryBreakdown).length}</li>
                        <li><strong>Low Stock Items:</strong> <span class="warning">${lowStockProducts.length}</span></li>
                        <li><strong>Out of Stock:</strong> <span class="danger">${outOfStockProducts.length}</span></li>
                    </ul>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📈 Top Products by Stock</h4>
                <div class="product-list">
                    ${products.slice(0, 5).map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}.</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-price">₹${p.price}</span>
                            <span class="product-stock">Stock: ${p.stock}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${lowStockProducts.length > 0 ? `
                <div class="summary-section alert-section">
                    <h4>⚠️ Low Stock Alerts</h4>
                    <div class="alert-list">
                        ${lowStockProducts.map(p => `
                            <div class="alert-item">
                                <span class="alert-icon">⚠️</span>
                                <span class="alert-text">${p.name} - Only ${p.stock} left</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="summary-section">
                <h4>📋 Recent Orders</h4>
                <div class="order-list">
                    ${orders.slice(0, 3).map(o => `
                        <div class="order-item">
                            <span class="order-id"><strong>${o.id}</strong></span>
                            <span class="order-customer">${o.customerName}</span>
                            <span class="order-amount">₹${o.total}</span>
                            <span class="order-status status-${o.status}">${o.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section insights">
                <h4>💡 Quick Insights</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Average Order Value:</span>
                        <span class="insight-value">₹${(totalRevenue / orders.length).toFixed(0)}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Most Popular Category:</span>
                        <span class="insight-value">${Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Orders Pending:</span>
                        <span class="insight-value">${orders.filter(o => o.status === 'processing').length}</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Would you like me to dive deeper into any specific area? 🚀</p>
            </div>
        </div>`;
    }

    // Generate formatted product list
    generateProductList() {
        const { products } = this.sellerData;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📦 Product Inventory - ${products.length} Items</h3>
            </div>
            
            <div class="summary-section">
                <h4>🛍️ All Products</h4>
                <div class="product-list">
                    ${products.map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-category">${p.category}</span>
                            <span class="product-price">₹${p.price}</span>
                            <span class="product-stock ${p.stock < 10 ? 'low-stock' : ''}">Stock: ${p.stock}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need to update any product details? Just ask me! 🚀</p>
            </div>
        </div>`;
    }

    // Generate formatted order list
    generateOrderList() {
        const { orders } = this.sellerData;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📋 Order History - ${orders.length} Orders</h3>
            </div>
            
            <div class="summary-section">
                <h4>📦 All Orders</h4>
                <div class="order-list">
                    ${orders.map((o, i) => `
                        <div class="order-item">
                            <span class="order-number">${i + 1}</span>
                            <span class="order-id"><strong>${o.id}</strong></span>
                            <span class="order-customer">${o.customerName}</span>
                            <span class="order-amount">₹${o.total}</span>
                            <span class="order-status status-${o.status}">${o.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need to update any order status? Just ask me! 🚀</p>
            </div>
        </div>`;
    }

    // Get sales data for last N days
    async getSalesData(days) {
        try {
            const query = `
                SELECT 
                    DATE(order_date) as sale_date,
                    COUNT(*) as total_orders,
                    SUM(total) as total_sales,
                    AVG(total) as avg_order_value
                FROM orders 
                WHERE user_id = $1 
                AND order_date >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY DATE(order_date)
                ORDER BY sale_date DESC
            `;
            
            const result = await db.query(query, [this.currentSellerId]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching sales data:', error);
            return [];
        }
    }

    // Generate sales report with real data
    generateSalesReport(salesData) {
        if (!salesData || salesData.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📊 Sales Report - Last 5 Days</h3>
                </div>
                <div class="summary-section">
                    <p>No sales data found for the last 5 days.</p>
                </div>
            </div>`;
        }

        const totalSales = salesData.reduce((sum, day) => sum + parseFloat(day.total_sales), 0);
        const totalOrders = salesData.reduce((sum, day) => sum + parseInt(day.total_orders), 0);
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 Sales Report - Last 5 Days</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>💰 Total Sales</h4>
                    <div class="stats-number">₹${totalSales.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📦 Total Orders</h4>
                    <div class="stats-number">${totalOrders}</div>
                </div>
                <div class="summary-card">
                    <h4>📈 Avg Order Value</h4>
                    <div class="stats-number">₹${avgOrderValue.toFixed(0)}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📅 Daily Breakdown</h4>
                <div class="sales-list">
                    ${salesData.map(day => `
                        <div class="sales-item">
                            <span class="sales-date">${new Date(day.sale_date).toLocaleDateString()}</span>
                            <span class="sales-orders">${day.total_orders} orders</span>
                            <span class="sales-amount">₹${parseFloat(day.total_sales).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need more detailed analytics? Just ask! 📊</p>
            </div>
        </div>`;
    }

    // Generate product history
    generateProductHistory() {
        const { products } = this.sellerData;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📋 Product History - ${products.length} Items</h3>
            </div>
            
            <div class="summary-section">
                <h4>🛍️ All Products</h4>
                <div class="product-list">
                    ${products.map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-category">${p.category}</span>
                            <span class="product-price">₹${p.price}</span>
                            <span class="product-stock">Stock: ${p.stock}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need more detailed product history? Just ask! 📋</p>
            </div>
        </div>`;
    }

    // Generate selling history
    generateSellingHistory() {
        const { products, orders } = this.sellerData;
        
        // Calculate analytics
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        const pendingOrders = orders.filter(o => ['processing', 'confirmed', 'shipped'].includes(o.status)).length;
        
        // Get recent orders (last 5)
        const recentOrders = orders.slice(0, 5);
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 Selling History & Analytics</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>💰 Total Revenue</h4>
                    <div class="stats-number">₹${totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📦 Total Orders</h4>
                    <div class="stats-number">${totalOrders}</div>
                </div>
                <div class="summary-card">
                    <h4>📈 Avg Order Value</h4>
                    <div class="stats-number">₹${avgOrderValue.toFixed(0)}</div>
                </div>
                <div class="summary-card">
                    <h4>✅ Completed Orders</h4>
                    <div class="stats-number">${completedOrders}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📅 Recent Orders (Last 5)</h4>
                <div class="order-list">
                    ${recentOrders.map((o, i) => `
                        <div class="order-item">
                            <span class="order-number">${i + 1}</span>
                            <span class="order-id"><strong>${o.id}</strong></span>
                            <span class="order-customer">${o.customerName}</span>
                            <span class="order-amount">₹${o.total.toLocaleString()}</span>
                            <span class="order-status status-${o.status}">${o.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📋 Order Status Breakdown</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Delivered</span>
                        <span class="insight-value">${completedOrders} orders</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Pending</span>
                        <span class="insight-value">${pendingOrders} orders</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Cancelled/Returned</span>
                        <span class="insight-value">${orders.filter(o => ['cancelled', 'returned'].includes(o.status)).length} orders</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Your business is performing well! Keep up the great work! 🚀</p>
            </div>
        </div>`;
    }

    // Generate top products report
    generateTopProductsReport(topProducts) {
        if (!topProducts || topProducts.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📊 Top Selling Products</h3>
                </div>
                <div class="summary-section">
                    <h4>📋 No Sales Data Available</h4>
                    <p>Currently, there are no products with sales data in your database. This could be because:</p>
                    <ul>
                        <li>No orders have been placed yet</li>
                        <li>Product names in orders don't match product names in inventory</li>
                        <li>Orders exist but order_items are missing</li>
                    </ul>
                    <p><strong>Available Products:</strong></p>
                    <div class="product-list">
                        ${this.sellerData.products.map((p, i) => `
                            <div class="product-item">
                                <span class="product-number">${i + 1}</span>
                                <span class="product-name"><strong>${p.name}</strong></span>
                                <span class="product-category">${p.category}</span>
                                <span class="product-price">₹${p.price}</span>
                                <span class="product-stock">Stock: ${p.stock}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="summary-footer">
                    <p>To see top selling products, you need to have orders with matching product names! 📦</p>
                </div>
            </div>`;
        }

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 Top Selling Products</h3>
            </div>
            
            <div class="summary-section">
                <h4>🛍️ Top Selling Products</h4>
                <div class="product-list">
                    ${topProducts.map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-category">${p.category}</span>
                            <span class="product-price">₹${p.price}</span>
                            <span class="product-stock">Sold: ${p.quantity_sold || 0}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>These are your actual top-performing products based on sales data! 🚀</p>
            </div>
        </div>`;
    }

    // Get top selling products from database
    async getTopSellingProducts() {
        try {
            // Query to get products with their sales data using correct column names
            // Only show products that have actual sales (quantity_sold > 0)
            const query = `
                SELECT 
                    p.id,
                    p.name,
                    p.price,
                    p.category,
                    p.stock,
                    COALESCE(SUM(oi.quantity), 0) as quantity_sold,
                    COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
                FROM products p
                LEFT JOIN order_items oi ON p.name = oi.product_name
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE p.user_id = $1
                GROUP BY p.id, p.name, p.price, p.category, p.stock
                HAVING COALESCE(SUM(oi.quantity), 0) > 0
                ORDER BY quantity_sold DESC, total_revenue DESC
                LIMIT 10
            `;
            
            const result = await db.query(query, [this.currentSellerId]);
            
            // If no products with sales found, show a message
            if (result.rows.length === 0) {
                console.log('No products with sales found. Checking available data...');
                
                // Debug query to see what products and order_items exist
                const debugQuery = `
                    SELECT 
                        'products' as table_name,
                        name,
                        price,
                        category
                    FROM products 
                    WHERE user_id = $1
                    UNION ALL
                    SELECT 
                        'order_items' as table_name,
                        product_name as name,
                        price,
                        quantity::text as category
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.user_id = $1
                `;
                
                const debugResult = await db.query(debugQuery, [this.currentSellerId]);
                console.log('Available data:', debugResult.rows);
                
                return [];
            }
            
            return result.rows;
        } catch (error) {
            console.error('Error fetching top selling products:', error);
            // Fallback to basic product list if query fails
            return this.sellerData.products.slice(0, 5).map(p => ({
                ...p,
                quantity_sold: 0,
                total_revenue: 0
            }));
        }
    }

    // Generate order history
    generateOrderHistory() {
        const { orders } = this.sellerData;
        
        if (!orders || orders.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📋 Order History</h3>
                </div>
                <div class="summary-section">
                    <p>No orders found in your history.</p>
                </div>
            </div>`;
        }

        // Calculate order statistics
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = totalRevenue / totalOrders;
        const statusBreakdown = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});

        // Get recent orders (last 5)
        const recentOrders = orders.slice(0, 5);

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📋 Your Order History</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>📦 Total Orders</h4>
                    <div class="stats-number">${totalOrders}</div>
                </div>
                <div class="summary-card">
                    <h4>💰 Total Revenue</h4>
                    <div class="stats-number">₹${totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📈 Avg Order Value</h4>
                    <div class="stats-number">₹${avgOrderValue.toFixed(0)}</div>
                </div>
                <div class="summary-card">
                    <h4>📅 Recent Orders</h4>
                    <div class="stats-number">${recentOrders.length}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📊 Order Status Breakdown</h4>
                <div class="insights-grid">
                    ${Object.entries(statusBreakdown).map(([status, count]) => `
                        <div class="insight-item">
                            <span class="insight-label">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                            <span class="insight-value">${count} orders</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📅 Recent Orders (Last 5)</h4>
                <div class="order-list">
                    ${recentOrders.map((order, i) => `
                        <div class="order-item">
                            <span class="order-number">${i + 1}</span>
                            <span class="order-id"><strong>${order.id}</strong></span>
                            <span class="order-customer">${order.customerName}</span>
                            <span class="order-amount">₹${order.total.toLocaleString()}</span>
                            <span class="order-status status-${order.status}">${order.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h4>🔍 How to Access Full Order History</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">📱 Dashboard</span>
                        <span class="insight-value">Click "Order History" in navigation</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">📋 Full Details</span>
                        <span class="insight-value">View, edit, and manage all orders</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">🔧 Actions</span>
                        <span class="insight-value">Add, update, or delete orders</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>You can view your complete order history and manage orders from the Order History page! 📋</p>
            </div>
        </div>`;
    }
}

module.exports = FlipkartSellerAgent; 