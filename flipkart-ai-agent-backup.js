class FlipkartSellerAgent {
    constructor(sellerData) {
        this.sellerData = sellerData || {};
        this.userId = null;
        this.db = null;
        this.currentVersion = 'v2.0'; // Current dashboard version
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

    // Check if agent is enabled for the user
    isAgentEnabled() {
        return this.sellerData.agentEnabled !== false;
    }

    // Generate business prediction greeting
    generateBusinessPrediction() {
        const salesData = this.analyzeSalesTrends();
        const paymentData = this.analyzePaymentTrends();
        const productInsights = this.analyzeProductPerformance();
        
        // Handle NaN values
        const salesPrediction = isNaN(salesData.projectedRevenue) ? '₹0' : `₹${salesData.projectedRevenue.toLocaleString()}`;
        const paymentStatus = isNaN(paymentData.successRate) ? '0%' : `${paymentData.successRate.toFixed(1)}%`;
        const topProduct = salesData.topCategory || 'N/A';
        const recommendation = this.generateStrategicRecommendations(salesData, paymentData, productInsights);
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>🔮 Business Predictions & Insights</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Revenue Prediction</h4><div class="stats-number">${salesPrediction}</div></div><div class="summary-card"><h4>💳 Payment Success</h4><div class="stats-number">${paymentStatus}</div></div><div class="summary-card"><h4>🏆 Top Category</h4><div class="stats-number">${topProduct}</div></div><div class="summary-card"><h4>📈 Growth Rate</h4><div class="stats-number">${isNaN(salesData.growthRate) ? '0%' : salesData.growthRate.toFixed(1) + '%'}</div></div></div><div class="summary-section"><h4>💡 Strategic Recommendations</h4><ul>${recommendation}</ul></div><div class="summary-footer"><p>Use these insights to optimize your business strategy! 🚀</p></div></div>`,
            responseType: 'business_prediction',
            messageCategory: 'analytics'
        };
    }

    // Analyze sales trends and patterns
    analyzeSalesTrends() {
        const orders = this.sellerData.orders || [];
        const products = this.sellerData.products || [];
        
        if (orders.length === 0) {
            return {
                projectedRevenue: 0,
                projectedOrders: 0,
                growthRate: 0,
                topCategory: 'N/A'
            };
        }

        // Calculate total revenue - ensure totals are parsed as numbers
        const totalRevenue = orders.reduce((sum, order) => {
            const orderTotal = parseFloat(order.total) || 0;
            return sum + orderTotal;
        }, 0);
        
        // Calculate average monthly revenue (assuming 30 days of data)
        const avgMonthlyRevenue = totalRevenue / 1; // Since all orders are from one month
        
        // Calculate growth rate by comparing recent vs older orders
        // Orders are sorted newest first, so first 10 are recent, last 10 are older
        const recentCount = Math.min(10, Math.floor(orders.length / 2));
        const olderCount = Math.min(10, Math.floor(orders.length / 2));
        
        const recentOrders = orders.slice(0, recentCount);
        const olderOrders = orders.slice(-olderCount);
        
        const recentRevenue = recentOrders.reduce((sum, order) => {
            const orderTotal = parseFloat(order.total) || 0;
            return sum + orderTotal;
        }, 0);
        
        const olderRevenue = olderOrders.reduce((sum, order) => {
            const orderTotal = parseFloat(order.total) || 0;
            return sum + orderTotal;
        }, 0);
        
        // Calculate growth rate
        const growthRate = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;
        
        // Project next month revenue (more realistic projection)
        const projectedRevenue = avgMonthlyRevenue * (1 + (growthRate / 100));
        const projectedOrders = Math.round(orders.length * (1 + (growthRate / 100)));
        
        // Find top category
        const categorySales = {};
        products.forEach(product => {
            if (product.category && product.units_sold) {
                categorySales[product.category] = (categorySales[product.category] || 0) + product.units_sold;
            }
        });
        
        const topCategory = Object.keys(categorySales).reduce((a, b) => 
            categorySales[a] > categorySales[b] ? a : b, 'N/A');

        return {
            projectedRevenue: Math.round(projectedRevenue),
            projectedOrders,
            growthRate,
            topCategory
        };
    }

    // Analyze payment trends
    analyzePaymentTrends() {
        const payments = this.sellerData.paymentAnalytics || {};
        
        if (!payments.total_payments || payments.total_payments === 0) {
            return {
                projectedPayments: 0,
                successRate: 0,
                pendingAmount: 0,
                avgProcessingDays: 0
            };
        }

        const totalAmount = parseFloat(payments.total_amount) || 0;
        const completedPayments = parseInt(payments.completed_payments) || 0;
        const totalPayments = parseInt(payments.total_payments) || 1;
        const pendingPayments = parseInt(payments.pending_payments) || 0;
        
        // Calculate success rate
        const successRate = (completedPayments / totalPayments) * 100;
        
        // Estimate pending amount (assuming average payment amount)
        const avgPaymentAmount = totalAmount / totalPayments;
        const pendingAmount = pendingPayments * avgPaymentAmount;
        
        // Project next month payments (based on success rate and growth)
        const projectedPayments = totalAmount * (1 + (successRate / 100) * 0.1);
        
        // Estimate processing time (simplified)
        const avgProcessingDays = successRate > 80 ? 2 : successRate > 60 ? 5 : 7;

        return {
            projectedPayments: Math.round(projectedPayments),
            successRate,
            pendingAmount: Math.round(pendingAmount),
            avgProcessingDays
        };
    }

    // Analyze product performance
    analyzeProductPerformance() {
        const products = this.sellerData.products || [];
        
        if (products.length === 0) {
            return {
                lowStockProducts: 0,
                highProfitProducts: 0,
                trendingProducts: [],
                restockRecommendations: []
            };
        }

        // Calculate dynamic thresholds based on actual data
        const avgStock = products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length;
        const lowStockThreshold = Math.max(5, Math.round(avgStock * 0.1)); // 10% of average stock, minimum 5
        
        const profitMargins = products.map(p => p.profit_margin || 0).filter(p => !isNaN(p));
        const avgProfitMargin = profitMargins.length > 0 ? profitMargins.reduce((sum, p) => sum + p, 0) / profitMargins.length : 0;
        const highProfitThreshold = Math.max(20, avgProfitMargin + 10); // Above average + 10%, minimum 20%
        
        const avgUnitsSold = products.reduce((sum, p) => sum + (p.units_sold || 0), 0) / products.length;
        const trendingThreshold = Math.max(50, Math.round(avgUnitsSold * 0.5)); // 50% of average sales, minimum 50

        const lowStockProducts = products.filter(p => (p.stock || 0) < lowStockThreshold).length;
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > highProfitThreshold).length;
        
        // Find trending products (high sales velocity)
        const trendingProducts = products
            .filter(p => (p.units_sold || 0) > trendingThreshold)
            .sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0))
            .slice(0, 3)
            .map(p => p.name);

        // Restock recommendations
        const restockRecommendations = products
            .filter(p => (p.stock || 0) < lowStockThreshold * 2 && (p.units_sold || 0) > trendingThreshold * 0.5)
            .map(p => p.name);

        return {
            lowStockProducts,
            highProfitProducts,
            trendingProducts,
            restockRecommendations,
            lowStockThreshold,
            highProfitThreshold,
            trendingThreshold
        };
    }

    // Ask seller for default values when agent is confused
    askSellerForDefaults(question, options = []) {
        const optionsHtml = options.length > 0 ? 
            `<div class="options-list">${options.map(opt => `<div class="option-item">• ${opt}</div>`).join('')}</div>` : '';
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>❓ Need Your Input</h3></div><div class="summary-section"><h4>${question}</h4>${optionsHtml}<p><strong>Please provide your preference so I can give you accurate insights.</strong></p></div><div class="summary-footer"><p>💡 You can ask me again after providing this information.</p></div></div>`,
            responseType: 'seller_input_needed',
            messageCategory: 'query'
        };
    }

    // Generate strategic recommendations
    generateStrategicRecommendations(salesData, paymentData, productInsights) {
        const recommendations = [];
        
        // Sales recommendations
        if (salesData.growthRate < 5) {
            recommendations.push('📈 <strong>Focus on growth:</strong> Consider promotional campaigns or new product launches');
        }
        
        if (salesData.growthRate > 20) {
            recommendations.push('🚀 <strong>Scale up:</strong> Your business is growing fast - consider expanding inventory');
        }
        
        // Payment recommendations
        if (paymentData.successRate < 80) {
            recommendations.push('💳 <strong>Payment optimization:</strong> Review payment methods to improve success rate');
        }
        
        if (paymentData.pendingAmount > salesData.projectedRevenue * 0.3) {
            recommendations.push('⏰ <strong>Follow up:</strong> High pending payments - consider payment reminders');
        }
        
        // Product recommendations
        if (productInsights.lowStockProducts > 0) {
            recommendations.push(`📦 <strong>Restock needed:</strong> ${productInsights.lowStockProducts} products need immediate restocking (below ${productInsights.lowStockThreshold} units)`);
        }
        
        if (productInsights.trendingProducts.length > 0) {
            recommendations.push(`🔥 <strong>Trending products:</strong> Focus on ${productInsights.trendingProducts.join(', ')}`);
        }
        
        if (productInsights.highProfitProducts > 0) {
            recommendations.push(`💎 <strong>High margin products:</strong> ${productInsights.highProfitProducts} products with >${productInsights.highProfitThreshold.toFixed(1)}% profit margin`);
        }
        
        // Default recommendation if none generated
        if (recommendations.length === 0) {
            recommendations.push('✅ <strong>Business is healthy:</strong> Continue with current strategies');
        }
        
        return recommendations.map(rec => `<li>${rec}</li>`).join('');
    }

    // Generate welcome greeting with prediction
    generateWelcomeGreeting() {
        const prediction = this.generateBusinessPrediction();
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>🚀 Welcome Back!</h3></div><div class="summary-section"><h4>📊 Quick Insights</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Today's Prediction</span><span class="insight-value">${prediction.salesPrediction}</span></div><div class="insight-item"><span class="insight-label">Payment Status</span><span class="insight-value">${prediction.paymentStatus}</span></div><div class="insight-item"><span class="insight-label">Top Product</span><span class="insight-value">${prediction.topProduct}</span></div><div class="insight-item"><span class="insight-label">Recommendation</span><span class="insight-value">${prediction.recommendation}</span></div></div></div><div class="summary-section"><h4>💡 Quick Actions</h4><div class="suggestion-chips"><button class="suggestion-chip" onclick="sendMessage('Update my inventory')">📦 Update Inventory</button><button class="suggestion-chip" onclick="sendMessage('Share the updated latest inventory stock')">📊 Inventory Overview</button><button class="suggestion-chip" onclick="sendMessage('Give me a sales, GMV, and number of orders trend of my order')">📈 Sales Trends</button><button class="suggestion-chip" onclick="sendMessage('Process the following 10 orders via upload csv')">📄 Process CSV Orders</button><button class="suggestion-chip" onclick="sendMessage('Show me all products')">🛍️ View Products</button><button class="suggestion-chip" onclick="sendMessage('What is my business summary?')">📋 Business Summary</button></div></div><div class="summary-footer"><p>Ready to boost your business? Let's get started! 💪</p></div></div>`,
            responseType: 'welcome_greeting',
            messageCategory: 'greeting'
        };
    }

    // Parse inventory update command
    parseInventoryUpdate(message) {
        const patterns = [
            // Pattern: "update [product] stock to [number]"
            /update\s+(.+?)\s+stock\s+to\s+(\d+)/i,
            // Pattern: "set [product] inventory to [number]"
            /set\s+(.+?)\s+inventory\s+to\s+(\d+)/i,
            // Pattern: "change [product] stock to [number]"
            /change\s+(.+?)\s+stock\s+to\s+(\d+)/i,
            // Pattern: "[product] stock [number]"
            /(.+?)\s+stock\s+(\d+)/i,
            // Pattern: "inventory [product] [number]"
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

    // Parse bulk inventory update command
    parseBulkInventoryUpdate(message) {
        const patterns = [
            // Pattern: "update all [category] stock to [number]"
            /update\s+all\s+(.+?)\s+stock\s+to\s+(\d+)/i,
            // Pattern: "set all [category] inventory to [number]"
            /set\s+all\s+(.+?)\s+inventory\s+to\s+(\d+)/i,
            // Pattern: "restock all [category] to [number]"
            /restock\s+all\s+(.+?)\s+to\s+(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return {
                    category: match[1].trim(),
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
        
        // Exact match first
        let product = products.find(p => p.name.toLowerCase() === lowerProductName);
        if (product) return product;
        
        // Partial match
        product = products.find(p => p.name.toLowerCase().includes(lowerProductName) || 
                                   lowerProductName.includes(p.name.toLowerCase()));
        if (product) return product;
        
        // Fuzzy match
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

    // Update bulk inventory by category
    async updateBulkInventory(category, newStock) {
        try {
            const products = this.sellerData.products || [];
            const categoryProducts = products.filter(p => 
                p.category && p.category.toLowerCase().includes(category.toLowerCase())
            );
            
            if (categoryProducts.length === 0) {
                return { 
                    success: false, 
                    message: `No products found in category: ${category}`,
                    updatedCount: 0
                };
            }

            let updatedCount = 0;
            for (const product of categoryProducts) {
                try {
                    await this.db.updateProduct(this.userId, product.id, { stock: newStock });
                    updatedCount++;
                } catch (error) {
                    console.error(`Error updating product ${product.id}:`, error);
                }
            }

            return { 
                success: true, 
                message: `Updated ${updatedCount} products in ${category} category to ${newStock} units each`,
                updatedCount
            };
        } catch (error) {
            console.error('Error updating bulk inventory:', error);
            return { success: false, message: 'Failed to update bulk inventory' };
        }
    }

    // Generate inventory analytics
    generateInventoryAnalytics() {
        const products = this.sellerData.products || [];
        
        if (products.length === 0) {
            return {
                totalProducts: 0,
                totalStock: 0,
                lowStockProducts: 0,
                outOfStockProducts: 0,
                categoryBreakdown: {},
                stockDistribution: {
                    low: 0,
                    medium: 0,
                    high: 0
                }
            };
        }

        // Calculate dynamic thresholds
        const avgStock = products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length;
        const lowStockThreshold = Math.max(5, Math.round(avgStock * 0.1)); // 10% of average stock, minimum 5
        const mediumStockThreshold = lowStockThreshold * 10; // 10x low threshold for medium

        const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const lowStockProducts = products.filter(p => (p.stock || 0) < lowStockThreshold).length;
        const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length;
        
        // Category breakdown
        const categoryBreakdown = {};
        products.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!categoryBreakdown[category]) {
                categoryBreakdown[category] = {
                    count: 0,
                    totalStock: 0,
                    avgStock: 0
                };
            }
            categoryBreakdown[category].count++;
            categoryBreakdown[category].totalStock += product.stock || 0;
        });

        // Calculate average stock per category
        Object.keys(categoryBreakdown).forEach(category => {
            categoryBreakdown[category].avgStock = Math.round(
                categoryBreakdown[category].totalStock / categoryBreakdown[category].count
            );
        });

        // Stock distribution using dynamic thresholds
        const stockDistribution = {
            low: products.filter(p => (p.stock || 0) < lowStockThreshold).length,
            medium: products.filter(p => (p.stock || 0) >= lowStockThreshold && (p.stock || 0) < mediumStockThreshold).length,
            high: products.filter(p => (p.stock || 0) >= mediumStockThreshold).length
        };

        return {
            totalProducts: products.length,
            totalStock,
            lowStockProducts,
            outOfStockProducts,
            categoryBreakdown,
            stockDistribution,
            lowStockThreshold,
            mediumStockThreshold
        };
    }

    // Generate comprehensive inventory overview
    generateInventoryOverview() {
        const products = this.sellerData.products || [];
        
        if (products.length === 0) {
            return {
                totalProducts: 0,
                totalStock: 0,
                totalValue: 0,
                lowStockProducts: [],
                outOfStockProducts: [],
                categorySummary: {},
                stockAlerts: []
            };
        }

        const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
        
        // Calculate dynamic low stock threshold
        const avgStock = products.reduce((sum, p) => sum + (p.stock || 0), 0) / products.length;
        const lowStockThreshold = Math.max(5, Math.round(avgStock * 0.1)); // 10% of average stock, minimum 5
        
        const lowStockProducts = products.filter(p => (p.stock || 0) < lowStockThreshold && (p.stock || 0) > 0);
        const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
        
        // Category summary
        const categorySummary = {};
        products.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!categorySummary[category]) {
                categorySummary[category] = {
                    count: 0,
                    totalStock: 0,
                    totalValue: 0,
                    avgPrice: 0
                };
            }
            categorySummary[category].count++;
            categorySummary[category].totalStock += product.stock || 0;
            categorySummary[category].totalValue += (product.stock || 0) * (product.price || 0);
        });

        // Calculate average price per category
        Object.keys(categorySummary).forEach(category => {
            categorySummary[category].avgPrice = Math.round(
                categorySummary[category].totalValue / categorySummary[category].totalStock
            );
        });

        // Generate stock alerts
        const stockAlerts = [];
        if (outOfStockProducts.length > 0) {
            stockAlerts.push(`🚨 ${outOfStockProducts.length} products are out of stock`);
        }
        if (lowStockProducts.length > 0) {
            stockAlerts.push(`⚠️ ${lowStockProducts.length} products have low stock (< ${lowStockThreshold} units)`);
        }
        if (stockAlerts.length === 0) {
            stockAlerts.push('✅ All products have sufficient stock');
        }

        return {
            totalProducts: products.length,
            totalStock,
            totalValue,
            lowStockProducts,
            outOfStockProducts,
            categorySummary,
            stockAlerts,
            lowStockThreshold
        };
    }

    // Generate sales trends analysis
    generateSalesTrends() {
        const orders = this.sellerData.orders || [];
        const products = this.sellerData.products || [];
        
        if (orders.length === 0) {
            return {
                totalOrders: 0,
                totalGMV: 0,
                totalSales: 0,
                avgOrderValue: 0,
                orderTrends: [],
                gmvTrends: [],
                salesTrends: [],
                topProducts: [],
                categoryPerformance: {}
            };
        }

        const totalOrders = orders.length;
        const totalGMV = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Calculate trends (last 7 days vs previous 7 days)
        const now = new Date();
        const last7Days = orders.filter(order => {
            const orderDate = new Date(order.order_date || order.created_at);
            return (now - orderDate) <= 7 * 24 * 60 * 60 * 1000;
        });
        const previous7Days = orders.filter(order => {
            const orderDate = new Date(order.order_date || order.created_at);
            const daysDiff = (now - orderDate) / (24 * 60 * 60 * 1000);
            return daysDiff > 7 && daysDiff <= 14;
        });

        const last7DaysGMV = last7Days.reduce((sum, order) => sum + (order.total || 0), 0);
        const previous7DaysGMV = previous7Days.reduce((sum, order) => sum + (order.total || 0), 0);
        const gmvGrowth = previous7DaysGMV > 0 ? ((last7DaysGMV - previous7DaysGMV) / previous7DaysGMV) * 100 : 0;

        const last7DaysOrders = last7Days.length;
        const previous7DaysOrders = previous7Days.length;
        const orderGrowth = previous7DaysOrders > 0 ? ((last7DaysOrders - previous7DaysOrders) / previous7DaysOrders) * 100 : 0;

        // Top performing products
        const productSales = {};
        orders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    if (!productSales[item.product_name]) {
                        productSales[item.product_name] = { quantity: 0, revenue: 0 };
                    }
                    productSales[item.product_name].quantity += item.quantity || 1;
                    productSales[item.product_name].revenue += (item.price || 0) * (item.quantity || 1);
                });
            }
        });

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)
            .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: data.revenue
            }));

        // Category performance
        const categoryPerformance = {};
        products.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!categoryPerformance[category]) {
                categoryPerformance[category] = {
                    products: 0,
                    totalStock: 0,
                    totalValue: 0,
                    avgPrice: 0
                };
            }
            categoryPerformance[category].products++;
            categoryPerformance[category].totalStock += product.stock || 0;
            categoryPerformance[category].totalValue += (product.stock || 0) * (product.price || 0);
        });

        Object.keys(categoryPerformance).forEach(category => {
            categoryPerformance[category].avgPrice = Math.round(
                categoryPerformance[category].totalValue / categoryPerformance[category].totalStock
            );
        });

        return {
            totalOrders,
            totalGMV,
            totalSales,
            avgOrderValue,
            last7DaysGMV,
            previous7DaysGMV,
            gmvGrowth,
            last7DaysOrders,
            previous7DaysOrders,
            orderGrowth,
            topProducts,
            categoryPerformance
        };
    }

    // Process CSV orders
    async processCSVOrders(csvData) {
        try {
            if (!csvData || typeof csvData !== 'string') {
                return {
                    success: false,
                    message: 'Invalid CSV data provided. Please check the file format.'
                };
            }

            // Parse CSV data
            const lines = csvData.trim().split('\n');
            if (lines.length < 2) {
                return {
                    success: false,
                    message: 'CSV file is empty or has insufficient data. Please check the file.'
                };
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const orders = [];
            
            // Validate headers
            const requiredHeaders = ['order_id', 'customer_name', 'product_name', 'quantity', 'unit_price', 'total_amount', 'order_date', 'status'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                return {
                    success: false,
                    message: `Invalid CSV format. Missing required headers: ${missingHeaders.join(', ')}. Please use the demo CSV format.`
                };
            }
            
            // Parse each line
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                try {
                    const values = line.split(',').map(v => v.trim());
                    if (values.length !== headers.length) continue;
                    
                    const order = {};
                    headers.forEach((header, index) => {
                        order[header] = values[index];
                    });
                    
                    orders.push(order);
                } catch (lineError) {
                    console.error(`Error parsing line ${i + 1}:`, lineError);
                    continue;
                }
            }
            
            if (orders.length === 0) {
                return {
                    success: false,
                    message: 'No valid orders found in the CSV file. Please check the format.'
                };
            }
            
            // Calculate summary
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
            const totalItems = orders.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0);
            const avgOrderValue = totalRevenue / totalOrders;
            
            // Group by product
            const productSales = {};
            orders.forEach(order => {
                const productName = order.product_name;
                if (!productSales[productName]) {
                    productSales[productName] = { quantity: 0, revenue: 0 };
                }
                productSales[productName].quantity += parseInt(order.quantity) || 0;
                productSales[productName].revenue += parseFloat(order.total_amount) || 0;
            });
            
            // Find top products
            const topProducts = Object.entries(productSales)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 3)
                .map(([name, data]) => ({ name, revenue: data.revenue, quantity: data.quantity }));
            
            // Create summary message
            const summaryMessage = `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📁 CSV Orders Processed Successfully</h3>
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
                        <h4>📊 Total Items</h4>
                        <div class="stats-number">${totalItems}</div>
                    </div>
                    <div class="summary-card">
                        <h4>📈 Avg Order Value</h4>
                        <div class="stats-number">₹${avgOrderValue.toFixed(0)}</div>
                    </div>
                </div>
                <div class="summary-section">
                    <h4>🏆 Top Products by Revenue</h4>
                    <div class="insights-grid">
                        ${topProducts.map(product => `
                            <div class="insight-item">
                                <span class="insight-label">${product.name}</span>
                                <span class="insight-value">₹${product.revenue.toLocaleString()} (${product.quantity} units)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="summary-section">
                    <h4>📋 Sample Orders (${orders.length} total)</h4>
                    <div class="order-list">
                        ${orders.slice(0, 3).map(order => `
                            <div class="order-item">
                                <span class="order-id">${order.order_id}</span>
                                <span class="customer-name">${order.customer_name}</span>
                                <span class="product-name">${order.product_name}</span>
                                <span class="quantity">${order.quantity}</span>
                                <span class="total">₹${parseFloat(order.total_amount).toLocaleString()}</span>
                            </div>
                        `).join('')}
                        ${orders.length > 3 ? `<div class="order-item-more">... and ${orders.length - 3} more orders</div>` : ''}
                    </div>
                </div>
                <div class="summary-footer">
                    <p>✅ Successfully processed ${totalOrders} orders from CSV file!</p>
                </div>
            </div>`;
            
            return {
                success: true,
                processedOrders: totalOrders,
                totalRevenue,
                totalItems,
                avgOrderValue,
                topProducts,
                orders,
                message: summaryMessage
            };
        } catch (error) {
            console.error('Error processing CSV orders:', error);
            return {
                success: false,
                message: `Failed to process CSV orders: ${error.message}. Please check the file format and try again.`,
                error: error.message
            };
        }
    }

    async handleMessage(message, requestInfo = {}) {
        const lowerMessage = message.toLowerCase();
        
        // ===== NEW: BROADCAST & CHANGE QUERIES =====
        // Check if seller is asking about changes or updates
        const changeResponse = this.handleBroadcastAndChanges(message);
        if (changeResponse) {
            return changeResponse;
        }
        
        // ===== NEW: Handle version and pricing queries first =====
        const versionResponse = this.handleVersionQueries(message);
        if (versionResponse) {
            return versionResponse;
        }
        
        // ===== NEW: Handle "How do I..." and "What is..." questions =====
        if (lowerMessage.match(/(how.*do.*i|how.*to|what.*is|what.*does|how.*can.*i|how.*should.*i)/)) {
            return this.handleFeatureExplanation(message);
        }
        
        // ===== NEW: Handle proactive update announcements =====
        if (requestInfo.updateData) {
            return this.generateUpdateAnnouncement(requestInfo.updateData);
        }
        
        // Handle inventory update commands
        if (lowerMessage.includes('update inventory') || lowerMessage.includes('update stock')) {
            return this.handleInventoryUpdate(message);
        }

        // Handle inventory overview requests
        if (lowerMessage.includes('inventory stock') || lowerMessage.includes('latest inventory') || 
            lowerMessage.includes('stock overview') || lowerMessage.includes('inventory status')) {
            return this.handleInventoryOverview();
        }

        // Handle sales trends requests
        if (lowerMessage.includes('sales trend') || lowerMessage.includes('gmv trend') || 
            lowerMessage.includes('order trend') || lowerMessage.includes('sales gmv orders')) {
            return this.handleSalesTrends();
        }

        // Handle CSV order processing
        if (lowerMessage.includes('process csv') || lowerMessage.includes('upload csv') || 
            lowerMessage.includes('csv orders')) {
            return this.handleCSVOrderProcessing();
        }

        // Handle bulk inventory updates
        if (lowerMessage.includes('bulk update') || lowerMessage.includes('update multiple')) {
            return this.handleBulkInventoryUpdate(message);
        }

        // Handle inventory analytics
        if (lowerMessage.includes('inventory analytics') || lowerMessage.includes('stock analytics')) {
            return this.handleInventoryAnalytics();
        }

        // Handle order management
        if (lowerMessage.match(/(order|orders|order.*status|order.*history|order.*list|my.*orders|all.*orders|order.*analytics|order.*summary|order.*details|order.*management)/)) {
            return this.handleOrderManagement(message);
        }

        // Handle business summary queries
        if (lowerMessage.match(/(business.*summary|business.*overview|business.*stats|business.*statistics|my.*business|business.*summary|summary|overview)/)) {
            return this.generateBusinessSummary();
        }

        // Handle low stock alerts
        if (lowerMessage.match(/(low.*stock|stock.*alert|low.*inventory|inventory.*alert|stock.*warning|low.*stock.*alert|stock.*alerts)/)) {
            return this.generateLowStockAlerts();
        }

        // Handle high profit products
        if (lowerMessage.match(/(high.*profit|profit.*products|high.*margin|margin.*products|profitable.*products|best.*profit|top.*profit)/)) {
            return this.generateHighProfitProducts();
        }

        // Handle product-specific queries
        const productQueryResponse = this.handleProductSpecificQueries(message);
        if (productQueryResponse) {
            return productQueryResponse;
        }

        let response = '';
        let responseType = '';
        let messageCategory = '';

        // Inventory update queries
        if (lowerMessage.match(/(update.*stock|set.*inventory|change.*stock|inventory.*update|stock.*update)/)) {
            // Check for bulk inventory update first
            const bulkUpdateInfo = this.parseBulkInventoryUpdate(message);
            
            if (bulkUpdateInfo) {
                const bulkUpdateResult = await this.updateBulkInventory(bulkUpdateInfo.category, bulkUpdateInfo.newStock);
                
                if (bulkUpdateResult.success) {
                    response = `<div class="ai-summary-container"><div class="summary-header"><h3>✅ Bulk Inventory Updated Successfully</h3></div><div class="summary-section"><h4>📦 Bulk Update Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Category</span><span class="insight-value">${bulkUpdateInfo.category}</span></div><div class="insight-item"><span class="insight-label">New Stock Level</span><span class="insight-value">${bulkUpdateInfo.newStock} units</span></div><div class="insight-item"><span class="insight-label">Products Updated</span><span class="insight-value">${bulkUpdateResult.updatedCount} products</span></div></div></div><div class="summary-footer"><p>✅ ${bulkUpdateResult.message}</p></div></div>`;
                    responseType = 'bulk_inventory_update';
                    messageCategory = 'inventory';
                } else {
                    response = `<div class="ai-summary-container"><div class="summary-header"><h3>❌ Bulk Inventory Update Failed</h3></div><div class="summary-section"><p>${bulkUpdateResult.message}</p><p>Available categories: ${Object.keys(this.generateInventoryAnalytics().categoryBreakdown).join(', ')}</p></div></div>`;
                    responseType = 'bulk_inventory_update_error';
                    messageCategory = 'inventory';
                }
            } else {
                // Individual product inventory update
                const updateInfo = this.parseInventoryUpdate(message);
                
                if (updateInfo) {
                    const product = this.findProductByName(updateInfo.productName);
                    
                    if (product) {
                        const updateResult = await this.updateProductInventory(product.id, updateInfo.newStock);
                        
                        if (updateResult.success) {
                            response = `<div class="ai-summary-container"><div class="summary-header"><h3>✅ Inventory Updated Successfully</h3></div><div class="summary-section"><h4>📦 Product Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Previous Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">New Stock</span><span class="insight-value">${updateInfo.newStock} units</span></div><div class="insight-item"><span class="insight-label">Change</span><span class="insight-value">${updateInfo.newStock - product.stock > 0 ? '+' : ''}${updateInfo.newStock - product.stock} units</span></div></div></div><div class="summary-footer"><p>✅ ${updateResult.message}</p></div></div>`;
                            responseType = 'inventory_update';
                            messageCategory = 'inventory';
                        } else {
                            response = `<div class="ai-summary-container"><div class="summary-header"><h3>❌ Inventory Update Failed</h3></div><div class="summary-section"><p>Sorry, I couldn't update the inventory for "${updateInfo.productName}". Please try again or check the product name.</p></div></div>`;
                            responseType = 'inventory_update_error';
                            messageCategory = 'inventory';
                        }
                    } else {
                        response = `<div class="ai-summary-container"><div class="summary-header"><h3>🔍 Product Not Found</h3></div><div class="summary-section"><p>I couldn't find a product named "${updateInfo.productName}". Here are your available products:</p><div class="product-list">${(this.sellerData.products || []).slice(0, 10).map(p => `<div class="product-item"><span class="product-name">${p.name}</span><span class="product-stock">Stock: ${p.stock}</span></div>`).join('')}</div><p><strong>Try:</strong> "Update [exact product name] stock to [number]"</p></div></div>`;
                        responseType = 'product_not_found';
                        messageCategory = 'inventory';
                    }
                } else {
                    response = `<div class="ai-summary-container"><div class="summary-header"><h3>📦 Inventory Update Help</h3></div><div class="summary-section"><h4>🔧 How to Update Inventory</h4><p>I can help you update product inventory. Use these formats:</p><ul><li><strong>Individual Product:</strong> "Update [Product Name] stock to [number]"</li><li><strong>Bulk Update:</strong> "Update all [Category] stock to [number]"</li><li><strong>Alternative:</strong> "Set [Product Name] inventory to [number]"</li><li><strong>Short Form:</strong> "[Product Name] stock [number]"</li></ul><h4>📋 Examples:</h4><ul><li>"Update Wireless Headphones stock to 150"</li><li>"Update all Electronics stock to 100"</li><li>"Set USB-C Cable inventory to 200"</li><li>"Restock all Fashion to 75"</li></ul></div><div class="summary-footer"><p>💡 Try: "Update [product name] stock to [number]" or "Update all [category] stock to [number]"</p></div></div>`;
                    responseType = 'inventory_help';
                    messageCategory = 'inventory';
                }
            }
        }
        // Inventory analytics queries
        else if (lowerMessage.match(/(inventory.*analytics|stock.*analytics|inventory.*report|stock.*report|inventory.*overview|stock.*overview)/)) {
            const analytics = this.generateInventoryAnalytics();
            
            response = `<div class="ai-summary-container"><div class="summary-header"><h3>📊 Inventory Analytics</h3></div><div class="summary-grid"><div class="summary-card"><h4>📦 Total Products</h4><div class="stats-number">${analytics.totalProducts}</div></div><div class="summary-card"><h4>📈 Total Stock</h4><div class="stats-number">${analytics.totalStock.toLocaleString()}</div></div><div class="summary-card"><h4>⚠️ Low Stock</h4><div class="stats-number">${analytics.lowStockProducts}</div></div><div class="summary-card"><h4>❌ Out of Stock</h4><div class="stats-number">${analytics.outOfStockProducts}</div></div></div><div class="summary-section"><h4>📊 Stock Distribution</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Low Stock (< ${analytics.lowStockThreshold})</span><span class="insight-value">${analytics.stockDistribution.low} products</span></div><div class="insight-item"><span class="insight-label">Medium Stock (${analytics.lowStockThreshold}-${analytics.mediumStockThreshold})</span><span class="insight-value">${analytics.stockDistribution.medium} products</span></div><div class="insight-item"><span class="insight-label">High Stock (${analytics.mediumStockThreshold}+)</span><span class="insight-value">${analytics.stockDistribution.high} products</span></div></div></div><div class="summary-section"><h4>📋 Category Breakdown</h4><div class="category-list">${Object.entries(analytics.categoryBreakdown).map(([category, data]) => `<div class="category-item"><span class="category-name">${category}</span><span class="category-count">${data.count} products</span><span class="category-stock">${data.totalStock} units</span><span class="category-avg">Avg: ${data.avgStock}</span></div>`).join('')}</div></div><div class="summary-footer"><p>💡 Use bulk updates: "Update all [category] stock to [number]"</p></div></div>`;
            responseType = 'inventory_analytics';
            messageCategory = 'inventory';
        }
        // Prediction and forecast queries
        else if (lowerMessage.match(/(prediction|forecast|future|trend|projection|next month|upcoming|business forecast|sales prediction|revenue forecast|growth prediction)/)) {
            const orders = this.sellerData.orders || [];
            const products = this.sellerData.products || [];
            
            if (orders.length === 0 && products.length === 0) {
                return this.askSellerForDefaults(
                    "I don't have enough data to make accurate predictions. Would you like me to:",
                    [
                        "Show you how to add sample data for testing",
                        "Provide general business insights",
                        "Help you set up your inventory",
                        "Create sample orders for analysis"
                    ]
                );
            }
            
            const predictionResponse = this.generateBusinessPrediction();
            response = predictionResponse.message;
            responseType = predictionResponse.responseType;
            messageCategory = predictionResponse.messageCategory;
        }
        // Welcome/greeting queries
        else if (lowerMessage.match(/(hello|hi|hey|welcome|greeting|start|begin)/)) {
            response = this.generateWelcomeGreeting();
            responseType = 'welcome_greeting';
            messageCategory = 'general';
        }
        // Payment queries
        else if (lowerMessage.match(/(payment|payments|transaction|transactions|dispute|disputes|refund|refunds|payment status|payment history|payment details|payment analytics|payment methods|payment gateway|processing fee|received amount|refund amount)/)) {
            // Payment analytics
            if (lowerMessage.match(/(payment analytics|payment summary|payment overview|payment stats|payment statistics)/)) {
                const analytics = this.sellerData.paymentAnalytics;
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>💳 Payment Analytics (Last 30 Days)</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Total Payments</h4><div class="stats-number">${analytics.total_payments}</div></div><div class="summary-card"><h4>💵 Total Amount</h4><div class="stats-number">₹${parseFloat(analytics.total_amount).toLocaleString()}</div></div><div class="summary-card"><h4>✅ Completed</h4><div class="stats-number">${analytics.completed_payments}</div></div><div class="summary-card"><h4>⏳ Pending</h4><div class="stats-number">${analytics.pending_payments}</div></div><div class="summary-card"><h4>❌ Failed</h4><div class="stats-number">${analytics.failed_payments}</div></div><div class="summary-card"><h4>🔄 Refunded</h4><div class="stats-number">${analytics.refunded_payments}</div></div></div><div class="summary-section"><h4>📊 Payment Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">💸 Total Received</span><span class="insight-value">₹${parseFloat(analytics.total_received).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">💸 Total Refunded</span><span class="insight-value">₹${parseFloat(analytics.total_refunded).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">💸 Processing Fees</span><span class="insight-value">₹${parseFloat(analytics.total_fees).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">⚠️ Disputed Payments</span><span class="insight-value">${analytics.disputed_payments}</span></div><div class="insight-item"><span class="insight-label">📈 Average Payment</span><span class="insight-value">₹${parseFloat(analytics.avg_payment_amount).toLocaleString()}</span></div></div></div><div class="summary-footer"><p>View detailed payment information at <a href="/payment-details" target="_blank">Payment Details</a> 📊</p></div></div>`;
                responseType = 'payment_analytics';
                messageCategory = 'payments';
            }
            // Dispute queries
            else if (lowerMessage.match(/(dispute|disputes|disputed payments|payment disputes|dispute status)/)) {
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>⚠️ Payment Disputes Overview</h3></div><div class="summary-section"><h4>📋 Dispute Summary</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">🚨 Total Disputed</span><span class="insight-value">${this.sellerData.paymentAnalytics.disputed_payments} payments</span></div><div class="insight-item"><span class="insight-label">📊 Dispute Rate</span><span class="insight-value">${((this.sellerData.paymentAnalytics.disputed_payments / this.sellerData.paymentAnalytics.total_payments) * 100).toFixed(1)}%</span></div></div></div><div class="summary-section"><h4>🔧 How to Handle Disputes</h4><ul><li><strong>Review the dispute:</strong> Check customer complaint and evidence</li><li><strong>Contact customer:</strong> Try to resolve amicably first</li><li><strong>Update dispute status:</strong> Mark as 'under_review' or 'resolved'</li><li><strong>Document resolution:</strong> Add notes about the outcome</li></ul></div><div class="summary-footer"><p>Manage disputes at <a href="/payment-details" target="_blank">Payment Details</a> ⚠️</p></div></div>`;
                responseType = 'dispute_info';
                messageCategory = 'payments';
            }
            // Payment status queries
            else if (lowerMessage.match(/(payment status|transaction status|payment failed|payment pending|payment completed)/)) {
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>💳 Payment Status Overview</h3></div><div class="summary-section"><h4>📊 Status Breakdown</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">✅ Completed</span><span class="insight-value">${this.sellerData.paymentAnalytics.completed_payments} payments</span></div><div class="insight-item"><span class="insight-label">⏳ Pending</span><span class="insight-value">${this.sellerData.paymentAnalytics.pending_payments} payments</span></div><div class="insight-item"><span class="insight-label">❌ Failed</span><span class="insight-value">${this.sellerData.paymentAnalytics.failed_payments} payments</span></div><div class="insight-item"><span class="insight-label">🔄 Refunded</span><span class="insight-value">${this.sellerData.paymentAnalytics.refunded_payments} payments</span></div></div></div><div class="summary-section"><h4>💡 Payment Status Guide</h4><ul><li><strong>Pending:</strong> Payment is being processed</li><li><strong>Completed:</strong> Payment successful, funds received</li><li><strong>Failed:</strong> Payment declined or error occurred</li><li><strong>Refunded:</strong> Payment returned to customer</li><li><strong>Processing:</strong> Payment is being verified</li><li><strong>Cancelled:</strong> Payment was cancelled</li></ul></div><div class="summary-footer"><p>View all payments at <a href="/payment-details" target="_blank">Payment Details</a> 💳</p></div></div>`;
                responseType = 'payment_status';
                messageCategory = 'payments';
            }
            // General payment queries
            else {
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>💳 Payment Management</h3></div><div class="summary-section"><h4>📊 Quick Overview</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">💰 Total Payments</span><span class="insight-value">${this.sellerData.paymentAnalytics.total_payments}</span></div><div class="insight-item"><span class="insight-label">💵 Total Amount</span><span class="insight-value">₹${parseFloat(this.sellerData.paymentAnalytics.total_amount).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">✅ Success Rate</span><span class="insight-value">${((this.sellerData.paymentAnalytics.completed_payments / this.sellerData.paymentAnalytics.total_payments) * 100).toFixed(1)}%</span></div></div></div><div class="summary-section"><h4>🔧 What I can help with:</h4><ul><li><strong>Payment Analytics:</strong> "Show me payment analytics"</li><li><strong>Payment Status:</strong> "What's my payment status?"</li><li><strong>Disputes:</strong> "Show me payment disputes"</li><li><strong>Payment Methods:</strong> "What payment methods do I accept?"</li><li><strong>Refunds:</strong> "How many refunds do I have?"</li></ul></div><div class="summary-footer"><p>Manage all payments at <a href="/payment-details" target="_blank">Payment Details</a> 💳</p></div></div>`;
                responseType = 'payment_info';
                messageCategory = 'payments';
            }
        }
        // Product queries
        else if (lowerMessage.match(/(product|products|inventory|stock|item|items)/)) {
            // Show all products
            if (lowerMessage.match(/(show.*all.*product|list.*product|all.*product|product.*list)/)) {
                const products = this.sellerData.products || [];
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>📦 Your Product Inventory</h3></div><div class="product-list">${products.map((product, index) => `<div class="product-item"><span class="product-number">${index + 1}</span><span class="product-name"><strong>${product.name}</strong></span><span class="product-category">${product.category}</span><span class="product-price">₹${product.price}</span><span class="product-stock">Stock: ${product.stock}</span><span class="product-profit">Profit: ${product.profit_margin}%</span></div>`).join('')}</div><div class="summary-footer"><p>Ask me about any specific product's history! Try: "Show me ${products[0]?.name || 'Wireless Headphones'} history" 📊</p></div></div>`;
                responseType = 'product_list';
                messageCategory = 'inventory';
            }
            // Low stock alerts
            else if (lowerMessage.match(/(low.*stock|stock.*alert|restock|out.*of.*stock)/)) {
                const products = this.sellerData.products || [];
                const productInsights = this.analyzeProductPerformance();
                const lowStockProducts = products.filter(p => (p.stock || 0) < productInsights.lowStockThreshold);
                
                if (lowStockProducts.length > 0) {
                    response = `<div class="ai-summary-container"><div class="summary-header"><h3>⚠️ Low Stock Alerts</h3></div><div class="product-list">${lowStockProducts.map((product, index) => `<div class="product-item"><span class="product-number">${index + 1}</span><span class="product-name"><strong>${product.name}</strong></span><span class="product-category">${product.category}</span><span class="product-price">₹${product.price}</span><span class="product-stock">Stock: ${product.stock}</span><span class="product-profit">Profit: ${product.profit_margin}%</span></div>`).join('')}</div><div class="summary-footer"><p>Update stock levels using: "Update [product name] stock to [number]" 📦</p></div></div>`;
                } else {
                    response = `<div class="ai-summary-container"><div class="summary-header"><h3>🔍 No Products Found</h3></div><div class="summary-section"><p>No products match your filter: <strong>Low stock products (< ${productInsights.lowStockThreshold} units)</strong></p><p>Try adjusting your filter criteria or view all products.</p></div></div>`;
                }
                responseType = 'product_filter';
                messageCategory = 'inventory';
            }
            // General product queries
            else {
                response = `<div class="ai-summary-container"><div class="summary-header"><h3>📦 Product Management</h3></div><div class="summary-section"><h4>🔧 What I can help with:</h4><ul><li><strong>View Products:</strong> "Show me all products"</li><li><strong>Low Stock Alerts:</strong> "Show me low stock products"</li><li><strong>Update Inventory:</strong> "Update [product] stock to [number]"</li><li><strong>Product History:</strong> "Show me [product] history"</li><li><strong>Stock Check:</strong> "What's the stock of [product]?"</li></ul></div><div class="summary-footer"><p>💡 Try: "Show me all products" or "Update [product] stock to [number]"</p></div></div>`;
                responseType = 'product_help';
                messageCategory = 'inventory';
            }
        }
        // Business summary queries
        else if (lowerMessage.match(/(business.*summary|summary|overview|dashboard|stats|statistics|analytics)/)) {
            const products = this.sellerData.products || [];
            const orders = this.sellerData.orders || [];
            
            // Fix: Properly parse and sum order totals as numbers
            const totalRevenue = orders.reduce((sum, order) => {
                const orderTotal = parseFloat(order.total) || 0;
                return sum + orderTotal;
            }, 0);
            
            const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
            
            // Calculate dynamic thresholds
            const productInsights = this.analyzeProductPerformance();
            const lowStockCount = products.filter(p => (p.stock || 0) < productInsights.lowStockThreshold).length;
            
            response = `<div class="ai-summary-container"><div class="summary-header"><h3>📊 Business Overview</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Total Revenue</h4><div class="stats-number">₹${totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>📦 Total Orders</h4><div class="stats-number">${orders.length}</div></div><div class="summary-card"><h4>📈 Avg Order Value</h4><div class="stats-number">₹${Math.round(avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>🛍️ Total Products</h4><div class="stats-number">${products.length}</div></div></div><div class="summary-section"><h4>⚠️ Alerts</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Low Stock Items</span><span class="insight-value">${lowStockCount} products (below ${productInsights.lowStockThreshold} units)</span></div></div></div><div class="summary-footer"><p>Your business is performing well! Keep up the great work! 🚀</p></div></div>`;
            responseType = 'business_summary';
            messageCategory = 'analytics';
        }
        // Sales/GMV/Order trends queries
        else if (lowerMessage.match(/(sales.*trend|gmv.*trend|order.*trend|sales.*gmv.*order|trend.*analysis|sales.*analysis|gmv.*analysis|order.*analysis|sales.*report|gmv.*report|order.*report)/)) {
            const trends = this.generateSalesTrends();
            
            if (trends.totalOrders === 0) {
                return this.askSellerForDefaults(
                    "I don't see any order data to analyze trends. Would you like me to:",
                    [
                        "Show you how to add sample orders for testing",
                        "Analyze your product performance instead",
                        "Show inventory trends",
                        "Provide business predictions based on available data"
                    ]
                );
            }
            
            const response = this.handleSalesTrends();
            return response;
        }
        // Default response
        else {
            response = `<div class="ai-summary-container"><div class="summary-header"><h3>🤖 I'm Here to Help!</h3></div><div class="summary-section"><p>I can help you with:</p><ul><li>📦 <strong>Product Management:</strong> View, add, update products</li><li>📊 <strong>Product History:</strong> Get detailed history of any product</li><li>📋 <strong>Order Management:</strong> View and update orders</li><li>📈 <strong>Business Analytics:</strong> Sales reports and insights</li><li>⚠️ <strong>Stock Alerts:</strong> Low stock notifications</li><li>🔄 <strong>Recent Changes:</strong> Ask "What changed?" to learn about new features</li></ul><p><strong>Try asking:</strong></p><ul><li>"Show me Wireless Headphones history"</li><li>"What's my business summary?"</li><li>"Show me all products"</li><li>"Any low stock alerts?"</li><li>"What changed in analytics?"</li><li>"How do these changes help my business?"</li></ul></div><div class="summary-footer"><p>Need help? Just ask! 🚀</p></div></div>`;
            responseType = 'general';
            messageCategory = 'query';
        }

        return { response, responseType, messageCategory };
    }

    // Handle inventory overview
    handleInventoryOverview() {
        const overview = this.generateInventoryOverview();
        
        let categoryHtml = '';
        Object.entries(overview.categorySummary).forEach(([category, data]) => {
            categoryHtml += `<div class="category-item"><span class="category-name">${category}</span><span class="category-stats"><span class="stat">${data.count} products</span><span class="stat">${data.totalStock} units</span><span class="stat">₹${data.totalValue.toLocaleString()}</span></span></div>`;
        });

        let alertsHtml = '';
        overview.stockAlerts.forEach(alert => {
            alertsHtml += `<div class="alert-item">${alert}</div>`;
        });

        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📦 Inventory Overview</h3></div><div class="summary-grid"><div class="summary-card"><h4>📦 Total Products</h4><div class="stats-number">${overview.totalProducts}</div></div><div class="summary-card"><h4>📊 Total Stock</h4><div class="stats-number">${overview.totalStock.toLocaleString()}</div></div><div class="summary-card"><h4>💰 Total Value</h4><div class="stats-number">₹${overview.totalValue.toLocaleString()}</div></div><div class="summary-card"><h4>⚠️ Low Stock</h4><div class="stats-number">${overview.lowStockProducts.length}</div></div></div><div class="summary-section"><h4>📋 Category Summary</h4><div class="category-summary">${categoryHtml}</div></div><div class="summary-section"><h4>🚨 Stock Alerts</h4><div class="stock-alerts">${alertsHtml}</div></div><div class="summary-footer"><p>Need to update inventory? Try: "Update Wireless Headphones stock to 50" 📝</p></div></div>`,
            responseType: 'inventory_overview',
            messageCategory: 'inventory'
        };
    }

    // Handle sales trends
    handleSalesTrends() {
        const trends = this.generateSalesTrends();
        
        if (trends.totalOrders === 0) {
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📈 Sales Trends</h3></div><div class="summary-section"><p>No order data available to generate trends.</p></div></div>`,
                responseType: 'sales_trends',
                messageCategory: 'analytics'
            };
        }

        let topProductsHtml = '';
        trends.topProducts.forEach((product, index) => {
            topProductsHtml += `<div class="product-item"><span class="product-rank">#${index + 1}</span><span class="product-name">${product.name}</span><span class="product-stats"><span class="stat">${product.quantity} sold</span><span class="stat">₹${product.revenue.toLocaleString()}</span></span></div>`;
        });

        let categoryHtml = '';
        Object.entries(trends.categoryPerformance).forEach(([category, data]) => {
            categoryHtml += `<div class="category-item"><span class="category-name">${category}</span><span class="category-stats"><span class="stat">${data.products} products</span><span class="stat">${data.totalStock} units</span><span class="stat">₹${data.avgPrice} avg</span></span></div>`;
        });

        const gmvGrowthColor = trends.gmvGrowth >= 0 ? 'positive' : 'negative';
        const orderGrowthColor = trends.orderGrowth >= 0 ? 'positive' : 'negative';

        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📈 Sales & GMV Trends</h3></div><div class="summary-grid"><div class="summary-card"><h4>📋 Total Orders</h4><div class="stats-number">${trends.totalOrders}</div><div class="trend-indicator ${orderGrowthColor}">${trends.orderGrowth >= 0 ? '↗' : '↘'} ${Math.abs(trends.orderGrowth).toFixed(1)}%</div></div><div class="summary-card"><h4>💰 Total GMV</h4><div class="stats-number">₹${trends.totalGMV.toLocaleString()}</div><div class="trend-indicator ${gmvGrowthColor}">${trends.gmvGrowth >= 0 ? '↗' : '↘'} ${Math.abs(trends.gmvGrowth).toFixed(1)}%</div></div><div class="summary-card"><h4>📊 Avg Order Value</h4><div class="stats-number">₹${Math.round(trends.avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>📅 Last 7 Days</h4><div class="stats-number">₹${trends.last7DaysGMV.toLocaleString()}</div></div></div><div class="summary-section"><h4>🏆 Top Performing Products</h4><div class="top-products">${topProductsHtml}</div></div><div class="summary-section"><h4>📂 Category Performance</h4><div class="category-summary">${categoryHtml}</div></div><div class="summary-footer"><p>Want detailed analysis? Ask: "Show me product performance" 📊</p></div></div>`,
            responseType: 'sales_trends',
            messageCategory: 'analytics'
        };
    }

    // Handle CSV order processing
    async handleCSVOrderProcessing() {
        const result = await this.processCSVOrders();
        
        if (!result.success) {
            return {
                success: false,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>❌ CSV Processing Error</h3></div><div class="summary-section"><p>${result.message}</p></div></div>`,
                responseType: 'csv_error',
                messageCategory: 'orders'
            };
        }

        let ordersHtml = '';
        result.orders.forEach(order => {
            ordersHtml += `<div class="order-item"><span class="order-id">${order.order_id}</span><span class="customer-name">${order.customer_name}</span><span class="product-name">${order.product_name}</span><span class="quantity">${order.quantity}</span><span class="total">₹${parseFloat(order.total_amount).toLocaleString()}</span></div>`;
        });

        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📄 CSV Order Processing</h3></div><div class="summary-grid"><div class="summary-card"><h4>📋 Processed Orders</h4><div class="stats-number">${result.processedOrders}</div></div><div class="summary-card"><h4>💰 Total Revenue</h4><div class="stats-number">₹${result.totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>📦 Total Items</h4><div class="stats-number">${result.totalItems}</div></div><div class="summary-card"><h4>📊 Avg Order Value</h4><div class="stats-number">₹${Math.round(result.avgOrderValue).toLocaleString()}</div></div></div><div class="summary-section"><h4>📋 Processed Orders</h4><div class="processed-orders">${ordersHtml}</div></div><div class="summary-footer"><p>✅ ${result.message}</p></div></div>`,
            responseType: 'csv_processing',
            messageCategory: 'orders'
        };
    }

    // Handle inventory update
    handleInventoryUpdate(message) {
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📦 Inventory Update Help</h3></div><div class="summary-section"><h4>🔧 How to Update Inventory</h4><p>I can help you update product inventory. Use these formats:</p><ul><li><strong>Individual Product:</strong> "Update [Product Name] stock to [number]"</li><li><strong>Bulk Update:</strong> "Update all [Category] stock to [number]"</li><li><strong>Alternative:</strong> "Set [Product Name] inventory to [number]"</li><li><strong>Short Form:</strong> "[Product Name] stock [number]"</li></ul><h4>📋 Examples:</h4><ul><li>"Update Wireless Headphones stock to 150"</li><li>"Update all Electronics stock to 100"</li><li>"Set USB-C Cable inventory to 200"</li><li>"Restock all Fashion to 75"</li></ul></div><div class="summary-footer"><p>💡 Try: "Update [product name] stock to [number]" or "Update all [category] stock to [number]"</p></div></div>`,
            responseType: 'inventory_help',
            messageCategory: 'inventory'
        };
    }

    // Handle order management
    handleOrderManagement(message) {
        const lowerMessage = message.toLowerCase();
        const orders = this.sellerData.orders || [];
        
        if (orders.length === 0) {
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 Order Management</h3></div><div class="summary-section"><p>No orders found in your system.</p><p>You can:</p><ul><li>Add sample orders for testing</li><li>Upload orders via CSV file</li><li>Create orders manually</li></ul></div><div class="summary-footer"><p>Try: "I have a CSV file to upload" to add orders 📄</p></div></div>`,
                responseType: 'no_orders',
                messageCategory: 'orders'
            };
        }
        
        // Show order summary
        if (lowerMessage.match(/(order.*summary|order.*overview|order.*stats|order.*statistics)/)) {
            const totalRevenue = orders.reduce((sum, order) => {
                const orderTotal = parseFloat(order.total) || 0;
                return sum + orderTotal;
            }, 0);
            const avgOrderValue = totalRevenue / orders.length;
            
            // Calculate order status breakdown
            const statusCounts = {};
            orders.forEach(order => {
                const status = order.status || 'pending';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            let statusHtml = '';
            Object.entries(statusCounts).forEach(([status, count]) => {
                const statusIcon = status === 'delivered' ? '✅' : status === 'processing' ? '⏳' : status === 'cancelled' ? '❌' : status === 'shipped' ? '🚚' : '📋';
                statusHtml += `<div class="insight-item"><span class="insight-label">${statusIcon} ${status.charAt(0).toUpperCase() + status.slice(1)}</span><span class="insight-value">${count} orders</span></div>`;
            });
            
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 Order Summary</h3></div><div class="summary-grid"><div class="summary-card"><h4>📦 Total Orders</h4><div class="stats-number">${orders.length}</div></div><div class="summary-card"><h4>💰 Total Revenue</h4><div class="stats-number">₹${totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>📈 Avg Order Value</h4><div class="stats-number">₹${Math.round(avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>📅 Recent Orders</h4><div class="stats-number">${Math.min(5, orders.length)}</div></div></div><div class="summary-section"><h4>📊 Order Status Breakdown</h4><div class="insights-grid">${statusHtml}</div></div><div class="summary-footer"><p>View all orders at <a href="/order-history" target="_blank">Order History</a> 📋</p></div></div>`,
                responseType: 'order_summary',
                messageCategory: 'orders'
            };
        }
        
        // Show all orders
        if (lowerMessage.match(/(show.*all.*orders|list.*orders|all.*orders|order.*list|my.*orders)/)) {
            const recentOrders = orders.slice(0, 10); // Show last 10 orders
            let ordersHtml = '';
            
            recentOrders.forEach((order, index) => {
                const statusIcon = order.status === 'delivered' ? '✅' : order.status === 'processing' ? '⏳' : order.status === 'cancelled' ? '❌' : order.status === 'shipped' ? '🚚' : '📋';
                const orderDate = new Date(order.order_date).toLocaleDateString();
                const products = order.products || [];
                const productNames = products.length > 0 ? products.join(', ') : 'N/A';
                const quantity = products.length > 0 ? products.length : 1; // Estimate quantity based on products
                
                ordersHtml += `<div class="order-item"><span class="order-number">#${index + 1}</span><span class="order-id">${order.id || 'N/A'}</span><span class="customer-name">${order.customer_name}</span><span class="product-name">${productNames}</span><span class="quantity">Qty: ${quantity}</span><span class="total">₹${parseFloat(order.total).toLocaleString()}</span><span class="status">${statusIcon} ${order.status}</span><span class="date">${orderDate}</span></div>`;
            });
            
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 Recent Orders (Last 10)</h3></div><div class="order-list">${ordersHtml}</div><div class="summary-section"><p><strong>Total Orders:</strong> ${orders.length}</p><p><strong>Showing:</strong> Most recent 10 orders</p></div><div class="summary-footer"><p>View all orders at <a href="/order-history" target="_blank">Order History</a> or ask "Show me order summary" 📊</p></div></div>`,
                responseType: 'order_list',
                messageCategory: 'orders'
            };
        }
        
        // Order status queries
        if (lowerMessage.match(/(order.*status|status.*orders|pending.*orders|completed.*orders|cancelled.*orders)/)) {
            const statusCounts = {};
            orders.forEach(order => {
                const status = order.status || 'pending';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            let statusHtml = '';
            Object.entries(statusCounts).forEach(([status, count]) => {
                const statusIcon = status === 'delivered' ? '✅' : status === 'processing' ? '⏳' : status === 'cancelled' ? '❌' : status === 'shipped' ? '🚚' : '📋';
                const statusOrders = orders.filter(order => (order.status || 'pending') === status).slice(0, 3);
                let orderList = '';
                statusOrders.forEach(order => {
                    orderList += `<div class="mini-order"><span class="order-id">${order.id || 'N/A'}</span><span class="customer">${order.customer_name}</span><span class="amount">₹${parseFloat(order.total).toLocaleString()}</span></div>`;
                });
                statusHtml += `<div class="status-group"><div class="status-header"><span class="status-icon">${statusIcon}</span><span class="status-name">${status.charAt(0).toUpperCase() + status.slice(1)}</span><span class="status-count">${count} orders</span></div><div class="status-orders">${orderList}</div></div>`;
            });
            
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📊 Order Status Overview</h3></div><div class="summary-section"><h4>📋 Status Breakdown</h4><div class="status-breakdown">${statusHtml}</div></div><div class="summary-section"><h4>💡 Status Guide</h4><ul><li><strong>Processing:</strong> Order placed, awaiting processing</li><li><strong>Shipped:</strong> Order is in transit</li><li><strong>Delivered:</strong> Order fulfilled and delivered</li><li><strong>Cancelled:</strong> Order was cancelled</li></ul></div><div class="summary-footer"><p>Manage orders at <a href="/order-history" target="_blank">Order History</a> 📋</p></div></div>`,
                responseType: 'order_status',
                messageCategory: 'orders'
            };
        }
        
        // General order queries
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 Order Management</h3></div><div class="summary-section"><h4>📊 Quick Overview</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">📦 Total Orders</span><span class="insight-value">${orders.length}</span></div><div class="insight-item"><span class="insight-label">💰 Total Revenue</span><span class="insight-value">₹${orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">📅 Recent Activity</span><span class="insight-value">${Math.min(5, orders.length)} recent orders</span></div></div></div><div class="summary-section"><h4>🔧 What I can help with:</h4><ul><li><strong>Order Summary:</strong> "Show me order summary"</li><li><strong>All Orders:</strong> "Show me all orders"</li><li><strong>Order Status:</strong> "What's my order status?"</li><li><strong>Recent Orders:</strong> "Show me recent orders"</li><li><strong>Order Analytics:</strong> "Show me order trends"</li></ul></div><div class="summary-footer"><p>Manage all orders at <a href="/order-history" target="_blank">Order History</a> 📋</p></div></div>`,
            responseType: 'order_info',
            messageCategory: 'orders'
        };
    }

    // ===== NEW CAPABILITY 1: PROACTIVE UPDATE ANNOUNCER =====
    
    /**
     * Generate a proactive update announcement from technical release notes
     * @param {Object} updateData - Technical update information
     * @returns {Object} Formatted announcement message
     */
    generateUpdateAnnouncement(updateData) {
        const {
            version,
            releaseNotes,
            technicalChanges = [],
            userFacingChanges = [],
            benefits = []
        } = updateData;

        // Filter out technical-only changes
        const businessRelevantChanges = userFacingChanges.filter(change => 
            !change.toLowerCase().includes('database') &&
            !change.toLowerCase().includes('api') &&
            !change.toLowerCase().includes('backend') &&
            !change.toLowerCase().includes('refactor') &&
            !change.toLowerCase().includes('library') &&
            !change.toLowerCase().includes('dependency')
        );

        // Generate business-friendly descriptions
        const businessBenefits = benefits.length > 0 ? benefits : this.translateTechnicalBenefits(technicalChanges);

        const announcement = `Hello! 👋 We've just updated your Seller Dashboard with some new improvements.

