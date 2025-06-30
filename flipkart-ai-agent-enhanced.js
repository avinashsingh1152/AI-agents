const axios = require('axios');
require('dotenv').config();

class FlipkartSellerAgentEnhanced {
    constructor(sellerData) {
        this.sellerData = sellerData || {};
        this.userId = null;
        this.db = null;
        this.currentVersion = 'v3.0'; // Enhanced version with Azure OpenAI
        this.azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || 'http://10.83.64.112/gpt-4o/chat/completions';
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-07-01-preview';
        this.versionHistory = {
            'v1.0': {
                name: 'Basic Dashboard',
                features: ['Basic product management', 'Simple order tracking', 'Basic analytics'],
                pricingModel: 'Simple profit margin calculation'
            },
            'v2.0': {
                name: 'Enhanced Analytics Dashboard',
                features: [
                    'Advanced business predictions',
                    'Dynamic inventory analytics',
                    'CSV order processing',
                    'Payment analytics',
                    'AI-powered insights',
                    'Bulk inventory updates',
                    'Real-time stock alerts'
                ],
                pricingModel: 'Advanced pricing with flat sales, profit margins, and dynamic thresholds'
            },
            'v3.0': {
                name: 'Azure OpenAI Enhanced Dashboard',
                features: [
                    'Azure OpenAI GPT-4o integration',
                    'Dynamic AI responses',
                    'Context-aware business insights',
                    'Intelligent inventory recommendations',
                    'Smart order processing',
                    'AI-powered customer support',
                    'Real-time business analytics'
                ],
                pricingModel: 'AI-enhanced pricing with dynamic recommendations'
            }
        };
    }

    // Initialize the agent with user data
    async initialize(userId) {
        this.userId = userId;
        this.db = require('./db');
        this.sellerData = await this.db.getSellerData(userId);
        return this;
    }

    // Set database connection
    setDatabase(db) {
        this.db = db;
        return this;
    }

    // Set user ID
    setUserId(userId) {
        this.userId = userId;
        return this;
    }

    // Check if agent is enabled for the user
    isAgentEnabled() {
        return this.sellerData.agentEnabled !== false;
    }

