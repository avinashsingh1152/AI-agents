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
                    status: p.status,
                    units_sold: p.units_sold || 0,
                    profit_margin: parseFloat(p.profit_margin) || 0
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

    // Handle user message and generate response
    async handleMessage(message, requestInfo = {}) {
        const startTime = Date.now();
        let response = '';
        let responseType = 'general';
        let messageCategory = 'query';

        try {
            const lowerMessage = message.toLowerCase();

            // Advanced filtering queries with enhanced patterns
            if (lowerMessage.includes('show me') || lowerMessage.includes('filter') || lowerMessage.includes('find') || 
                lowerMessage.includes('get') || lowerMessage.includes('list')) {
                
                // General profit product queries
                if (lowerMessage.includes('profit product') || lowerMessage.includes('profitable product') || 
                    (lowerMessage.includes('profit') && lowerMessage.includes('product'))) {
                    response = this.generateProductFilterResponse('profit_margin', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Category filters
                else if (lowerMessage.includes('fashion') || lowerMessage.includes('clothing')) {
                    response = this.generateProductFilterResponse('category', 'Fashion');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('electronics') || lowerMessage.includes('tech')) {
                    response = this.generateProductFilterResponse('category', 'Electronics');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('home') || lowerMessage.includes('garden')) {
                    response = this.generateProductFilterResponse('category', 'Home & Garden');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('sports') || lowerMessage.includes('outdoor')) {
                    response = this.generateProductFilterResponse('category', 'Sports & Outdoors');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('office') || lowerMessage.includes('supplies')) {
                    response = this.generateProductFilterResponse('category', 'Office Supplies');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('automotive') || lowerMessage.includes('car')) {
                    response = this.generateProductFilterResponse('category', 'Automotive');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('books') || lowerMessage.includes('media')) {
                    response = this.generateProductFilterResponse('category', 'Books & Media');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Stock level filters
                else if (lowerMessage.includes('low stock') || lowerMessage.includes('stock alert') || lowerMessage.includes('out of stock')) {
                    response = this.generateProductFilterResponse('stock_level', 'low');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('medium stock') || lowerMessage.includes('normal stock')) {
                    response = this.generateProductFilterResponse('stock_level', 'medium');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('high stock') || lowerMessage.includes('excess stock')) {
                    response = this.generateProductFilterResponse('stock_level', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Profit margin filters
                else if (lowerMessage.includes('high profit') || lowerMessage.includes('high margin') || lowerMessage.includes('profitable')) {
                    response = this.generateProductFilterResponse('profit_margin', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('medium profit') || lowerMessage.includes('medium margin')) {
                    response = this.generateProductFilterResponse('profit_margin', 'medium');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('low profit') || lowerMessage.includes('low margin') || lowerMessage.includes('unprofitable')) {
                    response = this.generateProductFilterResponse('profit_margin', 'low');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Custom profit margin ranges
                else if (lowerMessage.includes('greater than') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/greater than (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const minMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `>${minMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('more than') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/more than (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const minMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `>${minMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('above') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/above (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const minMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `>${minMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('less than') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/less than (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const maxMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `<${maxMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('below') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/below (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const maxMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `<${maxMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('between') && lowerMessage.includes('%')) {
                    const marginMatch = message.match(/between (\d+(?:\.\d+)?)\s*% and (\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const minMargin = parseFloat(marginMatch[1]);
                        const maxMargin = parseFloat(marginMatch[2]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `${minMargin}-${maxMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                // More flexible profit margin patterns
                else if (lowerMessage.includes('%') && (lowerMessage.includes('profit') || lowerMessage.includes('margin'))) {
                    // Match patterns like "5% profit margin", "> 5%", "5 % profit", etc.
                    const marginMatch = message.match(/(?:>|greater than|more than|above)\s*(\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        const minMargin = parseFloat(marginMatch[1]);
                        response = this.generateProductFilterResponse('profit_margin_custom', `>${minMargin}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    } else {
                        // Match patterns like "5% profit margin", "5 % profit"
                        const simpleMatch = message.match(/(\d+(?:\.\d+)?)\s*%\s*(?:profit|margin)/i);
                        if (simpleMatch) {
                            const margin = parseFloat(simpleMatch[1]);
                            response = this.generateProductFilterResponse('profit_margin_custom', `>${margin}`);
                            responseType = 'product_filter';
                            messageCategory = 'inventory';
                        }
                    }
                }
                // Price range filters
                else if (lowerMessage.includes('under') && lowerMessage.includes('₹')) {
                    const priceMatch = message.match(/under ₹(\d+)/i);
                    if (priceMatch) {
                        const maxPrice = parseInt(priceMatch[1]);
                        response = this.generateProductFilterResponse('price_range', `0-${maxPrice}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('above') && lowerMessage.includes('₹')) {
                    const priceMatch = message.match(/above ₹(\d+)/i);
                    if (priceMatch) {
                        const minPrice = parseInt(priceMatch[1]);
                        response = this.generateProductFilterResponse('price_range', `${minPrice}-999999`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                else if (lowerMessage.includes('between') && lowerMessage.includes('₹')) {
                    const priceMatch = message.match(/between ₹(\d+) and ₹(\d+)/i);
                    if (priceMatch) {
                        const minPrice = parseInt(priceMatch[1]);
                        const maxPrice = parseInt(priceMatch[2]);
                        response = this.generateProductFilterResponse('price_range', `${minPrice}-${maxPrice}`);
                        responseType = 'product_filter';
                        messageCategory = 'inventory';
                    }
                }
                // Units sold filters
                else if (lowerMessage.includes('best selling') || lowerMessage.includes('top selling') || lowerMessage.includes('popular')) {
                    response = this.generateProductFilterResponse('units_sold', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('slow selling') || lowerMessage.includes('low sales')) {
                    response = this.generateProductFilterResponse('units_sold', 'low');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Combined filters
                else if (lowerMessage.includes('profitable') && lowerMessage.includes('electronics')) {
                    response = this.generateCombinedFilterResponse(['category', 'profit_margin'], ['Electronics', 'high']);
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                else if (lowerMessage.includes('low stock') && lowerMessage.includes('fashion')) {
                    response = this.generateCombinedFilterResponse(['category', 'stock_level'], ['Fashion', 'low']);
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Highest selling with profit margin filter (relaxed)
                else if ((lowerMessage.includes('highest selling') || lowerMessage.includes('best selling')) && 
                         (lowerMessage.includes('profit') || lowerMessage.includes('margin') || lowerMessage.includes('%'))) {
                    // Extract profit margin from the message
                    let minMargin = 5; // default
                    const marginMatch = message.match(/(\d+(?:\.\d+)?)\s*%/i);
                    if (marginMatch) {
                        minMargin = parseFloat(marginMatch[1]);
                    }

                    // Optionally extract customer name
                    let customerName = null;
                    const customerMatch = message.match(/customer\s+([\w\s]+)/i);
                    if (customerMatch) {
                        customerName = customerMatch[1].trim();
                    }

                    // Get products with minimum profit margin, sorted by units_sold desc
                    let { products } = this.sellerData;
                    if (customerName) {
                        // If customer filter is present, filter products that were sold to this customer
                        const orders = this.sellerData.orders.filter(o => o.customerName && o.customerName.toLowerCase().includes(customerName.toLowerCase()));
                        const productNames = new Set();
                        orders.forEach(o => {
                            if (Array.isArray(o.products)) {
                                o.products.forEach(p => productNames.add(p.name));
                            }
                        });
                        products = products.filter(p => productNames.has(p.name));
                    }
                    const filteredProducts = products
                        .filter(p => (p.profit_margin || 0) >= minMargin)
                        .sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0))
                        .slice(0, 5);

                    response = this.generateProductFilterResponse('combined', 
                        `Top 5 highest selling products with profit margin >= ${minMargin}%${customerName ? ' for customer ' + customerName : ''}`, filteredProducts);
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
                // Default to product list if no specific filter matches
                else {
                    response = this.generateProductList();
                    responseType = 'product_list';
                    messageCategory = 'inventory';
                }
            }
            // Product history queries
            else if (lowerMessage.includes('product history') || lowerMessage.includes('product details') || 
                lowerMessage.includes('history') && (lowerMessage.includes('product') || lowerMessage.includes('item'))) {
                
                // Extract product name from message
                const productName = this.extractProductName(message);
                if (productName) {
                    response = this.generateProductHistory(productName);
                    responseType = 'product_history';
                    messageCategory = 'inventory';
                } else {
                    response = this.generateProductList();
                    responseType = 'product_list';
                    messageCategory = 'inventory';
                }
            }
            // Prediction queries
            else if (lowerMessage.includes('prediction') || lowerMessage.includes('forecast') || lowerMessage.includes('sales prediction')) {
                const productName = this.extractProductName(message);
                response = this.generateSalesPrediction(productName);
                responseType = 'sales_prediction';
                messageCategory = 'analytics';
            }
            else if (lowerMessage.includes('business prediction') || lowerMessage.includes('business forecast')) {
                response = this.generateSalesPrediction();
                responseType = 'business_prediction';
                messageCategory = 'analytics';
            }
            // Product management queries
            else if (lowerMessage.includes('add product') || lowerMessage.includes('new product')) {
                response = this.generateAddProductForm();
                responseType = 'product_form';
                messageCategory = 'inventory';
            }
            else if (lowerMessage.includes('update product') || lowerMessage.includes('change price') || lowerMessage.includes('edit product')) {
                response = this.generateUpdateProductForm();
                responseType = 'product_form';
                messageCategory = 'inventory';
            }
            else if (lowerMessage.includes('product list') || lowerMessage.includes('all products') || lowerMessage.includes('show products')) {
                response = this.generateProductList();
                responseType = 'product_list';
                messageCategory = 'inventory';
            }
            // Order management queries
            else if (lowerMessage.includes('order list') || lowerMessage.includes('all orders') || lowerMessage.includes('show orders')) {
                response = this.generateOrderList();
                responseType = 'order_list';
                messageCategory = 'orders';
            }
            else if (lowerMessage.includes('update order') || lowerMessage.includes('change order status')) {
                response = this.generateUpdateOrderForm();
                responseType = 'order_form';
                messageCategory = 'orders';
            }
            // Business analytics queries
            else if (lowerMessage.includes('business summary') || lowerMessage.includes('business overview') || lowerMessage.includes('dashboard')) {
                response = this.generateBusinessSummary();
                responseType = 'business_summary';
                messageCategory = 'analytics';
            }
            else if (lowerMessage.includes('sales report') || lowerMessage.includes('sales analytics') || lowerMessage.includes('revenue')) {
                response = this.generateSalesReport();
                responseType = 'sales_report';
                messageCategory = 'analytics';
            }
            else if (lowerMessage.includes('selling history') || lowerMessage.includes('order history')) {
                response = this.generateSellingHistory();
                responseType = 'selling_history';
                messageCategory = 'analytics';
            }
            // General profit queries (without "product" keyword)
            else if (lowerMessage.includes('profit') && !lowerMessage.includes('product')) {
                if (lowerMessage.includes('high') || lowerMessage.includes('good') || lowerMessage.includes('best')) {
                    response = this.generateProductFilterResponse('profit_margin', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                } else if (lowerMessage.includes('low') || lowerMessage.includes('bad') || lowerMessage.includes('worst')) {
                    response = this.generateProductFilterResponse('profit_margin', 'low');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                } else {
                    // Default to high profit products when just asking for "profit"
                    response = this.generateProductFilterResponse('profit_margin', 'high');
                    responseType = 'product_filter';
                    messageCategory = 'inventory';
                }
            }
            // Stock and inventory queries
            else if (lowerMessage.includes('stock alert') || lowerMessage.includes('inventory')) {
                response = this.generateStockAlert();
                responseType = 'stock_alert';
                messageCategory = 'inventory';
            }
            // Profile management queries
            else if (lowerMessage.includes('update profile') || lowerMessage.includes('change profile') || lowerMessage.includes('business info')) {
                response = this.generateProfileUpdateForm();
                responseType = 'profile_form';
                messageCategory = 'profile';
            }
            // Help and general queries
            else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
                response = this.generateHelpMessage();
                responseType = 'help';
                messageCategory = 'general';
            }
            // Advanced analytics queries
            else if (lowerMessage.includes('profit analysis') || lowerMessage.includes('profit report') || lowerMessage.includes('margin analysis')) {
                response = this.generateProfitAnalysis();
                responseType = 'profit_analysis';
                messageCategory = 'analytics';
            }
            else if (lowerMessage.includes('performance report') || lowerMessage.includes('business performance')) {
                response = this.generatePerformanceReport();
                responseType = 'performance_report';
                messageCategory = 'analytics';
            }
            // Quick actions
            else if (lowerMessage.includes('quick actions') || lowerMessage.includes('quick help')) {
                response = this.generateQuickActions();
                responseType = 'quick_actions';
                messageCategory = 'general';
            }
            // Specific check for "product which I have sold"
            else if (lowerMessage.includes('product which i have sold') || lowerMessage.includes('products which i have sold')) {
                const filteredProducts = this.sellerData.products.filter(p => (p.units_sold || 0) > 0);
                response = this.generateProductFilterResponse('combined', 'Products that have been sold', filteredProducts);
                responseType = 'product_filter';
                messageCategory = 'inventory';
            }
            // Add after existing product filter patterns in handleMessage
            // Advanced sold product queries
            else if (lowerMessage.match(/(sold products|products sold|view sold|show sold|sold to customer|sold in|never sold|unsold|products with sales|products without sales|sold between|sold from|sold on|sold during|product which I have sold|products I have sold|my sold products|what I have sold|which I have sold|I have sold)/)) {
                let filteredProducts = this.sellerData.products;
                let filterDescription = '';
                let minUnitsSold = null, maxUnitsSold = null, category = null, customer = null, startDate = null, endDate = null, minProfit = null;
                
                // Sold products
                if (lowerMessage.includes('never sold') || lowerMessage.includes('unsold') || lowerMessage.includes('products without sales')) {
                    filteredProducts = filteredProducts.filter(p => (p.units_sold || 0) === 0);
                    filterDescription = 'Products never sold';
                } else if (lowerMessage.includes('sold products') || lowerMessage.includes('products sold') || lowerMessage.includes('view sold') || lowerMessage.includes('show sold') || lowerMessage.includes('products with sales') || lowerMessage.includes('product which I have sold') || lowerMessage.includes('products I have sold') || lowerMessage.includes('my sold products') || lowerMessage.includes('what I have sold')) {
                    filteredProducts = filteredProducts.filter(p => (p.units_sold || 0) > 0);
                    filterDescription = 'Products that have been sold';
                }
                // By customer
                const customerMatch = message.match(/customer\s+([\w\s]+)/i);
                if (customerMatch) {
                    customer = customerMatch[1].trim();
                    const orders = this.sellerData.orders.filter(o => o.customerName && o.customerName.toLowerCase().includes(customer.toLowerCase()));
                    const productNames = new Set();
                    orders.forEach(o => {
                        if (Array.isArray(o.products)) {
                            o.products.forEach(p => productNames.add(p.name));
                        }
                    });
                    filteredProducts = filteredProducts.filter(p => productNames.has(p.name));
                    filterDescription += (filterDescription ? ', ' : '') + `sold to customer ${customer}`;
                }
                // By category
                const categoryMatch = message.match(/category\s+([\w &]+)/i) || message.match(/in ([A-Za-z &]+) category/i);
                if (categoryMatch) {
                    category = categoryMatch[1].trim();
                    filteredProducts = filteredProducts.filter(p => p.category && p.category.toLowerCase().includes(category.toLowerCase()));
                    filterDescription += (filterDescription ? ', ' : '') + `in category ${category}`;
                }
                // By profit margin
                const profitMatch = message.match(/profit margin (?:>|greater than|more than|above)\s*(\d+(?:\.\d+)?)%?/i);
                if (profitMatch) {
                    minProfit = parseFloat(profitMatch[1]);
                    filteredProducts = filteredProducts.filter(p => (p.profit_margin || 0) > minProfit);
                    filterDescription += (filterDescription ? ', ' : '') + `with profit margin > ${minProfit}%`;
                }
                // By units sold
                const unitsSoldMatch = message.match(/sold more than (\d+) units?/i);
                if (unitsSoldMatch) {
                    minUnitsSold = parseInt(unitsSoldMatch[1]);
                    filteredProducts = filteredProducts.filter(p => (p.units_sold || 0) > minUnitsSold);
                    filterDescription += (filterDescription ? ', ' : '') + `sold more than ${minUnitsSold} units`;
                }
                // By date range (if order data has dates)
                const dateRangeMatch = message.match(/sold between ([\w\s]+) and ([\w\s]+)/i);
                if (dateRangeMatch) {
                    startDate = new Date(dateRangeMatch[1]);
                    endDate = new Date(dateRangeMatch[2]);
                    const orders = this.sellerData.orders.filter(o => {
                        const d = new Date(o.date || o.order_date);
                        return d >= startDate && d <= endDate;
                    });
                    const productNames = new Set();
                    orders.forEach(o => {
                        if (Array.isArray(o.products)) {
                            o.products.forEach(p => productNames.add(p.name));
                        }
                    });
                    filteredProducts = filteredProducts.filter(p => productNames.has(p.name));
                    filterDescription += (filterDescription ? ', ' : '') + `sold between ${dateRangeMatch[1]} and ${dateRangeMatch[2]}`;
                }
                // By single date/month/year
                const monthMatch = message.match(/sold in ([A-Za-z]+) (\d{4})/i);
                if (monthMatch) {
                    const month = monthMatch[1];
                    const year = monthMatch[2];
                    const orders = this.sellerData.orders.filter(o => {
                        const d = new Date(o.date || o.order_date);
                        return d.toLocaleString('default', { month: 'long' }).toLowerCase() === month.toLowerCase() && d.getFullYear() == year;
                    });
                    const productNames = new Set();
                    orders.forEach(o => {
                        if (Array.isArray(o.products)) {
                            o.products.forEach(p => productNames.add(p.name));
                        }
                    });
                    filteredProducts = filteredProducts.filter(p => productNames.has(p.name));
                    filterDescription += (filterDescription ? ', ' : '') + `sold in ${month} ${year}`;
                }
                // Compose response
                if (!filterDescription) filterDescription = 'Advanced product search';
                response = this.generateProductFilterResponse('combined', filterDescription, filteredProducts);
                responseType = 'product_filter';
                messageCategory = 'inventory';
            }
            // Default response
            else {
                response = this.generateGeneralResponse(message);
                responseType = 'general';
                messageCategory = 'query';
            }

            // Log the interaction
            await this.logInteraction(message, response, responseType, messageCategory, startTime, requestInfo);

            return {
                success: true,
                message: response,
                responseType,
                messageCategory
            };

        } catch (error) {
            console.error('Error in handleMessage:', error);
            
            // Log the error
            await this.logInteraction(message, '', 'error', 'error', startTime, requestInfo, error.message);

            return {
                success: false,
                message: 'Sorry, I encountered an error. Please try again.',
                responseType: 'error',
                messageCategory: 'error'
            };
        }
    }

    // Extract product name from message
    extractProductName(message) {
        const lowerMessage = message.toLowerCase();
        
        // Common product keywords
        const productKeywords = [
            'headphones', 'bluetooth', 'wireless', 'case', 'phone case', 'cable', 'usb', 
            'mouse', 'wireless mouse', 'laptop', 'sleeve', 'stand', 'smartphone stand'
        ];
        
        // Check for exact product names from inventory
        for (const product of this.sellerData.products) {
            if (lowerMessage.includes(product.name.toLowerCase())) {
                return product.name;
            }
        }
        
        // Check for product keywords
        for (const keyword of productKeywords) {
            if (lowerMessage.includes(keyword)) {
                // Find the best matching product
                const matchingProduct = this.sellerData.products.find(p => 
                    p.name.toLowerCase().includes(keyword) || keyword.includes(p.name.toLowerCase())
                );
                if (matchingProduct) {
                    return matchingProduct.name;
                }
            }
        }
        
        return null;
    }

    // Log interaction to database
    async logInteraction(message, response, responseType, messageCategory, startTime, requestInfo, errorMessage = null) {
        try {
            const processingTime = Date.now() - startTime;
            
            await db.insertChatLog({
                seller_id: this.currentSellerId,
                user_message: message,
                ai_response: response,
                response_type: responseType,
                message_category: messageCategory,
                processing_time_ms: processingTime,
                tokens_used: null, // Not using external AI for these responses
                success: !errorMessage,
                error_message: errorMessage,
                user_agent: requestInfo.userAgent,
                ip_address: requestInfo.ipAddress,
                session_id: requestInfo.sessionId
            });
        } catch (error) {
            console.error('Error logging interaction:', error);
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

    // Generate product list
    generateProductList() {
        const { products } = this.sellerData;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📦 Product Inventory (${products.length} items)</h3>
            </div>
            
            <div class="summary-section">
                <h4>🛍️ All Products</h4>
                <div class="product-list">
                    ${products.map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-category">${p.category}</span>
                            <span class="product-price">₹${p.price.toLocaleString()}</span>
                            <span class="product-stock">Stock: ${p.stock}</span>
                            <span class="product-profit">Profit: ${(p.profit_margin || 0).toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Ask me about any specific product's history! Try: "Show me Wireless Headphones history" 📊</p>
            </div>
        </div>`;
    }

    // Generate order list
    generateOrderList() {
        const { orders } = this.sellerData;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📋 Order Management (${orders.length} orders)</h3>
            </div>
            
            <div class="summary-section">
                <h4>📦 Recent Orders</h4>
                <div class="order-list">
                    ${orders.slice(0, 5).map((o, i) => `
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
            
            <div class="summary-footer">
                <p>Need to update an order status? Just ask! 📝</p>
            </div>
        </div>`;
    }

    // Generate business summary
    generateBusinessSummary() {
        const { products, orders } = this.sellerData;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.stock < 10).length;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 Business Overview</h3>
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
                    <h4>🛍️ Total Products</h4>
                    <div class="stats-number">${totalProducts}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>⚠️ Alerts</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Low Stock Items</span>
                        <span class="insight-value">${lowStockProducts} products</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Your business is performing well! Keep up the great work! 🚀</p>
            </div>
        </div>`;
    }

    // Generate stock alert
    generateStockAlert() {
        const { products } = this.sellerData;
        
        const lowStockProducts = products.filter(p => p.stock < 10);
        const outOfStockProducts = products.filter(p => p.stock === 0);
        
        return `<div class="ai-summary-container">
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
                                <span class="alert-text">${p.name} - Only ${p.stock} left (₹${p.price.toLocaleString()})</span>
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
                                <span class="alert-text">${p.name} - Out of stock (₹${p.price.toLocaleString()})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? `
                <div class="summary-section">
                    <h4>✅ All Good!</h4>
                    <p>No stock alerts at the moment. All products have sufficient stock.</p>
                </div>
            ` : ''}
            
            <div class="summary-footer">
                <p>Would you like me to help you restock these items? 🚀</p>
            </div>
        </div>`;
    }

    // Generate selling history
    generateSellingHistory() {
        const { orders } = this.sellerData;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        const pendingOrders = orders.filter(o => ['processing', 'confirmed', 'shipped'].includes(o.status)).length;
        
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
            
            <div class="summary-footer">
                <p>Your business is performing well! Keep up the great work! 🚀</p>
            </div>
        </div>`;
    }

    // Generate sales report
    generateSalesReport() {
        const { orders } = this.sellerData;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>💰 Sales Report</h3>
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
                    <h4>📊 Performance</h4>
                    <div class="stats-number">${totalOrders > 0 ? 'Good' : 'No Sales'}</div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need more detailed analytics? Visit the Product History page! 📊</p>
            </div>
        </div>`;
    }

    // Generate forms (placeholder methods)
    generateAddProductForm() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>➕ Add New Product</h3>
            </div>
            <div class="summary-section">
                <p>To add a new product, please use the dashboard interface or visit the Product History page for advanced product management.</p>
            </div>
        </div>`;
    }

    generateUpdateProductForm() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>✏️ Update Product</h3>
            </div>
            <div class="summary-section">
                <p>To update product details, please use the dashboard interface or visit the Product History page for advanced product management.</p>
            </div>
        </div>`;
    }

    generateUpdateOrderForm() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>✏️ Update Order</h3>
            </div>
            <div class="summary-section">
                <p>To update order status, please use the dashboard interface or visit the Order History page.</p>
            </div>
        </div>`;
    }

    generateProfileUpdateForm() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>👤 Update Profile</h3>
            </div>
            <div class="summary-section">
                <p>To update your business profile, please use the Profile page in the dashboard.</p>
            </div>
        </div>`;
    }

    // Generate help message
    generateHelpMessage() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>🤖 How Can I Help You?</h3>
            </div>
            
            <div class="summary-section">
                <h4>📦 Product Management</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">📋 Product List</span>
                        <span class="insight-value">"Show me all products"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">📊 Product History</span>
                        <span class="insight-value">"Show me Wireless Headphones history"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">➕ Add Product</span>
                        <span class="insight-value">"Add a new product"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">✏️ Update Product</span>
                        <span class="insight-value">"Update product price"</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📋 Order Management</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">📋 Order List</span>
                        <span class="insight-value">"Show me all orders"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">✏️ Update Order</span>
                        <span class="insight-value">"Update order status"</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📊 Business Analytics</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">📈 Business Summary</span>
                        <span class="insight-value">"Show business overview"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">💰 Sales Report</span>
                        <span class="insight-value">"Show sales analytics"</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">📋 Order History</span>
                        <span class="insight-value">"Show selling history"</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>⚠️ Inventory Alerts</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">🚨 Stock Alerts</span>
                        <span class="insight-value">"Show low stock items"</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Just ask me anything about your business! I'm here to help! 🚀</p>
            </div>
        </div>`;
    }

    // Generate general response
    generateGeneralResponse(message) {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>🤖 I'm Here to Help!</h3>
            </div>
            
            <div class="summary-section">
                <p>I can help you with:</p>
                <ul>
                    <li>📦 <strong>Product Management:</strong> View, add, update products</li>
                    <li>📊 <strong>Product History:</strong> Get detailed history of any product</li>
                    <li>📋 <strong>Order Management:</strong> View and update orders</li>
                    <li>📈 <strong>Business Analytics:</strong> Sales reports and insights</li>
                    <li>⚠️ <strong>Stock Alerts:</strong> Low stock notifications</li>
                </ul>
                
                <p><strong>Try asking:</strong></p>
                <ul>
                    <li>"Show me Wireless Headphones history"</li>
                    <li>"What's my business summary?"</li>
                    <li>"Show me all products"</li>
                    <li>"Any low stock alerts?"</li>
                </ul>
            </div>
            
            <div class="summary-footer">
                <p>Need help? Just ask! 🚀</p>
            </div>
        </div>`;
    }

    // Helper function to format dates
    formatDate(dateString) {
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

    // Handle advanced product filtering queries
    generateProductFilterResponse(filterType, filterValue, customProducts = null) {
        const { products } = this.sellerData;
        let filteredProducts = customProducts || products;
        let filterDescription = '';

        // If custom products are provided, use them; otherwise apply filter
        if (!customProducts) {
            switch (filterType) {
                case 'category':
                    filteredProducts = products.filter(p => p.category.toLowerCase() === filterValue.toLowerCase());
                    filterDescription = `Products in ${filterValue} category`;
                    break;
                case 'price_range':
                    const [min, max] = filterValue.split('-').map(v => parseFloat(v));
                    filteredProducts = products.filter(p => p.price >= min && p.price <= max);
                    filterDescription = `Products between ₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
                    break;
                case 'stock_level':
                    switch (filterValue) {
                        case 'low':
                            filteredProducts = products.filter(p => p.stock < 10);
                            filterDescription = 'Low stock products (< 10 units)';
                            break;
                        case 'medium':
                            filteredProducts = products.filter(p => p.stock >= 10 && p.stock <= 50);
                            filterDescription = 'Medium stock products (10-50 units)';
                            break;
                        case 'high':
                            filteredProducts = products.filter(p => p.stock > 50);
                            filterDescription = 'High stock products (> 50 units)';
                            break;
                    }
                    break;
                case 'profit_margin':
                    switch (filterValue) {
                        case 'low':
                            filteredProducts = products.filter(p => (p.profit_margin || 0) < 15);
                            filterDescription = 'Low profit margin products (< 15%)';
                            break;
                        case 'medium':
                            filteredProducts = products.filter(p => (p.profit_margin || 0) >= 15 && (p.profit_margin || 0) <= 30);
                            filterDescription = 'Medium profit margin products (15-30%)';
                            break;
                        case 'high':
                            filteredProducts = products.filter(p => (p.profit_margin || 0) > 30);
                            filterDescription = 'High profit margin products (> 30%)';
                            break;
                    }
                    break;
                case 'profit_margin_custom':
                    if (filterValue.startsWith('>')) {
                        const minMargin = parseFloat(filterValue.substring(1));
                        filteredProducts = products.filter(p => (p.profit_margin || 0) > minMargin);
                        filterDescription = `Products with profit margin > ${minMargin}%`;
                    } else if (filterValue.startsWith('<')) {
                        const maxMargin = parseFloat(filterValue.substring(1));
                        filteredProducts = products.filter(p => (p.profit_margin || 0) < maxMargin);
                        filterDescription = `Products with profit margin < ${maxMargin}%`;
                    } else if (filterValue.includes('-')) {
                        const [minMargin, maxMargin] = filterValue.split('-').map(v => parseFloat(v));
                        filteredProducts = products.filter(p => (p.profit_margin || 0) >= minMargin && (p.profit_margin || 0) <= maxMargin);
                        filterDescription = `Products with profit margin between ${minMargin}% - ${maxMargin}%`;
                    }
                    break;
                case 'units_sold':
                    const avgUnitsSold = products.reduce((sum, p) => sum + (p.units_sold || 0), 0) / products.length;
                    switch (filterValue) {
                        case 'high':
                            filteredProducts = products.filter(p => (p.units_sold || 0) > avgUnitsSold * 1.5);
                            filterDescription = 'Best selling products (above average)';
                            break;
                        case 'low':
                            filteredProducts = products.filter(p => (p.units_sold || 0) < avgUnitsSold * 0.5);
                            filterDescription = 'Slow selling products (below average)';
                            break;
                    }
                    break;
                case 'combined':
                    filterDescription = filterValue;
                    break;
            }
        }

        if (filteredProducts.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>🔍 No Products Found</h3>
                </div>
                <div class="summary-section">
                    <p>No products match your filter: <strong>${filterDescription}</strong></p>
                    <p>Try adjusting your filter criteria or view all products.</p>
                </div>
            </div>`;
        }

        // Calculate insights for filtered products
        const totalValue = filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const avgProfitMargin = filteredProducts.reduce((sum, p) => sum + (p.profit_margin || 0), 0) / filteredProducts.length;
        const lowStockCount = filteredProducts.filter(p => p.stock < 10).length;
        const totalUnitsSold = filteredProducts.reduce((sum, p) => sum + (p.units_sold || 0), 0);
        const totalRevenue = filteredProducts.reduce((sum, p) => sum + (p.price * (p.units_sold || 0)), 0);

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📊 ${filterDescription} (${filteredProducts.length} products)</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>💰 Total Value</h4>
                    <div class="stats-number">₹${totalValue.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📈 Avg Profit Margin</h4>
                    <div class="stats-number">${avgProfitMargin.toFixed(1)}%</div>
                </div>
                <div class="summary-card">
                    <h4>⚠️ Low Stock Items</h4>
                    <div class="stats-number">${lowStockCount}</div>
                </div>
                <div class="summary-card">
                    <h4>📦 Total Stock</h4>
                    <div class="stats-number">${filteredProducts.reduce((sum, p) => sum + p.stock, 0)}</div>
                </div>
                <div class="summary-card">
                    <h4>🛒 Units Sold</h4>
                    <div class="stats-number">${totalUnitsSold.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>💵 Total Revenue</h4>
                    <div class="stats-number">₹${totalRevenue.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>🛍️ Filtered Products</h4>
                <div class="product-list">
                    ${filteredProducts.map((p, i) => `
                        <div class="product-item">
                            <span class="product-number">${i + 1}</span>
                            <span class="product-name"><strong>${p.name}</strong></span>
                            <span class="product-category">${p.category}</span>
                            <span class="product-price">₹${p.price.toLocaleString()}</span>
                            <span class="product-stock">Stock: ${p.stock}</span>
                            <span class="product-profit">Profit: ${(p.profit_margin || 0).toFixed(1)}%</span>
                            <span class="product-sales">Sold: ${(p.units_sold || 0).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h4>💡 Smart Recommendations</h4>
                <div class="insights-grid">
                    ${this.generateFilterRecommendations(filteredProducts)}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Need more specific filters? Try: "Show me Electronics under ₹5000" or "High profit products" 📊</p>
            </div>
        </div>`;
    }

    // Generate recommendations for filtered products
    generateFilterRecommendations(products) {
        const recommendations = [];
        
        const lowStockProducts = products.filter(p => p.stock < 10);
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 30);
        const lowProfitProducts = products.filter(p => (p.profit_margin || 0) < 15);
        
        if (lowStockProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">🚨 Restocking Needed</span>
                    <span class="insight-value">${lowStockProducts.length} products need restocking</span>
                </div>
            `);
        }
        
        if (highProfitProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">💎 High Profit Potential</span>
                    <span class="insight-value">${highProfitProducts.length} products with >30% margin</span>
                </div>
            `);
        }
        
        if (lowProfitProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">📉 Price Optimization</span>
                    <span class="insight-value">${lowProfitProducts.length} products may need price adjustments</span>
                </div>
            `);
        }
        
        return recommendations.length > 0 ? recommendations.join('') : `
            <div class="insight-item">
                <span class="insight-label">✅ Good Performance</span>
                <span class="insight-value">All filtered products are performing well</span>
            </div>
        `;
    }

    // Generate sales prediction based on historical data
    generateSalesPrediction(productName = null) {
        const { products, orders } = this.sellerData;
        
        if (productName) {
            // Single product prediction
            const product = products.find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase()) ||
                productName.toLowerCase().includes(p.name.toLowerCase())
            );
            
            if (!product) {
                return `<div class="ai-summary-container">
                    <div class="summary-header">
                        <h3>🔍 Product Not Found</h3>
                    </div>
                    <div class="summary-section">
                        <p>I couldn't find a product matching "${productName}".</p>
                    </div>
                </div>`;
            }
            
            return this.generateSingleProductPrediction(product);
        } else {
            // Overall business prediction
            return this.generateBusinessPrediction();
        }
    }

    // Generate prediction for single product
    generateSingleProductPrediction(product) {
        const stock = product.stock;
        const unitsSold = product.units_sold || 0;
        const profitMargin = product.profit_margin || 0;
        
        // Simple prediction algorithm
        let demandPrediction = 'Stable';
        let stockPrediction = 'Sufficient';
        let recommendation = 'Maintain current strategy';
        let riskLevel = 'Low';
        
        if (unitsSold > 20 && stock < 20) {
            demandPrediction = 'High Demand';
            stockPrediction = 'Low Stock Risk';
            recommendation = 'Consider restocking soon to meet demand';
            riskLevel = 'Medium';
        } else if (unitsSold < 5 && stock > 50) {
            demandPrediction = 'Low Demand';
            stockPrediction = 'Overstocked';
            recommendation = 'Consider promotions or price adjustments';
            riskLevel = 'Medium';
        } else if (profitMargin > 40) {
            demandPrediction = 'High Profit Potential';
            stockPrediction = 'Optimize for Sales';
            recommendation = 'Great margin, focus on increasing sales volume';
            riskLevel = 'Low';
        } else if (stock < 5) {
            demandPrediction = 'Stock Out Risk';
            stockPrediction = 'Critical';
            recommendation = 'Restock immediately to avoid stock out';
            riskLevel = 'High';
        }
        
        const estimatedRevenue = stock * product.price;
        const potentialProfit = stock * (product.price - (product.purchase_price || product.price * 0.7));
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>🔮 Sales Prediction: ${product.name}</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>📊 Demand Prediction</h4>
                    <div class="stats-number ${demandPrediction.includes('High') ? 'text-success' : demandPrediction.includes('Low') ? 'text-warning' : 'text-info'}">${demandPrediction}</div>
                </div>
                <div class="summary-card">
                    <h4>📦 Stock Status</h4>
                    <div class="stats-number ${stockPrediction.includes('Critical') ? 'text-danger' : stockPrediction.includes('Low') ? 'text-warning' : 'text-success'}">${stockPrediction}</div>
                </div>
                <div class="summary-card">
                    <h4>⚠️ Risk Level</h4>
                    <div class="stats-number ${riskLevel === 'High' ? 'text-danger' : riskLevel === 'Medium' ? 'text-warning' : 'text-success'}">${riskLevel}</div>
                </div>
                <div class="summary-card">
                    <h4>💰 Potential Revenue</h4>
                    <div class="stats-number">₹${estimatedRevenue.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📈 Prediction Details</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Current Stock</span>
                        <span class="insight-value">${stock} units</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Units Sold</span>
                        <span class="insight-value">${unitsSold} units</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Profit Margin</span>
                        <span class="insight-value">${profitMargin.toFixed(1)}%</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Potential Profit</span>
                        <span class="insight-value">₹${potentialProfit.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>💡 Recommendation</h4>
                <div class="alert alert-info">
                    <strong>🎯 Action Required:</strong> ${recommendation}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>This prediction is based on current stock levels, sales history, and profit margins! 📊</p>
            </div>
        </div>`;
    }

    // Generate overall business prediction
    generateBusinessPrediction() {
        const { products, orders } = this.sellerData;
        
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.stock < 10).length;
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 30).length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        
        // Business health score
        let healthScore = 100;
        if (lowStockProducts > totalProducts * 0.2) healthScore -= 20;
        if (highProfitProducts < totalProducts * 0.3) healthScore -= 15;
        if (avgOrderValue < 1000) healthScore -= 10;
        
        const healthStatus = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor';
        
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>🔮 Business Performance Prediction</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>🏥 Business Health</h4>
                    <div class="stats-number ${healthScore >= 80 ? 'text-success' : healthScore >= 60 ? 'text-info' : healthScore >= 40 ? 'text-warning' : 'text-danger'}">${healthScore}/100</div>
                </div>
                <div class="summary-card">
                    <h4>📊 Health Status</h4>
                    <div class="stats-number">${healthStatus}</div>
                </div>
                <div class="summary-card">
                    <h4>⚠️ Risk Factors</h4>
                    <div class="stats-number">${lowStockProducts}</div>
                </div>
                <div class="summary-card">
                    <h4>💎 Opportunities</h4>
                    <div class="stats-number">${highProfitProducts}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📈 30-Day Forecast</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <span class="insight-label">Expected Revenue</span>
                        <span class="insight-value">₹${(totalRevenue * 1.1).toLocaleString()}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Expected Orders</span>
                        <span class="insight-value">${Math.round(orders.length * 1.15)}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Stock Out Risk</span>
                        <span class="insight-value">${lowStockProducts} products</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Growth Potential</span>
                        <span class="insight-value">${highProfitProducts > 0 ? 'High' : 'Medium'}</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>💡 Strategic Recommendations</h4>
                <div class="insights-grid">
                    ${this.generateBusinessRecommendations(products, orders)}
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Focus on high-profit products and maintain optimal stock levels for maximum growth! 🚀</p>
            </div>
        </div>`;
    }

    // Generate business recommendations
    generateBusinessRecommendations(products, orders) {
        const recommendations = [];
        
        const lowStockProducts = products.filter(p => p.stock < 10);
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 30);
        const lowProfitProducts = products.filter(p => (p.profit_margin || 0) < 15);
        
        if (lowStockProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">🚨 Immediate Action</span>
                    <span class="insight-value">Restock ${lowStockProducts.length} low-stock items</span>
                </div>
            `);
        }
        
        if (highProfitProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">💎 Growth Opportunity</span>
                    <span class="insight-value">Promote ${highProfitProducts.length} high-margin products</span>
                </div>
            `);
        }
        
        if (lowProfitProducts.length > 0) {
            recommendations.push(`
                <div class="insight-item">
                    <span class="insight-label">📉 Optimization</span>
                    <span class="insight-value">Review pricing for ${lowProfitProducts.length} low-margin items</span>
                </div>
            `);
        }
        
        return recommendations.length > 0 ? recommendations.join('') : `
            <div class="insight-item">
                <span class="insight-label">✅ Optimal Performance</span>
                <span class="insight-value">Business is performing well, maintain current strategy</span>
            </div>
        `;
    }

    // Generate combined filter response for multiple criteria
    generateCombinedFilterResponse(filterTypes, filterValues) {
        const { products } = this.sellerData;
        let filteredProducts = products;
        let filterDescription = '';

        // Apply multiple filters
        for (let i = 0; i < filterTypes.length; i++) {
            const filterType = filterTypes[i];
            const filterValue = filterValues[i];

            switch (filterType) {
                case 'category':
                    filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === filterValue.toLowerCase());
                    filterDescription += `${filterValue} category, `;
                    break;
                case 'profit_margin':
                    switch (filterValue) {
                        case 'high':
                            filteredProducts = filteredProducts.filter(p => (p.profit_margin || 0) > 30);
                            filterDescription += 'high profit margin, ';
                            break;
                        case 'medium':
                            filteredProducts = filteredProducts.filter(p => (p.profit_margin || 0) >= 15 && (p.profit_margin || 0) <= 30);
                            filterDescription += 'medium profit margin, ';
                            break;
                        case 'low':
                            filteredProducts = filteredProducts.filter(p => (p.profit_margin || 0) < 15);
                            filterDescription += 'low profit margin, ';
                            break;
                    }
                    break;
                case 'stock_level':
                    switch (filterValue) {
                        case 'low':
                            filteredProducts = filteredProducts.filter(p => p.stock < 10);
                            filterDescription += 'low stock, ';
                            break;
                        case 'medium':
                            filteredProducts = filteredProducts.filter(p => p.stock >= 10 && p.stock <= 50);
                            filterDescription += 'medium stock, ';
                            break;
                        case 'high':
                            filteredProducts = filteredProducts.filter(p => p.stock > 50);
                            filterDescription += 'high stock, ';
                            break;
                    }
                    break;
            }
        }

        // Remove trailing comma and space
        filterDescription = filterDescription.slice(0, -2);

        if (filteredProducts.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>🔍 No Products Found</h3>
                </div>
                <div class="summary-section">
                    <p>No products match your combined filter: <strong>${filterDescription}</strong></p>
                    <p>Try adjusting your filter criteria or use simpler filters.</p>
                </div>
            </div>`;
        }

        return this.generateProductFilterResponse('combined', filterDescription, filteredProducts);
    }

    // Generate comprehensive profit analysis
    generateProfitAnalysis() {
        const { products } = this.sellerData;
        
        if (!products || products.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📊 Profit Analysis</h3>
                </div>
                <div class="summary-section">
                    <p>No products available for profit analysis.</p>
                </div>
            </div>`;
        }

        // Calculate profit metrics
        const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.units_sold || 0)), 0);
        const totalCost = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.units_sold || 0)), 0);
        const totalProfit = totalRevenue - totalCost;
        const avgProfitMargin = products.reduce((sum, p) => sum + (p.profit_margin || 0), 0) / products.length;
        
        const highProfitProducts = products.filter(p => (p.profit_margin || 0) > 30);
        const mediumProfitProducts = products.filter(p => (p.profit_margin || 0) >= 15 && (p.profit_margin || 0) <= 30);
        const lowProfitProducts = products.filter(p => (p.profit_margin || 0) < 15);

        const topPerformingProduct = products.reduce((top, p) => 
            (p.profit_margin || 0) > (top.profit_margin || 0) ? p : top, products[0]);

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>💰 Comprehensive Profit Analysis</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>💵 Total Revenue</h4>
                    <div class="stats-number">₹${totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>💸 Total Cost</h4>
                    <div class="stats-number">₹${totalCost.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>💎 Total Profit</h4>
                    <div class="stats-number ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">₹${totalProfit.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📈 Avg Profit Margin</h4>
                    <div class="stats-number">${avgProfitMargin.toFixed(1)}%</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📊 Profit Distribution</h4>
                <div class="profit-distribution">
                    <div class="profit-category">
                        <span class="profit-label high">High Profit (>30%)</span>
                        <span class="profit-count">${highProfitProducts.length} products</span>
                        <span class="profit-percentage">${((highProfitProducts.length / products.length) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="profit-category">
                        <span class="profit-label medium">Medium Profit (15-30%)</span>
                        <span class="profit-count">${mediumProfitProducts.length} products</span>
                        <span class="profit-percentage">${((mediumProfitProducts.length / products.length) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="profit-category">
                        <span class="profit-label low">Low Profit (<15%)</span>
                        <span class="profit-count">${lowProfitProducts.length} products</span>
                        <span class="profit-percentage">${((lowProfitProducts.length / products.length) * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>🏆 Top Performing Product</h4>
                <div class="top-product">
                    <strong>${topPerformingProduct.name}</strong> - ${(topPerformingProduct.profit_margin || 0).toFixed(1)}% profit margin
                    <br><small>Revenue: ₹${(topPerformingProduct.price * (topPerformingProduct.units_sold || 0)).toLocaleString()}</small>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>💡 Recommendations</h4>
                <ul>
                    ${lowProfitProducts.length > 0 ? `<li>⚠️ ${lowProfitProducts.length} products have low profit margins - consider price optimization</li>` : ''}
                    ${highProfitProducts.length > 0 ? `<li>💎 ${highProfitProducts.length} high-profit products - consider expanding these categories</li>` : ''}
                    <li>📈 Focus on products with profit margins above 20% for better profitability</li>
                    <li>🔄 Regularly review and adjust pricing based on market trends</li>
                </ul>
            </div>
            
            <div class="summary-footer">
                <p>Try: "Show me high profit products" or "Low profit margin analysis" for more specific insights 📊</p>
            </div>
        </div>`;
    }

    // Generate business performance report
    generatePerformanceReport() {
        const { products, orders } = this.sellerData;
        
        if (!products || products.length === 0) {
            return `<div class="ai-summary-container">
                <div class="summary-header">
                    <h3>📈 Business Performance Report</h3>
                </div>
                <div class="summary-section">
                    <p>No data available for performance analysis.</p>
                </div>
            </div>`;
        }

        // Calculate performance metrics
        const totalProducts = products.length;
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / totalProducts;
        const lowStockProducts = products.filter(p => p.stock < 10);
        const outOfStockProducts = products.filter(p => p.stock === 0);
        const highValueProducts = products.filter(p => p.price > avgPrice * 1.5);

        // Calculate business health score
        const stockHealth = ((totalProducts - lowStockProducts.length) / totalProducts) * 100;
        const profitHealth = products.filter(p => (p.profit_margin || 0) > 15).length / totalProducts * 100;
        const businessHealthScore = (stockHealth + profitHealth) / 2;

        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>📈 Business Performance Report</h3>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>📦 Total Products</h4>
                    <div class="stats-number">${totalProducts}</div>
                </div>
                <div class="summary-card">
                    <h4>💰 Total Inventory Value</h4>
                    <div class="stats-number">₹${totalValue.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>📊 Average Price</h4>
                    <div class="stats-number">₹${avgPrice.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h4>🏥 Business Health</h4>
                    <div class="stats-number ${businessHealthScore >= 80 ? 'text-success' : businessHealthScore >= 60 ? 'text-warning' : 'text-danger'}">${businessHealthScore.toFixed(0)}%</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>⚠️ Stock Alerts</h4>
                <div class="alert-summary">
                    ${lowStockProducts.length > 0 ? `<div class="alert-item warning">${lowStockProducts.length} products with low stock (< 10 units)</div>` : ''}
                    ${outOfStockProducts.length > 0 ? `<div class="alert-item danger">${outOfStockProducts.length} products out of stock</div>` : ''}
                    ${lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? '<div class="alert-item success">All products have adequate stock levels</div>' : ''}
                </div>
            </div>
            
            <div class="summary-section">
                <h4>💎 High-Value Products</h4>
                <div class="high-value-products">
                    ${highValueProducts.length > 0 ? 
                        highValueProducts.slice(0, 5).map(p => `
                            <div class="product-item">
                                <span class="product-name"><strong>${p.name}</strong></span>
                                <span class="product-price">₹${p.price.toLocaleString()}</span>
                                <span class="product-profit">${(p.profit_margin || 0).toFixed(1)}% profit</span>
                            </div>
                        `).join('') : 
                        '<p>No high-value products found</p>'
                    }
                </div>
            </div>
            
            <div class="summary-section">
                <h4>📊 Performance Insights</h4>
                <ul>
                    <li>${stockHealth.toFixed(1)}% of products have healthy stock levels</li>
                    <li>${profitHealth.toFixed(1)}% of products have good profit margins (>15%)</li>
                    <li>Average inventory value per product: ₹${(totalValue / totalProducts).toLocaleString()}</li>
                    <li>Total stock units: ${totalStock.toLocaleString()}</li>
                </ul>
            </div>
            
            <div class="summary-footer">
                <p>Try: "Show me low stock products" or "High value product analysis" for detailed insights 📊</p>
            </div>
        </div>`;
    }

    // Generate quick actions menu
    generateQuickActions() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>⚡ Quick Actions</h3>
            </div>
            
            <div class="summary-section">
                <h4>🚀 Popular Commands</h4>
                <div class="quick-actions-grid">
                    <div class="action-item" onclick="sendQuickMessage('Show me all products')">
                        <i class="fas fa-box"></i>
                        <span>View All Products</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Show me low stock products')">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Stock Alerts</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Show me high profit products')">
                        <i class="fas fa-chart-line"></i>
                        <span>High Profit Items</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Business summary')">
                        <i class="fas fa-chart-bar"></i>
                        <span>Business Overview</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Show me Electronics')">
                        <i class="fas fa-mobile-alt"></i>
                        <span>Electronics</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Show me Fashion')">
                        <i class="fas fa-tshirt"></i>
                        <span>Fashion</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Profit analysis')">
                        <i class="fas fa-coins"></i>
                        <span>Profit Report</span>
                    </div>
                    <div class="action-item" onclick="sendQuickMessage('Performance report')">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Performance</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>🔍 Advanced Filters</h4>
                <div class="filter-examples">
                    <p><strong>Try these advanced filters:</strong></p>
                    <ul>
                        <li>"Show me products under ₹5000"</li>
                        <li>"Show me profitable Electronics"</li>
                        <li>"Show me best selling products"</li>
                        <li>"Show me products between ₹1000 and ₹5000"</li>
                        <li>"Show me low stock Fashion items"</li>
                    </ul>
                </div>
            </div>
            
            <div class="summary-footer">
                <p>Click any action above or type your own query! 🚀</p>
            </div>
        </div>`;
    }

    // Enhanced help message with advanced features
    generateHelpMessage() {
        return `<div class="ai-summary-container">
            <div class="summary-header">
                <h3>🤖 Advanced AI Assistant Help</h3>
            </div>
            
            <div class="summary-section">
                <h4>📦 Product Management</h4>
                <ul>
                    <li><strong>View Products:</strong> "Show me all products", "Product list"</li>
                    <li><strong>Add Product:</strong> "Add new product", "Create product"</li>
                    <li><strong>Update Product:</strong> "Edit product", "Change price"</li>
                    <li><strong>Product History:</strong> "Show me [product name] history"</li>
                </ul>
            </div>
            
            <div class="summary-section">
                <h4>🔍 Advanced Filtering</h4>
                <ul>
                    <li><strong>By Category:</strong> "Show me Electronics", "Fashion products"</li>
                    <li><strong>By Price:</strong> "Under ₹5000", "Above ₹1000", "Between ₹1000 and ₹5000"</li>
                    <li><strong>By Stock:</strong> "Low stock products", "High stock items"</li>
                    <li><strong>By Profit:</strong> "High profit products", "Low margin items"</li>
                    <li><strong>By Sales:</strong> "Best selling products", "Popular items"</li>
                    <li><strong>Combined:</strong> "Profitable Electronics", "Low stock Fashion"</li>
                </ul>
            </div>
            
            <div class="summary-section">
                <h4>📊 Business Analytics</h4>
                <ul>
                    <li><strong>Business Summary:</strong> "Business overview", "Dashboard"</li>
                    <li><strong>Profit Analysis:</strong> "Profit report", "Margin analysis"</li>
                    <li><strong>Performance Report:</strong> "Business performance", "Performance analysis"</li>
                    <li><strong>Sales Report:</strong> "Sales analytics", "Revenue report"</li>
                    <li><strong>Stock Alerts:</strong> "Low stock alerts", "Inventory check"</li>
                </ul>
            </div>
            
            <div class="summary-section">
                <h4>📋 Order Management</h4>
                <ul>
                    <li><strong>View Orders:</strong> "Show orders", "Order list"</li>
                    <li><strong>Update Orders:</strong> "Change order status", "Update order"</li>
                    <li><strong>Order History:</strong> "Selling history", "Order analytics"</li>
                </ul>
            </div>
            
            <div class="summary-section">
                <h4>🚀 Quick Actions</h4>
                <ul>
                    <li><strong>Quick Help:</strong> "Quick actions", "Quick help"</li>
                    <li><strong>Predictions:</strong> "Sales prediction", "Business forecast"</li>
                    <li><strong>Recommendations:</strong> "Smart recommendations", "Business tips"</li>
                </ul>
            </div>
            
            <div class="summary-footer">
                <p><strong>💡 Pro Tips:</strong></p>
                <ul>
                    <li>Use natural language - "Show me expensive Electronics"</li>
                    <li>Combine filters - "Low stock high profit products"</li>
                    <li>Ask for specific insights - "Which products need price optimization?"</li>
                    <li>Get predictions - "Predict sales for next month"</li>
                </ul>
                <p>Need more help? Just ask! 🚀</p>
            </div>
        </div>`;
    }
}

module.exports = FlipkartSellerAgent; 