✨ *What's New?*

${businessRelevantChanges.map(change => `• ${this.translateToBusinessLanguage(change)}`).join('\n')}

✅ *How This Helps You:*

${businessBenefits.map(benefit => `• ${benefit}`).join('\n')}

Let us know if you have any questions! 💬`;

        return {
            success: true,
            message: announcement,
            responseType: 'update_announcement',
            messageCategory: 'system',
            version: version
        };
    }

    /**
     * Translate technical changes to business benefits
     */
    translateTechnicalBenefits(technicalChanges) {
        const benefitMap = {
            'performance': 'Faster loading times for better user experience',
            'caching': 'Improved speed when viewing your data',
            'optimization': 'Better performance and faster responses',
            'security': 'Enhanced security for your business data',
            'ui': 'Improved interface for easier navigation',
            'mobile': 'Better mobile experience for on-the-go management',
            'analytics': 'More detailed insights about your business',
            'reporting': 'Better reports to track your performance',
            'integration': 'Seamless connection with other tools',
            'automation': 'More automated processes to save time'
        };

        const benefits = [];
        technicalChanges.forEach(change => {
            const lowerChange = change.toLowerCase();
            Object.entries(benefitMap).forEach(([key, benefit]) => {
                if (lowerChange.includes(key) && !benefits.includes(benefit)) {
                    benefits.push(benefit);
                }
            });
        });

        return benefits.length > 0 ? benefits : [
            'Improved overall performance and reliability',
            'Better user experience and easier navigation',
            'Enhanced security and data protection'
        ];
    }

    /**
     * Translate technical language to business-friendly language
     */
    translateToBusinessLanguage(technicalText) {
        const translations = {
            'widget': 'feature',
            'component': 'section',
            'interface': 'screen',
            'dashboard': 'main page',
            'analytics': 'business insights',
            'metrics': 'business numbers',
            'performance': 'speed',
            'optimization': 'improvement',
            'enhancement': 'upgrade',
            'functionality': 'feature',
            'integration': 'connection',
            'automation': 'automatic process',
            'caching': 'faster loading',
            'responsive': 'mobile-friendly',
            'intuitive': 'easy to use',
            'streamlined': 'simplified',
            'comprehensive': 'complete',
            'real-time': 'live',
            'dynamic': 'automatic',
            'interactive': 'clickable',
            'customizable': 'personalizable'
        };

        let translated = technicalText;
        Object.entries(translations).forEach(([tech, business]) => {
            const regex = new RegExp(`\\b${tech}\\b`, 'gi');
            translated = translated.replace(regex, business);
        });

        return translated;
    }

    // ===== NEW CAPABILITY 2: ON-DEMAND FEATURE EXPLAINER =====

    /**
     * Handle "How do I..." and "What is..." questions
     * @param {string} message - User's question
     * @returns {Object} Step-by-step guide response
     */
    handleFeatureExplanation(message) {
        const lowerMessage = message.toLowerCase();
        
        // Feature explanation patterns
        const explanations = {
            // Dashboard navigation
            'how.*login|how.*sign.*in|how.*access.*dashboard': {
                title: 'How to Access Your Dashboard',
                steps: [
                    'Go to the Flipkart Seller Dashboard website',
                    'Enter your seller ID and password',
                    'Click "Login" to access your dashboard',
                    'You\'ll see your business overview immediately'
                ],
                tips: ['Bookmark the dashboard URL for quick access', 'Use the "Remember Me" option for faster login']
            },
            
            // Product management
            'how.*add.*product|how.*create.*product|how.*new.*product': {
                title: 'How to Add a New Product',
                steps: [
                    'Go to the "Products" section in your dashboard',
                    'Click the "Add New Product" button',
                    'Fill in the product details (name, price, category)',
                    'Set your stock quantity and profit margin',
                    'Add product description and images',
                    'Click "Save" to add the product'
                ],
                tips: ['Use clear product names for better search results', 'Set competitive prices to attract customers']
            },
            
            // Inventory management
            'how.*update.*stock|how.*change.*inventory|how.*restock': {
                title: 'How to Update Product Stock',
                steps: [
                    'Go to the "Products" section',
                    'Find the product you want to update',
                    'Click the "Edit" button next to the product',
                    'Change the stock quantity in the "Stock" field',
                    'Click "Save Changes" to update',
                    'Or use the chat: "Update [product name] stock to [number]"'
                ],
                tips: ['Keep stock levels updated to avoid overselling', 'Use bulk updates for multiple products']
            },
            
            // Order management
            'how.*check.*orders|how.*view.*orders|how.*order.*status': {
                title: 'How to Check Your Orders',
                steps: [
                    'Go to the "Orders" section in your dashboard',
                    'You\'ll see all recent orders with their status',
                    'Click on any order to see detailed information',
                    'Update order status using the "Update Status" button',
                    'Filter orders by date, status, or customer'
                ],
                tips: ['Check orders regularly to maintain good customer service', 'Update status promptly to keep customers informed']
            },
            
            // Payment management
            'how.*check.*payments|how.*view.*payments|how.*payment.*status': {
                title: 'How to Check Your Payments',
                steps: [
                    'Go to the "Payment Details" section',
                    'View your payment summary and analytics',
                    'Check completed, pending, and failed payments',
                    'Download payment reports if needed',
                    'Handle any payment disputes from this section'
                ],
                tips: ['Monitor payment success rates regularly', 'Address disputes quickly to maintain good standing']
            },
            
            // Analytics and insights
            'how.*check.*analytics|how.*view.*reports|how.*business.*insights': {
                title: 'How to View Business Analytics',
                steps: [
                    'Your dashboard homepage shows key business metrics',
                    'Scroll down to see detailed analytics sections',
                    'Use the chat to ask for specific insights',
                    'Try: "Show me business forecast" or "Payment analytics"',
                    'Download reports for detailed analysis'
                ],
                tips: ['Check analytics regularly to track business performance', 'Use insights to make informed business decisions']
            },
            
            // CSV upload
            'how.*upload.*csv|how.*import.*orders|how.*csv.*orders': {
                title: 'How to Upload CSV Orders',
                steps: [
                    'Prepare your CSV file with order data',
                    'Go to the chat interface in your dashboard',
                    'Click the file upload button (📎 icon)',
                    'Select your CSV file and upload',
                    'The system will process and add your orders automatically',
                    'You\'ll get a summary of processed orders'
                ],
                tips: ['Use the demo CSV file as a template', 'Ensure your CSV format matches the required structure']
            },
            
            // General help
            'what.*dashboard|what.*seller.*dashboard|what.*flipkart.*seller': {
                title: 'What is the Flipkart Seller Dashboard?',
                description: 'The Flipkart Seller Dashboard is your complete business management tool that helps you:',
                features: [
                    'Manage your product catalog and inventory',
                    'Track orders and update their status',
                    'Monitor payments and handle disputes',
                    'View business analytics and insights',
                    'Get AI-powered recommendations',
                    'Process bulk orders via CSV upload'
                ],
                tips: ['Use the chat feature for quick help', 'Explore all sections to understand your business better']
            }
        };

        // Find matching explanation
        for (const [pattern, explanation] of Object.entries(explanations)) {
            if (lowerMessage.match(pattern)) {
                return this.formatFeatureExplanation(explanation);
            }
        }

        // If no specific match, provide general help
        return this.provideGeneralHelp();
    }

    /**
     * Format feature explanation into WhatsApp-friendly message
     */
    formatFeatureExplanation(explanation) {
        let message = `*${explanation.title}* 📚\n\n`;

        if (explanation.description) {
            message += `${explanation.description}\n\n`;
        }

        if (explanation.steps) {
            message += '*Here are the steps:*\n\n';
            explanation.steps.forEach((step, index) => {
                message += `${index + 1}. ${step}\n`;
            });
            message += '\n';
        }

        if (explanation.features) {
            message += '*Key Features:*\n\n';
            explanation.features.forEach(feature => {
                message += `• ${feature}\n`;
            });
            message += '\n';
        }

        if (explanation.tips) {
            message += '*💡 Pro Tips:*\n\n';
            explanation.tips.forEach(tip => {
                message += `• ${tip}\n`;
            });
        }

        message += '\nNeed more help? Just ask me! 🤖';

        return {
            success: true,
            message: message,
            responseType: 'feature_explanation',
            messageCategory: 'help'
        };
    }

    /**
     * Provide general help when specific feature not found
     */
    provideGeneralHelp() {
        const message = `*How Can I Help You?* 🤖\n\nI can help you with many things! Here are some common questions:\n\n*📦 Product Management:*\n• "How to add a new product?"\n• "How to update product stock?"\n• "How to check inventory?"\n\n*📋 Order Management:*\n• "How to check my orders?"\n• "How to update order status?"\n• "How to process CSV orders?"\n\n*💳 Payment Management:*\n• "How to check my payments?"\n• "How to view payment analytics?"\n• "How to handle disputes?"\n• "How to view business analytics?"\n• "How to get business forecast?"\n• "How to check sales trends?"\n\nJust ask me any of these questions or something similar! 💬`;

        return {
            success: true,
            message: message,
            responseType: 'general_help',
            messageCategory: 'help'
        };
    }

    // ===== VERSION MANAGEMENT FOR PRICING CONCEPTS =====

    /**
     * Handle version-related queries and explain differences
     */
    handleVersionQueries(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('version') || lowerMessage.includes('v1') || lowerMessage.includes('v2')) {
            return this.explainVersionDifferences();
        }
        
        if (lowerMessage.includes('pricing') || lowerMessage.includes('profit margin') || lowerMessage.includes('flat sales')) {
            return this.explainPricingConcepts();
        }
        
        return null;
    }

    /**
     * Explain differences between versions
     */
    explainVersionDifferences() {
        const v1 = this.versionHistory['v1.0'];
        const v2 = this.versionHistory['v2.0'];
        
        const message = `*Dashboard Version Comparison* 📊\n\n*Current Version: ${this.currentVersion}*\n\n*🔄 What Changed from V1 to V2:*\n\n*V1.0 - Basic Dashboard:*\n• ${v1.features.join('\n• ')}\n• ${v1.pricingModel}\n\n*V2.0 - Enhanced Analytics Dashboard:*\n• ${v2.features.join('\n• ')}\n• ${v2.pricingModel}\n\n*🚀 Key Improvements in V2:*\n• *AI-Powered Insights:* Get smart business recommendations\n• *Dynamic Analytics:* Real-time calculations based on your data\n• *CSV Processing:* Bulk order uploads for efficiency\n• *Advanced Pricing:* Better profit margin calculations\n• *Smart Alerts:* Automatic low stock notifications\n• *Payment Analytics:* Detailed payment tracking\n\n*💡 Benefits of V2:*\n• More accurate business insights\n• Faster inventory management\n• Better decision-making tools\n• Automated processes\n• Enhanced user experience\n\nYou're currently using V2.0 - the latest and greatest! 🎉`;

        return {
            success: true,
            message: message,
            responseType: 'version_comparison',
            messageCategory: 'system'
        };
    }

    /**
     * Explain pricing concepts and improvements
     */
    explainPricingConcepts() {
        const message = `*Pricing Concepts & Improvements* 💰\n\n*📈 V1.0 - Simple Pricing:*\n• Basic profit margin calculation\n• Fixed thresholds for all products\n• Limited pricing insights\n\n*🚀 V2.0 - Advanced Pricing:*\n• *Dynamic Profit Margins:* Calculated based on your actual data\n• *Smart Thresholds:* Automatically adjusted for your business\n• *Flat Sales Analysis:* Track consistent performers\n• *Trending Products:* Identify high-velocity items\n• *Low Stock Alerts:* Based on your sales patterns\n• *High Profit Products:* Dynamic identification\n\n*💡 How V2 Pricing Helps You:*\n• *Better Pricing Decisions:* Set optimal prices based on market data\n• *Inventory Optimization:* Know exactly when to restock\n• *Profit Maximization:* Focus on high-margin products\n• *Trend Spotting:* Identify what's selling well\n• *Risk Management:* Avoid stockouts and overstocking\n\n*🔧 Key Features:*\n• Automatic threshold calculation\n• Real-time profit margin updates\n• Sales velocity tracking\n• Smart restock recommendations\n• Performance-based insights\n\nYour pricing is now smarter and more accurate! 📊`;

        return {
            success: true,
            message: message,
            responseType: 'pricing_explanation',
            messageCategory: 'analytics'
        };
    }

    // ===== NEW CAPABILITY 4: BROADCAST & CHANGE MANAGEMENT =====

    /**
     * Handle broadcast and change-related queries from sellers
     * @param {string} message - Seller's question about changes
     * @returns {Object} Personalized response about changes
     */
    handleBroadcastQueries(message) {
        const lowerMessage = message.toLowerCase();
        
        // Change notification patterns
        const changePatterns = {
            // General change queries
            'what.*changed|what.*new|what.*updated|what.*different|what.*improved': {
                title: 'Recent Changes & Updates',
                response: this.generatePersonalizedChangeSummary(),
                type: 'general_changes'
            },
            
            // Specific feature changes
            'dashboard.*changed|dashboard.*new|dashboard.*updated': {
                title: 'Dashboard Changes',
                response: this.generateDashboardChangeSummary(),
                type: 'dashboard_changes'
            },
            
            // Pricing changes
            'pricing.*changed|pricing.*new|pricing.*updated|profit.*margin.*changed': {
                title: 'Pricing & Profit Margin Changes',
                response: this.generatePricingChangeSummary(),
                type: 'pricing_changes'
            },
            
            // Inventory changes
            'inventory.*changed|stock.*changed|inventory.*new|stock.*new': {
                title: 'Inventory Management Changes',
                response: this.generateInventoryChangeSummary(),
                type: 'inventory_changes'
            },
            
            // Analytics changes
            'analytics.*changed|analytics.*new|reports.*changed|insights.*new': {
                title: 'Analytics & Insights Changes',
                response: this.generateAnalyticsChangeSummary(),
                type: 'analytics_changes'
            },
            
            // Why questions
            'why.*changed|why.*updated|why.*new|reason.*change|purpose.*change': {
                title: 'Why These Changes Were Made',
                response: this.generateChangeRationale(),
                type: 'change_rationale'
            },
            
            // How to use new features
            'how.*use.*new|how.*new.*feature|how.*updated.*feature|how.*changed.*feature': {
                title: 'How to Use New Features',
                response: this.generateFeatureUsageGuide(),
                type: 'feature_usage'
            },
            
            // Impact on business
            'how.*affect.*business|impact.*business|benefit.*business|help.*business': {
                title: 'Business Impact of Changes',
                response: this.generateBusinessImpactAnalysis(),
                type: 'business_impact'
            }
        };

        // Find matching pattern
        for (const [pattern, changeInfo] of Object.entries(changePatterns)) {
            if (lowerMessage.match(pattern)) {
                return this.formatChangeResponse(changeInfo);
            }
        }

        // If no specific match, provide general change information
        return this.provideGeneralChangeInfo();
    }

    /**
     * Generate personalized change summary based on seller's data
     */
    generatePersonalizedChangeSummary() {
        const sellerData = this.sellerData;
        const products = sellerData.products || [];
        const orders = sellerData.orders || [];
        
        // Analyze seller's specific situation
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;
        const recentOrders = orders.length;
        
        let personalizedMessage = `*Recent Changes That Matter to You* 📊\n\n`;
        
        if (lowStockProducts > 0) {
            personalizedMessage += `⚠️ *Low Stock Alert:* You have ${lowStockProducts} products with low stock. The new inventory alerts will help you manage this better.\n\n`;
        }
        
        if (highProfitProducts > 0) {
            personalizedMessage += `💰 *High Profit Products:* You have ${highProfitProducts} high-margin products. The new pricing analytics will help you optimize these further.\n\n`;
        }
        
        if (recentOrders > 0) {
            personalizedMessage += `📦 *Order Management:* With ${recentOrders} orders, the new order processing features will save you time.\n\n`;
        }
        
        personalizedMessage += `*Key Changes for Your Business:*\n\n`;
        personalizedMessage += `✨ *V2.0 Dashboard Updates:*\n`;
        personalizedMessage += `• Faster loading times for better productivity\n`;
        personalizedMessage += `• Smart inventory alerts to prevent stockouts\n`;
        personalizedMessage += `• Advanced pricing insights for better profits\n`;
        personalizedMessage += `• CSV order processing for bulk operations\n`;
        personalizedMessage += `• Real-time analytics and predictions\n\n`;
        
        personalizedMessage += `*💡 How This Helps You:*\n`;
        personalizedMessage += `• Save time with automated processes\n`;
        personalizedMessage += `• Increase profits with better insights\n`;
        personalizedMessage += `• Reduce stockouts with smart alerts\n`;
        personalizedMessage += `• Scale your business with bulk operations\n\n`;
        
        personalizedMessage += `*🚀 Next Steps:*\n`;
        personalizedMessage += `• Try the new CSV upload feature\n`;
        personalizedMessage += `• Check your inventory alerts\n`;
        personalizedMessage += `• Review pricing recommendations\n`;
        personalizedMessage += `• Explore the new analytics dashboard`;

        return personalizedMessage;
    }

    /**
     * Generate dashboard-specific change summary
     */
    generateDashboardChangeSummary() {
        return `*Dashboard Changes & Improvements* 🖥️\n\n*What's New in Your Dashboard:*\n\n✨ *Performance Improvements:*\n• 50% faster loading times\n• Smoother navigation experience\n• Better mobile responsiveness\n\n📊 *New Analytics Sections:*\n• Real-time business insights\n• Dynamic profit margin calculations\n• Trending products analysis\n• Sales velocity tracking\n\n🔔 *Smart Notifications:*\n• Low stock alerts based on your sales patterns\n• High profit product recommendations\n• Restock suggestions with demand forecasting\n\n📦 *Enhanced Inventory Management:*\n• Bulk inventory updates\n• Category-wise stock management\n• Automated stock level calculations\n\n💳 *Improved Payment Tracking:*\n• Detailed payment analytics\n• Dispute management tools\n• Payment success rate monitoring\n\n*💡 How to Use New Features:*\n• Use the chat interface for quick actions\n• Try "Update all Electronics stock to 100"\n• Ask "Show me trending products"\n• Use "Process CSV orders" for bulk uploads`;
    }

    /**
     * Generate pricing change summary
     */
    generatePricingChangeSummary() {
        return `*Pricing & Profit Margin Improvements* 💰\n\n*What Changed in Pricing:*\n\n🔄 *From V1 to V2 Pricing:*\n\n*V1.0 - Basic Pricing:*\n• Simple profit margin calculation\n• Fixed thresholds for all products\n• Limited pricing insights\n\n*V2.0 - Advanced Pricing:*\n• Dynamic profit margins based on your data\n• Smart thresholds that adapt to your business\n• Flat sales analysis for consistent performers\n• Trending products identification\n• Real-time pricing recommendations\n\n*💡 Key Improvements:*\n• *Dynamic Calculations:* Thresholds now based on your actual sales data\n• *Smart Alerts:* Get notified about high-profit opportunities\n• *Trend Analysis:* Identify products with growing demand\n• *Competitive Insights:* Better pricing recommendations\n• *Profit Optimization:* Focus on your best-performing products\n\n*🚀 How This Benefits You:*\n• More accurate profit calculations\n• Better pricing decisions\n• Increased profit margins\n• Reduced pricing errors\n• Data-driven insights\n\n*💬 Try These Commands:*\n• "Show me high profit products"\n• "What are my trending products?"\n• "Update pricing for [product name]"\n• "Show me pricing analytics"`;
    }

    /**
     * Generate inventory change summary
     */
    generateInventoryChangeSummary() {
        return `*Inventory Management Improvements* 📦\n\n*What's New in Inventory:*\n\n🔄 *Smart Inventory Management:*\n\n*Before (V1.0):*\n• Manual stock updates\n• Fixed low stock thresholds\n• Basic inventory tracking\n\n*Now (V2.0):*\n• Dynamic stock thresholds based on your sales\n• Automated low stock alerts\n• Bulk inventory updates\n• Demand forecasting\n• Smart restock recommendations\n\n*✨ New Features:*\n• *Dynamic Thresholds:* Low stock alerts now based on your actual sales velocity\n• *Bulk Updates:* Update multiple products at once\n• *CSV Processing:* Import orders and update inventory automatically\n• *Demand Forecasting:* Predict when you'll need to restock\n• *Category Management:* Update all products in a category together\n\n*💡 How to Use New Features:*\n• *Bulk Update:* "Update all Electronics stock to 100"\n• *Individual Update:* "Update Wireless Headphones stock to 150"\n• *CSV Upload:* Upload order files to automatically update inventory\n• *Stock Check:* "Show me low stock products"\n• *Analytics:* "Show me inventory analytics"\n\n*🚀 Benefits for Your Business:*\n• Prevent stockouts with smart alerts\n• Save time with bulk operations\n• Better inventory planning\n• Reduced manual work\n• Improved customer satisfaction`;
    }

    /**
     * Generate analytics change summary
     */
    generateAnalyticsChangeSummary() {
        return `*Analytics & Insights Improvements* 📊\n\n*What's New in Analytics:*\n\n🔄 *From Basic to Advanced Analytics:*\n\n*V1.0 - Basic Analytics:*\n• Simple sales reports\n• Basic profit calculations\n• Limited insights\n\n*V2.0 - Advanced Analytics:*\n• AI-powered business predictions\n• Dynamic trend analysis\n• Real-time performance metrics\n• Personalized recommendations\n• Predictive analytics\n\n*✨ New Analytics Features:*\n• *Business Predictions:* Get forecasts for revenue, orders, and growth\n• *Dynamic Thresholds:* Analytics adapt to your business size\n• *Trending Products:* Identify high-velocity items\n• *Flat Sales Analysis:* Track consistent performers\n• *Seasonality Insights:* Understand seasonal patterns\n• *Performance Benchmarks:* Compare with industry standards\n\n*💡 How to Access New Analytics:*\n• *Business Forecast:* "Show me business predictions"\n• *Sales Trends:* "Show me sales trends"\n• *Product Performance:* "Show me trending products"\n• *Payment Analytics:* "Show me payment analytics"\n• *Inventory Insights:* "Show me inventory analytics"\n\n*🚀 Business Benefits:*\n• Make data-driven decisions\n• Identify growth opportunities\n• Optimize pricing strategies\n• Improve inventory management\n• Better resource planning\n\n*💬 Try These Commands:*\n• "What's my business forecast?"\n• "Show me sales trends"\n• "Which products are trending?"\n• "How are my payments performing?"`;
    }

    /**
     * Generate change rationale
     */
    generateChangeRationale() {
        return `*Why These Changes Were Made* 🤔\n\n*The Reasoning Behind V2.0:*\n\n*📈 Business Growth Focus:*\n• You asked for better tools to grow your business\n• Sellers needed more accurate insights\n• Manual processes were taking too much time\n\n*💡 Data-Driven Decisions:*\n• Fixed thresholds didn't work for all business sizes\n• One-size-fits-all approach wasn't effective\n• Sellers needed personalized recommendations\n\n*⚡ Performance Improvements:*\n• Dashboard was too slow for daily use\n• Loading times affected productivity\n• Mobile experience needed improvement\n\n*🎯 Specific Problems Solved:*\n\n*Problem 1: Inaccurate Stock Alerts*\n• *Before:* Fixed 10-unit threshold for everyone\n• *Now:* Dynamic thresholds based on your sales patterns\n• *Why:* A small seller and large seller have different needs\n\n*Problem 2: Limited Pricing Insights*\n• *Before:* Basic profit margin calculation\n• *Now:* Dynamic analysis with trend identification\n• *Why:* Better pricing leads to higher profits\n\n*Problem 3: Manual Inventory Management*\n• *Before:* Update products one by one\n• *Now:* Bulk updates and CSV processing\n• *Why:* Save time and reduce errors\n\n*Problem 4: Basic Analytics*\n• *Before:* Simple reports with limited insights\n• *Now:* AI-powered predictions and recommendations\n• *Why:* Help you make better business decisions\n\n*🚀 The Result:*\n• More accurate insights for your business\n• Time-saving automated processes\n• Better tools for growth\n• Personalized experience\n• Improved profitability\n\n*💬 Your Feedback Matters:*\nThese changes were based on seller feedback like yours. We're always listening and improving!`;
    }

    /**
     * Generate feature usage guide
     */
    generateFeatureUsageGuide() {
        return `*How to Use New Features* 🛠️\n\n*Step-by-Step Guides for New Features:*\n\n*📦 CSV Order Processing:*\n1. Prepare your CSV file with order data\n2. Go to the chat interface\n3. Click the file upload button (📎)\n4. Select your CSV file\n5. The system processes orders automatically\n6. You get a summary of processed orders\n\n*🔧 Bulk Inventory Updates:*\n1. Use the command: "Update all [Category] stock to [number]"\n2. Example: "Update all Electronics stock to 100"\n3. Or update individual products: "Update Wireless Headphones stock to 150"\n\n*📊 New Analytics Commands:*\n• "Show me business forecast" - Get revenue predictions\n• "Show me sales trends" - View sales patterns\n• "Show me trending products" - Find high-velocity items\n• "Show me payment analytics" - Payment performance\n• "Show me inventory analytics" - Stock insights\n\n*💳 Enhanced Payment Management:*\n• "Show me payment disputes" - Handle disputes\n• "What's my payment status?" - Check payment status\n• "Show me payment analytics" - Detailed insights\n\n*📱 Mobile-Friendly Features:*\n• All new features work perfectly on mobile\n• WhatsApp-style interface for easy use\n• Quick action buttons for common tasks\n• Voice-friendly commands\n\n*💡 Pro Tips:*\n• Use the chat for quick actions instead of navigating menus\n• Try bulk operations to save time\n• Check analytics regularly for insights\n• Use CSV upload for large order batches\n• Set up alerts for important notifications\n\n*🚀 Getting Started:*\n1. Try: "How do I check my payments?"\n2. Then: "Show me business forecast"\n3. Next: "Update all Electronics stock to 100"\n4. Finally: "Show me trending products"`;
    }

    /**
     * Generate business impact analysis
     */
    generateBusinessImpactAnalysis() {
        const sellerData = this.sellerData;
        const products = sellerData.products || [];
        const orders = sellerData.orders || [];
        
        // Calculate potential impact based on seller's data
        const avgOrderValue = orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0;
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        
        return `*Business Impact Analysis* 📈\n\n*How V2.0 Changes Will Impact Your Business:*\n\n*💰 Revenue Impact:*\n• *Current Avg Order Value:* ₹${Math.round(avgOrderValue).toLocaleString()}\n• *Potential Increase:* 15-25% with better pricing insights\n• *Stockout Prevention:* Save ₹${Math.round(avgOrderValue * 0.1).toLocaleString()} per prevented stockout\n\n*⏰ Time Savings:*\n• *Bulk Operations:* Save 2-3 hours per week\n• *Automated Alerts:* Save 1 hour daily on inventory checks\n• *CSV Processing:* Save 30 minutes per batch of orders\n• *Total Weekly Savings:* 15-20 hours\n\n*📦 Inventory Optimization:*\n• *Current Products:* ${totalProducts}\n• *Low Stock Items:* ${lowStockProducts}\n• *Potential Stockout Prevention:* 80% reduction\n• *Better Inventory Turnover:* 25% improvement expected\n\n*🎯 Specific Benefits for Your Business:*\n\n*If You're a Small Seller:*\n• More accurate insights for your business size\n• Better tools to compete with larger sellers\n• Automated processes to save time\n\n*If You're a Growing Seller:*\n• Scalable tools for business expansion\n• Better analytics for decision making\n• Bulk operations for efficiency\n\n*If You're a Large Seller:*\n• Advanced analytics for complex operations\n• Bulk management tools\n• Predictive insights for planning\n\n*📊 Expected Improvements:*\n• *Profit Margins:* 10-20% increase\n• *Customer Satisfaction:* 25% improvement\n• *Operational Efficiency:* 30% time savings\n• *Inventory Accuracy:* 95%+ accuracy\n• *Order Processing:* 50% faster\n\n*🚀 Action Plan:*\n1. *Week 1:* Explore new analytics features\n2. *Week 2:* Implement bulk inventory updates\n3. *Week 3:* Start using CSV order processing\n4. *Week 4:* Optimize pricing based on insights\n\n*💬 Track Your Progress:*\n• Monitor your profit margins monthly\n• Track time saved on operations\n• Measure customer satisfaction\n• Review inventory accuracy\n\n*Remember:* These improvements are designed to help you grow your business more efficiently!`;
    }

    /**
     * Format change response for WhatsApp
     */
    formatChangeResponse(changeInfo) {
        return {
            success: true,
            message: changeInfo.response,
            responseType: changeInfo.type,
            messageCategory: 'changes'
        };
    }

    /**
     * Provide general change information
     */
    provideGeneralChangeInfo() {
        return {
            success: true,
            message: `*Recent Platform Changes* 📢\n\nWe've made several improvements to help your business grow!\n\n*🔍 What You Can Ask About:*\n\n*📊 Analytics & Insights:*\n• "What changed in analytics?"\n• "Show me new features"\n• "How do I use new analytics?"\n\n*💰 Pricing & Profits:*\n• "What changed in pricing?"\n• "How do profit margins work now?"\n• "What are the pricing improvements?"\n\n*📦 Inventory Management:*\n• "What's new in inventory?"\n• "How do I use bulk updates?"\n• "What changed in stock management?"\n\n*🖥️ Dashboard Features:*\n• "What changed in the dashboard?"\n• "How do I use new features?"\n• "What are the improvements?"\n\n*💡 Business Impact:*\n• "How do these changes help my business?"\n• "What's the impact on my profits?"\n• "Why were these changes made?"\n\n*🚀 Quick Start:*\nTry asking: "What changed in analytics?" or "How do these changes help my business?"`,
            responseType: 'general_changes',
            messageCategory: 'changes'
        };
    }

    // Handle broadcast and changes
    handleBroadcastAndChanges(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for change-related queries
        const changeKeywords = ['what\'s new', 'changes', 'updates', 'new features', 'recent changes', 'what changed', 'new functionality'];
        const isChangeQuery = changeKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // Check for follow-up questions about changes
        const followUpKeywords = ['how does this help', 'benefits', 'impact', 'why', 'what does this mean', 'explain', 'help my business'];
        const isFollowUpQuery = followUpKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isChangeQuery || isFollowUpQuery) {
            const products = this.sellerData.products || [];
            const orders = this.sellerData.orders || [];
            const analytics = this.sellerData.analytics || {};
            
            // Calculate business metrics
            const lowStockProducts = products.filter(p => p.stock < 10).length;
            const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;
            const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
            const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
            
            if (isFollowUpQuery) {
                // Provide detailed business impact analysis
                return {
                    success: true,
                    message: `<div class="ai-summary-container"><div class="summary-header"><h3>💼 Business Impact Analysis</h3></div><div class="summary-section"><h4>📊 Your Current Business State</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">💰 Total Revenue</span><span class="insight-value">₹${totalRevenue.toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">📦 Total Orders</span><span class="insight-value">${orders.length}</span></div><div class="insight-item"><span class="insight-label">📈 Avg Order Value</span><span class="insight-value">₹${Math.round(avgOrderValue).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">⚠️ Low Stock Items</span><span class="insight-value">${lowStockProducts}</span></div></div></div><div class="summary-section"><h4>🎯 How These Changes Help Your Business</h4><div class="benefits-list"><div class="benefit-item"><span class="benefit-icon">⏰</span><span class="benefit-title">Time Savings</span><span class="benefit-desc">Automated inventory alerts save 2-3 hours daily on stock management</span></div><div class="benefit-item"><span class="benefit-icon">💰</span><span class="benefit-title">Profit Optimization</span><span class="benefit-desc">Pricing insights can increase margins by 15-25% on ${highProfitProducts} high-margin products</span></div><div class="benefit-item"><span class="benefit-icon">📈</span><span class="benefit-title">Revenue Growth</span><span class="benefit-desc">CSV bulk processing can handle 10x more orders without manual work</span></div><div class="benefit-item"><span class="benefit-icon">🛡️</span><span class="benefit-title">Risk Reduction</span><span class="benefit-desc">Smart alerts prevent stockouts that could cost ₹${Math.round(totalRevenue * 0.1).toLocaleString()} in lost sales</span></div></div></div><div class="summary-section"><h4>📋 Specific Benefits for Your Business</h4><ul><li><strong>Inventory Management:</strong> Prevent stockouts on ${lowStockProducts} low-stock items</li><li><strong>Pricing Strategy:</strong> Optimize ${highProfitProducts} high-margin products for better profits</li><li><strong>Order Processing:</strong> Handle ${orders.length} orders more efficiently</li><li><strong>Business Scaling:</strong> Process bulk orders without manual data entry</li><li><strong>Analytics:</strong> Make data-driven decisions with real-time insights</li></ul></div><div class="summary-footer"><p>Ready to implement these improvements? Ask me about specific features! 🚀</p></div></div>`,
                    responseType: 'business_impact',
                    messageCategory: 'changes'
                };
            } else {
                // Show what's new
                return {
                    success: true,
                    message: `<div class="ai-summary-container"><div class="summary-header"><h3>🆕 Recent Changes That Matter to You</h3></div><div class="summary-section"><h4>⚠️ Current Business Alerts</h4><div class="alerts-grid"><div class="alert-item ${lowStockProducts > 0 ? 'alert-warning' : 'alert-success'}"><span class="alert-icon">📦</span><span class="alert-text">Low Stock Alert: ${lowStockProducts} products need attention</span></div><div class="alert-item alert-info"><span class="alert-icon">💰</span><span class="alert-text">High Profit Products: ${highProfitProducts} items with >20% margin</span></div><div class="alert-item alert-success"><span class="alert-icon">📋</span><span class="alert-text">Order Management: ${orders.length} orders to process</span></div></div></div><div class="summary-section"><h4>✨ V2.0 Dashboard Updates</h4><ul><li><strong>🚀 Performance:</strong> Faster loading times for better productivity</li><li><strong>📊 Smart Alerts:</strong> Inventory alerts to prevent stockouts</li><li><strong>💰 Pricing Insights:</strong> Advanced analytics for better profits</li><li><strong>📄 CSV Processing:</strong> Bulk order processing for efficiency</li><li><strong>📈 Real-time Analytics:</strong> Live business insights and predictions</li></ul></div><div class="summary-section"><h4>💡 How This Helps You</h4><ul><li>Save time with automated processes</li><li>Increase profits with better insights</li><li>Reduce stockouts with smart alerts</li><li>Scale your business with bulk operations</li></ul></div><div class="summary-footer"><p>Ask "How do these changes help my business?" for detailed impact analysis 📊</p></div></div>`,
                    responseType: 'general_changes',
                    messageCategory: 'changes'
                };
            }
        }
        
        // Check for broadcast queries
        const broadcastKeywords = ['announcement', 'broadcast', 'message to all', 'notify', 'update everyone'];
        const isBroadcastQuery = broadcastKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isBroadcastQuery) {
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>📢 Broadcast Management</h3></div><div class="summary-section"><h4>🎯 Send Messages to Sellers</h4><p>You can send announcements to:</p><ul><li><strong>All sellers:</strong> General updates and announcements</li><li><strong>Specific sellers:</strong> Targeted messages by seller ID</li><li><strong>Category-based:</strong> Messages to sellers in specific categories</li></ul></div><div class="summary-section"><h4>💬 Message Types</h4><ul><li><strong>Feature Updates:</strong> New dashboard capabilities</li><li><strong>Policy Changes:</strong> Platform updates and guidelines</li><li><strong>Promotional Offers:</strong> Special deals and incentives</li><li><strong>Technical Support:</strong> Maintenance and support information</li></ul></div><div class="summary-footer"><p>Use the broadcast interface to send targeted messages 📢</p></div></div>`,
                responseType: 'broadcast_info',
                messageCategory: 'broadcast'
            };
        }
        
        return null; // Let other handlers process
    }

    // Handle product-specific queries
    handleProductSpecificQueries(message) {
        const lowerMessage = message.toLowerCase();
        
        // Pattern to extract product name from queries like:
        // "Show me [Product Name] sales"
        // "Show me [Product Name] history"
        // "[Product Name] sales"
        // "[Product Name] performance"
        // "[Product Name] analytics"
        const productPatterns = [
            /show\s+me\s+(.+?)\s+(sales|history|performance|analytics|details|info|stock|inventory)/i,
            /(.+?)\s+(sales|history|performance|analytics|details|info|stock|inventory)/i,
            /(sales|history|performance|analytics|details|info|stock|inventory)\s+for\s+(.+)/i
        ];
        
        let productName = null;
        let queryType = null;
        
        for (const pattern of productPatterns) {
            const match = message.match(pattern);
            if (match) {
                if (match[1] && match[2]) {
                    productName = match[1].trim();
                    queryType = match[2].toLowerCase();
                } else if (match[2] && match[3]) {
                    productName = match[3].trim();
                    queryType = match[2].toLowerCase();
                }
                break;
            }
        }
        
        if (!productName) {
            return null;
        }
        
        // Find the product
        const product = this.findProductByName(productName);
        if (!product) {
            return {
                success: true,
                message: `<div class="ai-summary-container"><div class="summary-header"><h3>🔍 Product Not Found</h3></div><div class="summary-section"><p>I couldn't find a product named "${productName}". Here are your available products:</p><div class="product-list">${(this.sellerData.products || []).slice(0, 10).map(p => `<div class="product-item"><span class="product-name">${p.name}</span><span class="product-stock">Stock: ${p.stock}</span><span class="product-price">₹${p.price}</span></div>`).join('')}</div><p><strong>Try:</strong> "Show me [exact product name] sales" or "Show me [exact product name] history"</p></div></div>`,
                responseType: 'product_not_found',
                messageCategory: 'products'
            };
        }
        
        // Handle different query types
        switch (queryType) {
            case 'sales':
                return this.generateProductSalesInfo(product);
            case 'history':
                return this.generateProductHistoryInfo(product);
            case 'performance':
                return this.generateProductPerformanceInfo(product);
            case 'analytics':
                return this.generateProductAnalyticsInfo(product);
            case 'details':
            case 'info':
                return this.generateProductDetailsInfo(product);
            case 'stock':
            case 'inventory':
                return this.generateProductStockInfo(product);
            default:
                return this.generateProductOverviewInfo(product);
        }
    }
    
    // Generate product sales information
    generateProductSalesInfo(product) {
        const orders = this.sellerData.orders || [];
        const productOrders = orders.filter(order => {
            const products = order.products || [];
            return products.some(p => p.toLowerCase().includes(product.name.toLowerCase()));
        });
        
        const totalSales = productOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const avgOrderValue = productOrders.length > 0 ? totalSales / productOrders.length : 0;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📊 ${product.name} - Sales Analysis</h3></div><div class="summary-grid"><div class="summary-card"><h4>📦 Total Orders</h4><div class="stats-number">${productOrders.length}</div></div><div class="summary-card"><h4>💰 Total Sales</h4><div class="stats-number">₹${totalSales.toLocaleString()}</div></div><div class="summary-card"><h4>📈 Avg Order Value</h4><div class="stats-number">₹${Math.round(avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>📅 Recent Activity</h4><div class="stats-number">${Math.min(5, productOrders.length)} orders</div></div></div><div class="summary-section"><h4>📋 Recent Orders</h4><div class="order-list">${productOrders.slice(0, 5).map((order, index) => `<div class="order-item"><span class="order-number">#${index + 1}</span><span class="order-id">${order.id || 'N/A'}</span><span class="customer-name">${order.customer_name}</span><span class="total">₹${parseFloat(order.total).toLocaleString()}</span><span class="status">${order.status}</span><span class="date">${new Date(order.order_date).toLocaleDateString()}</span></div>`).join('')}</div></div><div class="summary-footer"><p>💡 Ask "Show me ${product.name} history" for detailed product history 📊</p></div></div>`,
            responseType: 'product_sales',
            messageCategory: 'products'
        };
    }
    
    // Generate product history information
    generateProductHistoryInfo(product) {
        const orders = this.sellerData.orders || [];
        const productOrders = orders.filter(order => {
            const products = order.products || [];
            return products.some(p => p.toLowerCase().includes(product.name.toLowerCase()));
        });
        
        const profitMargin = product.profit_margin || 0;
        const totalRevenue = productOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const estimatedProfit = totalRevenue * (profitMargin / 100);
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📚 ${product.name} - Product History</h3></div><div class="summary-section"><h4>📊 Product Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Category</span><span class="insight-value">${product.category}</span></div><div class="insight-item"><span class="insight-label">Current Price</span><span class="insight-value">₹${product.price}</span></div><div class="insight-item"><span class="insight-label">Current Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">Profit Margin</span><span class="insight-value">${profitMargin}%</span></div><div class="insight-item"><span class="insight-label">Status</span><span class="insight-value">${product.status}</span></div></div></div><div class="summary-section"><h4>📈 Sales Performance</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Total Orders</span><span class="insight-value">${productOrders.length}</span></div><div class="insight-item"><span class="insight-label">Total Revenue</span><span class="insight-value">₹${totalRevenue.toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">Estimated Profit</span><span class="insight-value">₹${Math.round(estimatedProfit).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">Avg Order Value</span><span class="insight-value">₹${productOrders.length > 0 ? Math.round(totalRevenue / productOrders.length).toLocaleString() : '0'}</span></div></div></div><div class="summary-section"><h4>📋 Description</h4><p>${product.description || 'No description available'}</p></div><div class="summary-footer"><p>💡 Ask "Show me ${product.name} performance" for detailed analytics 📊</p></div></div>`,
            responseType: 'product_history',
            messageCategory: 'products'
        };
    }
    
    // Generate product performance information
    generateProductPerformanceInfo(product) {
        const orders = this.sellerData.orders || [];
        const productOrders = orders.filter(order => {
            const products = order.products || [];
            return products.some(p => p.toLowerCase().includes(product.name.toLowerCase()));
        });
        
        const profitMargin = product.profit_margin || 0;
        const totalRevenue = productOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const estimatedProfit = totalRevenue * (profitMargin / 100);
        const stockLevel = product.stock;
        const stockStatus = stockLevel < 10 ? 'Low Stock' : stockLevel < 50 ? 'Medium Stock' : 'Good Stock';
        const stockIcon = stockLevel < 10 ? '⚠️' : stockLevel < 50 ? '📊' : '✅';
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📈 ${product.name} - Performance Analysis</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Revenue</h4><div class="stats-number">₹${totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>💎 Profit</h4><div class="stats-number">₹${Math.round(estimatedProfit).toLocaleString()}</div></div><div class="summary-card"><h4>📦 Orders</h4><div class="stats-number">${productOrders.length}</div></div><div class="summary-card"><h4>${stockIcon} Stock</h4><div class="stats-number">${stockLevel}</div></div></div><div class="summary-section"><h4>📊 Performance Metrics</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Profit Margin</span><span class="insight-value">${profitMargin}%</span></div><div class="insight-item"><span class="insight-label">Stock Status</span><span class="insight-value">${stockStatus}</span></div><div class="insight-item"><span class="insight-label">Avg Order Value</span><span class="insight-value">₹${productOrders.length > 0 ? Math.round(totalRevenue / productOrders.length).toLocaleString() : '0'}</span></div><div class="insight-item"><span class="insight-label">Performance Rating</span><span class="insight-value">${profitMargin > 20 ? 'Excellent' : profitMargin > 10 ? 'Good' : 'Average'}</span></div></div></div><div class="summary-section"><h4>💡 Recommendations</h4><ul>${this.generateProductRecommendations(product, productOrders)}</ul></div><div class="summary-footer"><p>💡 Ask "Show me ${product.name} analytics" for detailed insights 📊</p></div></div>`,
            responseType: 'product_performance',
            messageCategory: 'products'
        };
    }
    
    // Generate product analytics information
    generateProductAnalyticsInfo(product) {
        const orders = this.sellerData.orders || [];
        const productOrders = orders.filter(order => {
            const products = order.products || [];
            return products.some(p => p.toLowerCase().includes(product.name.toLowerCase()));
        });
        
        const profitMargin = product.profit_margin || 0;
        const totalRevenue = productOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        const estimatedProfit = totalRevenue * (profitMargin / 100);
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📊 ${product.name} - Analytics</h3></div><div class="summary-section"><h4>📈 Key Metrics</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Total Revenue</span><span class="insight-value">₹${totalRevenue.toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">Total Profit</span><span class="insight-value">₹${Math.round(estimatedProfit).toLocaleString()}</span></div><div class="insight-item"><span class="insight-label">Order Count</span><span class="insight-value">${productOrders.length}</span></div><div class="insight-item"><span class="insight-label">Profit Margin</span><span class="insight-value">${profitMargin}%</span></div><div class="insight-item"><span class="insight-label">Current Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">Stock Status</span><span class="insight-value">${product.stock < 10 ? 'Low' : product.stock < 50 ? 'Medium' : 'Good'}</span></div></div></div><div class="summary-section"><h4>📋 Recent Orders</h4><div class="order-list">${productOrders.slice(0, 3).map((order, index) => `<div class="order-item"><span class="order-number">#${index + 1}</span><span class="order-id">${order.id || 'N/A'}</span><span class="customer-name">${order.customer_name}</span><span class="total">₹${parseFloat(order.total).toLocaleString()}</span><span class="status">${order.status}</span><span class="date">${new Date(order.order_date).toLocaleDateString()}</span></div>`).join('')}</div></div><div class="summary-footer"><p>💡 Ask "Show me ${product.name} details" for complete product information 📋</p></div></div>`,
            responseType: 'product_analytics',
            messageCategory: 'products'
        };
    }
    
    // Generate product details information
    generateProductDetailsInfo(product) {
        const profitMargin = product.profit_margin || 0;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 ${product.name} - Product Details</h3></div><div class="summary-section"><h4>📊 Product Information</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Category</span><span class="insight-value">${product.category}</span></div><div class="insight-item"><span class="insight-label">Current Price</span><span class="insight-value">₹${product.price}</span></div><div class="insight-item"><span class="insight-label">Current Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">Profit Margin</span><span class="insight-value">${profitMargin}%</span></div><div class="insight-item"><span class="insight-label">Status</span><span class="insight-value">${product.status}</span></div></div></div><div class="summary-section"><h4>📝 Description</h4><p>${product.description || 'No description available'}</p></div><div class="summary-section"><h4>💡 Quick Actions</h4><div class="suggestion-chips"><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} sales')">📊 Sales</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} performance')">📈 Performance</button><button class="suggestion-chip" onclick="sendMessage('Update ${product.name} stock to 100')">📦 Update Stock</button></div></div><div class="summary-footer"><p>💡 Ask "Show me ${product.name} stock" for inventory details 📦</p></div></div>`,
            responseType: 'product_details',
            messageCategory: 'products'
        };
    }
    
    // Generate product stock information
    generateProductStockInfo(product) {
        const stockLevel = product.stock;
        const stockStatus = stockLevel < 10 ? 'Low Stock' : stockLevel < 50 ? 'Medium Stock' : 'Good Stock';
        const stockIcon = stockLevel < 10 ? '⚠️' : stockLevel < 50 ? '📊' : '✅';
        const stockColor = stockLevel < 10 ? 'alert-warning' : stockLevel < 50 ? 'alert-info' : 'alert-success';
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📦 ${product.name} - Stock Information</h3></div><div class="summary-section"><h4>📊 Stock Details</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Current Stock</span><span class="insight-value">${stockLevel} units</span></div><div class="insight-item"><span class="insight-label">Stock Status</span><span class="insight-value">${stockStatus}</span></div><div class="insight-item"><span class="insight-label">Category</span><span class="insight-value">${product.category}</span></div></div></div><div class="summary-section"><h4>${stockIcon} Stock Alert</h4><div class="alert-item ${stockColor}"><span class="alert-icon">${stockIcon}</span><span class="alert-text">${stockLevel < 10 ? 'Low stock alert! Consider restocking soon.' : stockLevel < 50 ? 'Stock is moderate. Monitor for restocking needs.' : 'Stock levels are healthy.'}</span></div></div><div class="summary-section"><h4>💡 Quick Actions</h4><div class="suggestion-chips"><button class="suggestion-chip" onclick="sendMessage('Update ${product.name} stock to 100')">📦 Restock to 100</button><button class="suggestion-chip" onclick="sendMessage('Update ${product.name} stock to 50')">📦 Restock to 50</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} sales')">📊 View Sales</button></div></div><div class="summary-footer"><p>💡 Use "Update ${product.name} stock to [number]" to change stock levels 📦</p></div></div>`,
            responseType: 'product_stock',
            messageCategory: 'products'
        };
    }
    
    // Generate product overview information
    generateProductOverviewInfo(product) {
        const profitMargin = product.profit_margin || 0;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📋 ${product.name} - Product Overview</h3></div><div class="summary-section"><h4>📊 Basic Information</h4><div class="insights-grid"><div class="insight-item"><span class="insight-label">Product Name</span><span class="insight-value">${product.name}</span></div><div class="insight-item"><span class="insight-label">Category</span><span class="insight-value">${product.category}</span></div><div class="insight-item"><span class="insight-label">Price</span><span class="insight-value">₹${product.price}</span></div><div class="insight-item"><span class="insight-label">Stock</span><span class="insight-value">${product.stock} units</span></div><div class="insight-item"><span class="insight-label">Profit Margin</span><span class="insight-value">${profitMargin}%</span></div><div class="insight-item"><span class="insight-label">Status</span><span class="insight-value">${product.status}</span></div></div></div><div class="summary-section"><h4>💡 What would you like to know?</h4><div class="suggestion-chips"><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} sales')">📊 Sales</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} history')">📚 History</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} performance')">📈 Performance</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} analytics')">📊 Analytics</button><button class="suggestion-chip" onclick="sendMessage('Show me ${product.name} stock')">📦 Stock</button></div></div><div class="summary-footer"><p>💡 Ask specific questions like "Show me ${product.name} sales" or "Show me ${product.name} history" 📊</p></div></div>`,
            responseType: 'product_overview',
            messageCategory: 'products'
        };
    }
    
    // Generate product recommendations
    generateProductRecommendations(product, productOrders) {
        const recommendations = [];
        const profitMargin = product.profit_margin || 0;
        const stockLevel = product.stock;
        
        if (stockLevel < 10) {
            recommendations.push('<li>⚠️ <strong>Low Stock Alert:</strong> Consider restocking soon to avoid stockouts</li>');
        }
        
        if (profitMargin > 20) {
            recommendations.push('<li>💎 <strong>High Margin Product:</strong> This product has excellent profit potential</li>');
        } else if (profitMargin < 10) {
            recommendations.push('<li>📈 <strong>Low Margin:</strong> Consider price optimization to improve profitability</li>');
        }
        
        if (productOrders.length === 0) {
            recommendations.push('<li>📊 <strong>No Sales Data:</strong> This product hasn\'t been ordered yet</li>');
        } else if (productOrders.length < 5) {
            recommendations.push('<li>📈 <strong>Low Sales:</strong> Consider promotional activities to boost sales</li>');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('<li>✅ <strong>Product is performing well:</strong> Continue with current strategy</li>');
        }
        
        return recommendations.join('');
    }

    // ===== NEW CAPABILITY 3: BUSINESS SUMMARY =====

    /**
     * Generate business summary information
     */
    generateBusinessSummary() {
        const products = this.sellerData.products || [];
        const orders = this.sellerData.orders || [];
        
        // Calculate total revenue
        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        
        // Calculate total orders
        const totalOrders = orders.length;
        
        // Calculate average order value
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        // Calculate total products
        const totalProducts = products.length;
        
        // Calculate low stock products
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        
        // Calculate high profit products
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>📊 Business Summary</h3></div><div class="summary-grid"><div class="summary-card"><h4>💰 Total Revenue</h4><div class="stats-number">₹${totalRevenue.toLocaleString()}</div></div><div class="summary-card"><h4>📦 Total Orders</h4><div class="stats-number">${totalOrders}</div></div><div class="summary-card"><h4>📈 Avg Order Value</h4><div class="stats-number">₹${Math.round(avgOrderValue).toLocaleString()}</div></div><div class="summary-card"><h4>🛍️ Total Products</h4><div class="stats-number">${totalProducts}</div></div><div class="summary-card"><h4>⚠️ Low Stock Items</h4><div class="stats-number">${lowStockProducts}</div></div><div class="summary-card"><h4>💰 High Profit Products</h4><div class="stats-number">${highProfitProducts}</div></div></div><div class="summary-footer"><p>💡 Use bulk updates: "Update all [category] stock to [number]"</p></div></div>`,
            responseType: 'business_summary',
            messageCategory: 'analytics'
        };
    }

    // ===== NEW CAPABILITY 5: LOW STOCK ALERTS =====

    /**
     * Generate low stock alerts information
     */
    generateLowStockAlerts() {
        const products = this.sellerData.products || [];
        const lowStockProducts = products.filter(p => (p.stock || 0) < 10).length;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>⚠️ Low Stock Alerts</h3></div><div class="summary-section"><p>You have ${lowStockProducts} products with low stock. The new inventory alerts will help you manage this better.</p></div><div class="summary-footer"><p>💡 Use bulk updates: "Update all [category] stock to [number]"</p></div></div>`,
            responseType: 'low_stock_alerts',
            messageCategory: 'inventory'
        };
    }

    // ===== NEW CAPABILITY 6: HIGH PROFIT PRODUCTS =====

    /**
     * Generate high profit products information
     */
    generateHighProfitProducts() {
        const products = this.sellerData.products || [];
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 20).length;
        
        return {
            success: true,
            message: `<div class="ai-summary-container"><div class="summary-header"><h3>💰 High Profit Products</h3></div><div class="summary-section"><p>You have ${highProfitProducts} high-margin products. The new pricing analytics will help you optimize these further.</p></div><div class="summary-footer"><p>💡 Use bulk updates: "Update all [category] stock to [number]"</p></div></div>`,
            responseType: 'high_profit_products',
            messageCategory: 'pricing'
        };
    }
}

module.exports = FlipkartSellerAgent;