    // Azure OpenAI API call method
    async callAzureOpenAI(userMessage, context = {}) {
        try {
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            
            if (!OPENAI_API_KEY) {
                console.warn('Azure OpenAI API key not found. Falling back to local processing.');
                return null;
            }

            // Prepare context data for the AI
            const businessContext = this.prepareBusinessContext();
            
            const systemPrompt = `You are an intelligent AI assistant for a Flipkart seller dashboard. You help sellers manage their business by providing insights, recommendations, and assistance with inventory, orders, payments, and analytics.

Current Business Context:
${businessContext}

Your capabilities:
1. Inventory Management: Help with stock updates, low stock alerts, bulk operations
2. Order Management: Process orders, track status, analyze trends
3. Payment Analytics: Monitor payments, handle disputes, track revenue
4. Business Insights: Provide predictions, recommendations, and strategic advice
5. Product Management: Help with product performance, pricing, and optimization

Always provide helpful, actionable responses with specific recommendations when possible. Use emojis and formatting to make responses engaging and easy to read.`;

            const data = {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 1500,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            };

            const response = await axios.post(
                `${this.azureOpenAIEndpoint}?api-version=${this.apiVersion}`,
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': OPENAI_API_KEY
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            if (response.data && response.data.choices && response.data.choices[0]) {
                return response.data.choices[0].message.content;
            } else {
                console.error('Unexpected Azure OpenAI response format:', response.data);
                return null;
            }

        } catch (error) {
            console.error('Azure OpenAI API call failed:', error.message);
            if (error.response) {
                console.error('API Error Details:', error.response.data);
            }
            return null;
        }
    }

    // Prepare business context for AI
    prepareBusinessContext() {
        const products = this.sellerData.products || [];
        const orders = this.sellerData.orders || [];
        const payments = this.sellerData.paymentAnalytics || {};

        // Calculate key metrics
        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;

        return `
Business Overview:
- Total Products: ${products.length}
- Total Orders: ${orders.length}
- Total Revenue: ₹${totalRevenue.toLocaleString()}
- Average Order Value: ₹${Math.round(avgOrderValue).toLocaleString()}
- Low Stock Products: ${lowStockProducts}
- High Profit Products: ${highProfitProducts}

Recent Orders: ${orders.slice(0, 3).map(order => `${order.customer_name}: ₹${parseFloat(order.total).toLocaleString()}`).join(', ')}

Top Products by Stock: ${products.slice(0, 3).map(p => `${p.name} (${p.stock} units)`).join(', ')}

Payment Status: ${payments.completed_payments || 0} completed, ${payments.pending_payments || 0} pending, ${payments.failed_payments || 0} failed
        `.trim();
    }

    // Check stock levels using actual database data
    generateStockReport() {
        const products = this.sellerData.products || [];
        
        if (products.length === 0) {
            return {
                success: true,
                message: "You don't have any products in your inventory yet.",
                responseType: 'stock_report',
                messageCategory: 'inventory',
                aiSource: 'local'
            };
        }

        const lowStockProducts = products.filter(p => (p.stock || 0) < 10);
        const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
        const healthyStockProducts = products.filter(p => (p.stock || 0) >= 10);

        let report = "Here's your current stock levels for all products:\n\n";
        
        // Show products with stock information
        products.forEach((product, index) => {
            const stock = product.stock || 0;
            const stockStatus = stock === 0 ? "Out of stock" : `${stock} units`;
            
            report += `${index + 1}. **${product.name}**\n`;
            report += `   - Stock: ${stockStatus}\n`;
            if (product.price) {
                report += `   - Price: ₹${product.price.toLocaleString()}\n`;
            }
            report += "\n";
        });

        // Add recommendations
        if (lowStockProducts.length > 0) {
            report += `\n⚠️ **Low Stock Alert:** ${lowStockProducts.length} products need attention:\n`;
            lowStockProducts.forEach(product => {
                report += `- ${product.name}: ${product.stock || 0} units\n`;
            });
        }

        if (outOfStockProducts.length > 0) {
            report += `\n🚨 **Out of Stock:** ${outOfStockProducts.length} products:\n`;
            outOfStockProducts.forEach(product => {
                report += `- ${product.name}\n`;
            });
        }

        if (healthyStockProducts.length > 0) {
            report += `\n✅ **Healthy Stock:** ${healthyStockProducts.length} products have good stock levels.\n`;
        }

        report += "\nWould you like to update any stock levels or get more detailed insights? 📦";

        return {
            success: true,
            message: report,
            responseType: 'stock_report',
            messageCategory: 'inventory',
            aiSource: 'local'
        };
    }

    // Generate product listing using actual database data
    generateProductListing() {
        const products = this.sellerData.products || [];
        
        if (products.length === 0) {
            return {
                success: true,
                message: "You don't have any products in your inventory yet. Would you like to add some products?",
                responseType: 'product_listing',
                messageCategory: 'products',
                aiSource: 'local'
            };
        }

        let productList = "Here are all the products currently listed in your inventory:\n\n";
        
        products.forEach((product, index) => {
            const stock = product.stock || 0;
            const price = product.price || 0;
            const stockStatus = stock > 0 ? `${stock} units` : "Out of stock";
            
            productList += `${index + 1}. **${product.name}**\n`;
            productList += `   - Stock: ${stockStatus}\n`;
            productList += `   - Price: ₹${price.toLocaleString()}\n`;
            if (product.category) {
                productList += `   - Category: ${product.category}\n`;
            }
            productList += "\n";
        });

        productList += "Would you like to update any stock levels, or need more information on any specific product? 📦";

        return {
            success: true,
            message: productList,
            responseType: 'product_listing',
            messageCategory: 'products',
            aiSource: 'local'
        };
    }

    // Enhanced message handler with Azure OpenAI integration
    async handleMessage(message, requestInfo = {}) {
        const lowerMessage = message.toLowerCase();
        
        // Handle specific product listing requests with actual data
        if (lowerMessage.includes('show me all products') || 
            lowerMessage.includes('list all products') || 
            lowerMessage.includes('what products do i have') ||
            lowerMessage.includes('my products')) {
            return this.generateProductListing();
        }
        
        // Handle stock checking requests with actual data
        if (lowerMessage.includes('check stock') || 
            lowerMessage.includes('stock levels') || 
            lowerMessage.includes('inventory status') ||
            lowerMessage.includes('stock report')) {
            return this.generateStockReport();
        }
        
        // First, try to handle with Azure OpenAI for complex queries
        const aiResponse = await this.callAzureOpenAI(message, requestInfo);
        
        if (aiResponse) {
            // Log the AI interaction
            await this.logAIInteraction(message, aiResponse, 'azure_openai');
            
            return {
                success: true,
                message: aiResponse,
                responseType: 'ai_enhanced',
                messageCategory: 'ai_response',
                aiSource: 'azure_openai'
            };
        }

        // Fallback to local processing for specific commands and structured queries
        return await this.handleMessageLocal(message, requestInfo);
    }

    // Local message handler (fallback)
    async handleMessageLocal(message, requestInfo = {}) {
        const lowerMessage = message.toLowerCase();
        
        // Handle specific business operations that require local processing
        if (lowerMessage.match(/(update.*stock|set.*inventory|change.*stock|inventory.*update|stock.*update)/)) {
            return await this.handleInventoryUpdate(message);
        }

        if (lowerMessage.includes('process csv') || lowerMessage.includes('upload csv')) {
            return await this.handleCSVOrderProcessing();
        }

        if (lowerMessage.match(/(business.*summary|summary|overview|dashboard|stats|statistics|analytics)/)) {
            return this.generateBusinessSummary();
        }

        // For other queries, try Azure OpenAI again with a simpler prompt
        const simpleAIResponse = await this.callAzureOpenAI(message, { simple: true });
        
        if (simpleAIResponse) {
            await this.logAIInteraction(message, simpleAIResponse, 'azure_openai_simple');
            
            return {
                success: true,
                message: simpleAIResponse,
                responseType: 'ai_enhanced',
                messageCategory: 'ai_response',
                aiSource: 'azure_openai_simple'
            };
        }

        // Final fallback to basic response
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>🤖 AI Assistant</h3></div><div class="summary-section"><p>I'm here to help you with your Flipkart seller business! I can assist with:</p><ul><li>📦 Inventory management and stock updates</li><li>📋 Order processing and tracking</li><li>💳 Payment analytics and disputes</li><li>📊 Business insights and predictions</li><li>🛍️ Product performance analysis</li></ul><p><strong>Try asking:</strong> "How can I improve my inventory management?" or "What are my best performing products?"</p></div><div class="summary-footer"><p>💡 I'm powered by Azure OpenAI for intelligent responses! 🚀</p></div></div>`,
            responseType: 'ai_fallback',
            messageCategory: 'general',
            aiSource: 'local_fallback'
        };
    }

    // Handle inventory update with AI enhancement
    async handleInventoryUpdate(message) {
        const updateInfo = this.parseInventoryUpdate(message);
        
        if (updateInfo) {
            const product = this.findProductByName(updateInfo.productName);
            
            if (product) {
                const updateResult = await this.updateProductInventory(product.id, updateInfo.newStock);
                
                if (updateResult.success) {
                    // Get AI insights about this inventory change
                    const aiInsight = await this.callAzureOpenAI(
                        `I just updated ${product.name} stock from ${product.stock} to ${updateInfo.newStock} units. What insights or recommendations do you have about this inventory change?`,
                        { context: 'inventory_update' }
                    );

                    let responseMessage = `<div class="ai-summary-container"><div class="summary-header"><h3>✅ Inventory Updated Successfully</h3></div><div class="summary-section"><h4>📦 Product Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Previous Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">New Stock</span><span class="insight-value">${updateInfo.newStock} units</span></div><div class="insight-item"><span class="insight-label">Change</span><span class="insight-value">${updateInfo.newStock - product.stock > 0 ? '+' : ''}${updateInfo.newStock - product.stock} units</span></div></div></div>`;

                    if (aiInsight) {
                        responseMessage += `<div class="summary-section"><h4>🤖 AI Insights</h4><p>${aiInsight}</p></div>`;
                    }

                    responseMessage += `<div class="summary-footer"><p>✅ ${updateResult.message}</p></div></div>`;

                    return {
                        success: true,
                        message: responseMessage,
                        responseType: 'inventory_update_ai',
                        messageCategory: 'inventory',
                        aiSource: aiInsight ? 'azure_openai' : 'local'
                    };
                }
            }
        }

        return {
            success: false,
            message: 'Failed to update inventory. Please check the product name and try again.',
            responseType: 'inventory_update_error',
            messageCategory: 'inventory'
        };
    }

    // Handle CSV order processing with AI enhancement
    async handleCSVOrderProcessing() {
        // This would typically process CSV data
        // For now, return AI-enhanced response
        const aiResponse = await this.callAzureOpenAI(
            'How can I help with CSV order processing? What are the best practices for bulk order management?',
            { context: 'csv_processing' }
        );

        return {
            success: true,
            message: aiResponse || 'CSV order processing feature is available. Please upload your CSV file.',
            responseType: 'csv_processing_ai',
            messageCategory: 'orders',
            aiSource: aiResponse ? 'azure_openai' : 'local'
        };
    }

    // Generate business summary with AI enhancement
    generateBusinessSummary() {
        const products = this.sellerData.products || [];
        const orders = this.sellerData.orders || [];
        
        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📊 Business Summary (AI Enhanced)</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Total Revenue</h4><div class="stats-number">₹${totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>📦 Total Orders</h4><div class="stats-number">${orders.length}</div></div><div class="summary-card"><h4>📈 Avg Order Value</h4><div class="stats-number">₹${Math.round(avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>🛍️ Total Products</h4><div class="stats-number">${products.length}</div></div></div><div class="summary-section"><h4>⚠️ Alerts</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Low Stock Items</span><span class="insight-value">${lowStockProducts} products (below 10 units)</span></div><div class="insight-item"><span class="insight-label">High Profit Products</span><span class="insight-value">${highProfitProducts} products (>20% margin)</span></div></div></div><div class="summary-footer"><p>💡 Ask me for AI-powered insights and recommendations! 🤖</p></div></div>`,
            responseType: 'business_summary_ai',
            messageCategory: 'analytics',
            aiSource: 'local_enhanced'
        };
    }

    // Parse inventory update command
    parseInventoryUpdate(message) {
        const patterns = [
            /update\s+(.+?)\s+stock\s+to\s+(\d+)/i,
            /set\s+(.+?)\s+inventory\s+to\s+(\d+)/i,
            /change\s+(.+?)\s+stock\s+to\s+(\d+)/i,
            /(.+?)\s+stock\s+(\d+)/i,
            /inventory\s+(.+?)\s+(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return {
                    productName: match[1].trim(),
                    newStock: parseInt(match[2])
                };
            }
        }
        return null;
    }

    // Find product by name
    findProductByName(productName) {
        const products = this.sellerData.products || [];
        const lowerProductName = productName.toLowerCase();
        
        let product = products.find(p => p.name.toLowerCase() === lowerProductName);
        if (product) return product;
        
        product = products.find(p => p.name.toLowerCase().includes(lowerProductName) || 
                                   lowerProductName.includes(p.name.toLowerCase()));
        if (product) return product;
        
        return products.find(p => {
            const pName = p.name.toLowerCase();
            const similarity = this.calculateSimilarity(pName, lowerProductName);
            return similarity > 0.7;
        });
    }

    // Calculate string similarity
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    // Levenshtein distance for fuzzy matching
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    // Update product inventory
    async updateProductInventory(productId, newStock) {
        try {
            const result = await this.db.updateProduct(this.userId, productId, { stock: newStock });
            return { success: true, message: `Inventory updated successfully to ${newStock} units` };
        } catch (error) {
            console.error('Error updating inventory:', error);
            return { success: false, message: 'Failed to update inventory' };
        }
    }

    // Log AI interactions
    async logAIInteraction(userMessage, aiResponse, aiSource) {
        try {
            await this.db.insertChatLog({
                seller_id: this.userId,
                user_message: userMessage,
                ai_response: aiResponse,
                response_type: 'ai_enhanced',
                message_category: 'ai_response',
                processing_time_ms: 0, // Will be calculated if needed
                success: true,
                ai_source: aiSource
            });
        } catch (error) {
            console.error('Error logging AI interaction:', error);
        }
    }
}

module.exports = FlipkartSellerAgentEnhanced; 