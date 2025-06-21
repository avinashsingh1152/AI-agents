const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'seller_dashboard',
  password: 'postgres',
  port: 5432,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    const client = await pool.connect();
    
    // Create seller users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        agent_enabled BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add agent_enabled column if it doesn't exist
    await client.query(`
      ALTER TABLE seller_users 
      ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT false
    `);

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_profile (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES seller_users(id) ON DELETE CASCADE,
        business_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        gst_number VARCHAR(50) NOT NULL,
        rating DECIMAL(3,2) DEFAULT 0.0,
        total_sales DECIMAL(15,2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES seller_users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER REFERENCES seller_users(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'processing',
        order_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL
      )
    `);

    // Insert default seller user if not exists
    const userExists = await client.query('SELECT COUNT(*) FROM seller_users');
    if (parseInt(userExists.rows[0].count) === 0) {
      // Simple password hash (in production, use bcrypt)
      const passwordHash = 'password123'; // This should be hashed with bcrypt
      await client.query(`
        INSERT INTO seller_users (username, email, password_hash, business_name)
        VALUES ($1, $2, $3, $4)
      `, ['seller1', 'seller@techgadgets.com', passwordHash, 'TechGadgets Store']);
    }

    // Insert default seller profile if not exists
    const profileExists = await client.query('SELECT COUNT(*) FROM seller_profile');
    if (parseInt(profileExists.rows[0].count) === 0) {
      const userId = await client.query('SELECT id FROM seller_users LIMIT 1');
      await client.query(`
        INSERT INTO seller_profile (user_id, business_name, owner_name, email, phone, address, gst_number, rating, total_sales)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId.rows[0].id,
        'TechGadgets Store',
        'Pankaj Tripathi',
        'pakaj.tripathi@techgadgets.com',
        '+91-9155530123',
        '123 Commerce St, Delhi, India - 123456',
        'GST123456789',
        4.5,
        2500000
      ]);
    }

    // Insert default products if not exists
    const productsExist = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsExist.rows[0].count) === 0) {
      const userId = await client.query('SELECT id FROM seller_users LIMIT 1');
      const defaultProducts = [
        ['Wireless Bluetooth Headphones', 7999, 5999, 50, 'Electronics', 'High-quality wireless headphones with noise cancellation', 25.0],
        ['Smart Phone Case', 1999, 1499, 100, 'Accessories', 'Protective case for smartphones with wireless charging support', 25.0],
        ['USB-C Cable', 999, 749, 200, 'Accessories', 'Fast charging USB-C cable 6ft length', 25.0],
        ['Laptop Stand', 3699, 2799, 25, 'Office Supplies', 'Adjustable aluminum laptop stand for better ergonomics', 24.3]
      ];

      for (const product of defaultProducts) {
        await client.query(`
          INSERT INTO products (user_id, name, price, purchase_price, stock, category, description, profit_margin)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [userId.rows[0].id, ...product]);
      }
    }

    // Insert default orders if not exists
    const ordersExist = await client.query('SELECT COUNT(*) FROM orders');
    if (parseInt(ordersExist.rows[0].count) === 0) {
      const userId = await client.query('SELECT id FROM seller_users LIMIT 1');
      const defaultOrders = [
        ['ORD001', 'Anuradha', 7999, 'delivered', '2024-01-15'],
        ['ORD002', 'Bhavesh', 2998, 'shipped', '2024-01-18'],
        ['ORD003', 'Chirag', 3699, 'processing', '2024-01-20']
      ];

      for (const order of defaultOrders) {
        await client.query(`
          INSERT INTO orders (user_id, id, customer_name, total, status, order_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId.rows[0].id, ...order]);
      }

      // Insert order items
      await client.query(`
        INSERT INTO order_items (order_id, product_name, quantity, price)
        VALUES 
        ('ORD001', 'Wireless Bluetooth Headphones', 1, 7999),
        ('ORD002', 'Smart Phone Case', 1, 1999),
        ('ORD002', 'USB-C Cable', 1, 999),
        ('ORD003', 'Laptop Stand', 1, 3699)
      `);
    }

    // Fix any existing orders with null order_date
    await client.query(`
      UPDATE orders 
      SET order_date = CURRENT_DATE - INTERVAL '7 days'
      WHERE order_date IS NULL
    `);

    // Create chat logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL REFERENCES seller_users(id),
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        response_type VARCHAR(50) DEFAULT 'general',
        message_category VARCHAR(50) DEFAULT 'query',
        processing_time_ms INTEGER,
        tokens_used INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        user_agent TEXT,
        ip_address INET,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_chat_logs_seller_id ON chat_logs(seller_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_response_type ON chat_logs(response_type);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_message_category ON chat_logs(message_category);
    `);

    // Create order history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_history (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES seller_users(id),
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        shipping_address TEXT,
        billing_address TEXT,
        total_amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0.00,
        shipping_amount DECIMAL(10,2) DEFAULT 0.00,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        final_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'pending',
        order_status VARCHAR(50) DEFAULT 'processing',
        order_date DATE NOT NULL,
        delivery_date DATE,
        tracking_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for order history
      CREATE INDEX IF NOT EXISTS idx_order_history_user_id ON order_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_history_order_date ON order_history(order_date);
      CREATE INDEX IF NOT EXISTS idx_order_history_status ON order_history(order_status);
    `);

    // Create order history items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_history_items (
        id SERIAL PRIMARY KEY,
        order_history_id INTEGER REFERENCES order_history(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        product_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for order history items
      CREATE INDEX IF NOT EXISTS idx_order_history_items_order_id ON order_history_items(order_history_id);
      CREATE INDEX IF NOT EXISTS idx_order_history_items_product_id ON order_history_items(product_id);
    `);

    // Add new columns to products table for profit tracking
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS total_profit DECIMAL(15,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS units_sold INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_price_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Create product history table for tracking price changes and profit
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES seller_users(id) ON DELETE CASCADE,
        change_type VARCHAR(50) NOT NULL, -- 'price_change', 'stock_update', 'profit_update'
        old_value DECIMAL(10,2),
        new_value DECIMAL(10,2),
        old_price DECIMAL(10,2),
        new_price DECIMAL(10,2),
        old_profit_margin DECIMAL(5,2),
        new_profit_margin DECIMAL(5,2),
        profit_impact DECIMAL(15,2) DEFAULT 0.00,
        units_affected INTEGER DEFAULT 0,
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for product history
      CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_history_user_id ON product_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON product_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_product_history_change_type ON product_history(change_type);
    `);

    // Create profit analytics table for aggregated profit data
    await client.query(`
      CREATE TABLE IF NOT EXISTS profit_analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES seller_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_sales DECIMAL(15,2) DEFAULT 0.00,
        total_cost DECIMAL(15,2) DEFAULT 0.00,
        total_profit DECIMAL(15,2) DEFAULT 0.00,
        profit_margin_percentage DECIMAL(5,2) DEFAULT 0.00,
        units_sold INTEGER DEFAULT 0,
        average_price DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for profit analytics
      CREATE INDEX IF NOT EXISTS idx_profit_analytics_user_id ON profit_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_profit_analytics_product_id ON profit_analytics(product_id);
      CREATE INDEX IF NOT EXISTS idx_profit_analytics_date ON profit_analytics(date);
    `);

    client.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Database operations
const db = {
  // Authentication functions
  async authenticateUser(username, password) {
    try {
      const query = 'SELECT * FROM seller_users WHERE username = $1 AND password_hash = $2 AND is_active = true';
      const result = await pool.query(query, [username, password]);
      
      if (result.rows.length > 0) {
        return { success: true, user: result.rows[0] };
      } else {
        return { success: false, message: 'Invalid username or password' };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  },

  async getUserById(userId) {
    const result = await pool.query('SELECT * FROM seller_users WHERE id = $1', [userId]);
    return result.rows[0];
  },

  // Get seller profile
  async getSellerProfile(userId) {
    const result = await pool.query('SELECT * FROM seller_profile WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rows[0];
  },

  // Get agent enabled status
  async getAgentEnabled(userId) {
    const result = await pool.query('SELECT agent_enabled FROM seller_users WHERE id = $1', [userId]);
    return result.rows[0]?.agent_enabled || false;
  },

  // Update agent enabled status
  async updateAgentEnabled(userId, enabled) {
    const result = await pool.query(
      'UPDATE seller_users SET agent_enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING agent_enabled',
      [enabled, userId]
    );
    return result.rows[0]?.agent_enabled || false;
  },

  // Update seller profile
  async updateSellerProfile(userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE seller_profile 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, ...values]);
    return result.rows[0];
  },

  // Get all products for a user
  async getProducts(userId) {
    const result = await pool.query('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    
    // Convert numeric strings to numbers for frontend compatibility
    const products = result.rows.map(product => ({
      ...product,
      profit_margin: parseFloat(product.profit_margin || 0),
      purchase_price: parseFloat(product.purchase_price || 0),
      price: parseFloat(product.price || 0),
      stock: parseInt(product.stock || 0),
      units_sold: parseInt(product.units_sold || 0)
    }));
    
    return products;
  },

  // Get individual product by ID
  async getProduct(userId, productId) {
    const result = await pool.query('SELECT * FROM products WHERE user_id = $1 AND id = $2', [userId, productId]);
    return result.rows[0];
  },

  // Add new product
  async addProduct(userId, productData) {
    const { name, price, stock, category, description } = productData;
    const result = await pool.query(`
      INSERT INTO products (user_id, name, price, stock, category, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, name, price, stock, category, description]);
    return result.rows[0];
  },

  // Update product
  async updateProduct(userId, id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    
    const query = `
      UPDATE products 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, id, ...values]);
    return result.rows[0];
  },

  // Get all orders with items
  async getOrders(userId) {
    const result = await pool.query(`
      SELECT o.*, 
             array_agg(oi.product_name) as products
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.user_id, o.customer_name, o.total, o.status, o.order_date, o.created_at, o.updated_at
      ORDER BY o.order_date DESC
    `, [userId]);
    return result.rows;
  },

  // Update order status
  async updateOrderStatus(userId, orderId, status) {
    const result = await pool.query(`
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $2 AND id = $3
      RETURNING *
    `, [status, userId, orderId]);
    return result.rows[0];
  },

  // Get analytics
  async getAnalytics(userId) {
    const totalRevenue = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE user_id = $1 AND status = \'delivered\'', [userId]);
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders WHERE user_id = $1', [userId]);
    const pendingOrders = await pool.query('SELECT COUNT(*) as count FROM orders WHERE user_id = $1 AND status = \'processing\'', [userId]);
    const lowStockItems = await pool.query('SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND stock < 10', [userId]);

    return {
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      totalOrders: parseInt(totalOrders.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      lowStockItems: parseInt(lowStockItems.rows[0].count),
      monthlyGrowth: 15.5 // This could be calculated from historical data
    };
  },

  // Generic query function
  async query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result;
  },

  // Create chat logs table for AI agent interactions
  async createChatLogsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL REFERENCES seller_users(id),
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        response_type VARCHAR(50) DEFAULT 'general',
        message_category VARCHAR(50) DEFAULT 'query',
        processing_time_ms INTEGER,
        tokens_used INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        user_agent TEXT,
        ip_address INET,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_chat_logs_seller_id ON chat_logs(seller_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_response_type ON chat_logs(response_type);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_message_category ON chat_logs(message_category);
    `;
    
    try {
      await this.query(query);
      console.log('Chat logs table created successfully');
    } catch (error) {
      console.error('Error creating chat logs table:', error);
      throw error;
    }
  },

  // Insert a new chat log entry
  async insertChatLog(logData) {
    const query = `
      INSERT INTO chat_logs (
        seller_id, user_message, ai_response, response_type, 
        message_category, processing_time_ms, tokens_used, 
        success, error_message, user_agent, ip_address, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at
    `;
    
    const values = [
      logData.seller_id,
      logData.user_message,
      logData.ai_response,
      logData.response_type || 'general',
      logData.message_category || 'query',
      logData.processing_time_ms || null,
      logData.tokens_used || null,
      logData.success !== false,
      logData.error_message || null,
      logData.user_agent || null,
      logData.ip_address || null,
      logData.session_id || null
    ];
    
    try {
      const result = await this.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error inserting chat log:', error);
      throw error;
    }
  },

  // Get chat logs for a specific seller
  async getChatLogsBySeller(sellerId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        id, user_message, ai_response, response_type, message_category,
        processing_time_ms, tokens_used, success, created_at
      FROM chat_logs 
      WHERE seller_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await this.query(query, [sellerId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching chat logs:', error);
      throw error;
    }
  },

  // Get chat analytics for a seller
  async getChatAnalytics(sellerId, days = 30) {
    const query = `
      SELECT 
        response_type,
        message_category,
        COUNT(*) as total_interactions,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(tokens_used) as total_tokens,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_interactions,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_interactions
      FROM chat_logs 
      WHERE seller_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY response_type, message_category
      ORDER BY total_interactions DESC
    `;
    
    try {
      const result = await this.query(query, [sellerId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
      throw error;
    }
  },

  // Get popular queries and responses
  async getPopularQueries(sellerId, limit = 10) {
    const query = `
      SELECT 
        user_message,
        COUNT(*) as frequency,
        AVG(processing_time_ms) as avg_processing_time
      FROM chat_logs 
      WHERE seller_id = $1 
      AND success = true
      GROUP BY user_message
      ORDER BY frequency DESC 
      LIMIT $2
    `;
    
    try {
      const result = await this.query(query, [sellerId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching popular queries:', error);
      throw error;
    }
  },

  // Clean old chat logs (keep last 90 days)
  async cleanOldChatLogs() {
    const query = `
      DELETE FROM chat_logs 
      WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    `;
    
    try {
      const result = await this.query(query);
      console.log(`Cleaned ${result.rowCount} old chat logs`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning old chat logs:', error);
      throw error;
    }
  },

  async initializeDatabase() {
    try {
      await this.createSellerUsersTable();
      await this.createSellerProfilesTable();
      await this.createProductsTable();
      await this.createOrdersTable();
      await this.createOrderItemsTable();
      await this.createChatLogsTable(); // Add chat logs table
      
      // Insert default seller if not exists
      await this.insertDefaultSeller();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  },

  // Order History CRUD Operations
  async createOrderHistory(orderData) {
    try {
      const client = await pool.connect();
      
      // Insert main order history record
      const orderQuery = `
        INSERT INTO order_history (
          order_id, user_id, customer_name, customer_email, customer_phone,
          shipping_address, billing_address, total_amount, tax_amount,
          shipping_amount, discount_amount, final_amount, payment_method,
          payment_status, order_status, order_date, delivery_date,
          tracking_number, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id
      `;
      
      const orderValues = [
        orderData.order_id,
        orderData.user_id,
        orderData.customer_name,
        orderData.customer_email || null,
        orderData.customer_phone || null,
        orderData.shipping_address || null,
        orderData.billing_address || null,
        orderData.total_amount,
        orderData.tax_amount || 0,
        orderData.shipping_amount || 0,
        orderData.discount_amount || 0,
        orderData.final_amount,
        orderData.payment_method || null,
        orderData.payment_status || 'pending',
        orderData.order_status || 'processing',
        orderData.order_date,
        orderData.delivery_date || null,
        orderData.tracking_number || null,
        orderData.notes || null
      ];
      
      const orderResult = await client.query(orderQuery, orderValues);
      const orderHistoryId = orderResult.rows[0].id;
      
      // Insert order items if provided
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const itemQuery = `
            INSERT INTO order_history_items (
              order_history_id, product_name, product_id, quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          const itemValues = [
            orderHistoryId,
            item.product_name,
            item.product_id || null,
            item.quantity,
            item.unit_price,
            item.total_price
          ];
          
          await client.query(itemQuery, itemValues);
        }
      }
      
      client.release();
      return orderHistoryId;
    } catch (error) {
      console.error('Error creating order history:', error);
      throw error;
    }
  },

  async getOrderHistory(userId, limit = 50, offset = 0, filters = {}) {
    try {
      const client = await pool.connect();
      
      let query = `
        SELECT 
          oh.*,
          COUNT(ohi.id) as item_count
        FROM order_history oh
        LEFT JOIN order_history_items ohi ON oh.id = ohi.order_history_id
        WHERE oh.user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      // Add filters
      if (filters.order_status) {
        paramCount++;
        query += ` AND oh.order_status = $${paramCount}`;
        values.push(filters.order_status);
      }
      
      if (filters.payment_status) {
        paramCount++;
        query += ` AND oh.payment_status = $${paramCount}`;
        values.push(filters.payment_status);
      }
      
      if (filters.date_from) {
        paramCount++;
        query += ` AND oh.order_date >= $${paramCount}`;
        values.push(filters.date_from);
      }
      
      if (filters.date_to) {
        paramCount++;
        query += ` AND oh.order_date <= $${paramCount}`;
        values.push(filters.date_to);
      }
      
      query += `
        GROUP BY oh.id
        ORDER BY oh.order_date DESC, oh.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      values.push(limit, offset);
      
      const result = await client.query(query, values);
      client.release();
      return result.rows;
    } catch (error) {
      console.error('Error getting order history:', error);
      throw error;
    }
  },

  async getOrderHistoryById(userId, orderHistoryId) {
    try {
      const client = await pool.connect();
      
      // Get main order details
      const orderQuery = `
        SELECT * FROM order_history 
        WHERE id = $1 AND user_id = $2
      `;
      const orderResult = await client.query(orderQuery, [orderHistoryId, userId]);
      
      if (orderResult.rows.length === 0) {
        client.release();
        return null;
      }
      
      // Get order items
      const itemsQuery = `
        SELECT * FROM order_history_items 
        WHERE order_history_id = $1
        ORDER BY id
      `;
      const itemsResult = await client.query(itemsQuery, [orderHistoryId]);
      
      client.release();
      
      return {
        ...orderResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error) {
      console.error('Error getting order history by ID:', error);
      throw error;
    }
  },

  async updateOrderHistory(userId, orderHistoryId, updates) {
    try {
      const client = await pool.connect();
      
      // Build dynamic update query
      const allowedFields = [
        'customer_name', 'customer_email', 'customer_phone', 'shipping_address',
        'billing_address', 'total_amount', 'tax_amount', 'shipping_amount',
        'discount_amount', 'final_amount', 'payment_method', 'payment_status',
        'order_status', 'delivery_date', 'tracking_number', 'notes'
      ];
      
      const updateFields = [];
      const values = [];
      let paramCount = 0;
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        client.release();
        return false;
      }
      
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`id = $${paramCount + 1}`);
      updateFields.push(`user_id = $${paramCount + 2}`);
      
      values.push(orderHistoryId, userId);
      
      const query = `
        UPDATE order_history 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
        RETURNING id
      `;
      
      const result = await client.query(query, values);
      client.release();
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating order history:', error);
      throw error;
    }
  },

  async deleteOrderHistory(userId, orderHistoryId) {
    try {
      const client = await pool.connect();
      
      // Delete order history (cascade will delete items)
      const query = `
        DELETE FROM order_history 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await client.query(query, [orderHistoryId, userId]);
      client.release();
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting order history:', error);
      throw error;
    }
  },

  async getOrderHistoryStats(userId) {
    try {
      const client = await pool.connect();
      
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(final_amount) as total_revenue,
          AVG(final_amount) as avg_order_value,
          COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN order_status = 'processing' THEN 1 END) as processing_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
        FROM order_history 
        WHERE user_id = $1
      `;
      
      const result = await client.query(query, [userId]);
      client.release();
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting order history stats:', error);
      throw error;
    }
  },

  // Create demo account for onboarding
  async createDemoAccount(username, email, businessName, ownerName) {
    try {
      // Check if email already exists
      const existingUser = await pool.query('SELECT id FROM seller_users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return { success: false, message: 'An account with this email already exists' };
      }

      // Check if username already exists
      const existingUsername = await pool.query('SELECT id FROM seller_users WHERE username = $1', [username]);
      if (existingUsername.rows.length > 0) {
        return { success: false, message: 'Username already taken, please try again' };
      }

      // Create new seller user
      const userQuery = `
        INSERT INTO seller_users (username, email, password_hash, business_name, is_active, agent_enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `;
      const userResult = await pool.query(userQuery, [
        username, 
        email, 
        'password123', // Default password for demo accounts
        businessName, 
        true, 
        true
      ]);
      
      const userId = userResult.rows[0].id;

      // Create seller profile
      const profileQuery = `
        INSERT INTO seller_profile (user_id, business_name, owner_name, email, phone, address, gst_number, rating, total_sales, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;
      await pool.query(profileQuery, [
        userId,
        businessName,
        ownerName,
        email,
        '+91-9876543210', // Default phone
        'Demo Address, City, State - 123456', // Default address
        'GST123456789', // Default GST
        4.5, // Default rating
        0 // Initial sales
      ]);

      // Create demo products
      const demoProducts = [
        {
          name: 'Wireless Bluetooth Headphones',
          category: 'Electronics',
          price: 1299,
          purchase_price: 899,
          stock: 50,
          description: 'High-quality wireless headphones with noise cancellation',
          status: 'active'
        },
        {
          name: 'Smartphone Stand',
          category: 'Accessories',
          price: 299,
          purchase_price: 199,
          stock: 100,
          description: 'Adjustable smartphone stand for desk use',
          status: 'active'
        },
        {
          name: 'USB-C Cable',
          category: 'Electronics',
          price: 199,
          purchase_price: 149,
          stock: 75,
          description: 'Fast charging USB-C cable, 1 meter length',
          status: 'active'
        },
        {
          name: 'Wireless Mouse',
          category: 'Electronics',
          price: 599,
          purchase_price: 399,
          stock: 30,
          description: 'Ergonomic wireless mouse with precision tracking',
          status: 'active'
        },
        {
          name: 'Laptop Sleeve',
          category: 'Accessories',
          price: 399,
          purchase_price: 299,
          stock: 60,
          description: 'Protective laptop sleeve with soft padding',
          status: 'active'
        }
      ];

      for (const product of demoProducts) {
        const profitMargin = ((product.price - product.purchase_price) / product.price) * 100;
        const productQuery = `
          INSERT INTO products (user_id, name, category, price, purchase_price, stock, description, status, profit_margin, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `;
        await pool.query(productQuery, [
          userId,
          product.name,
          product.category,
          product.price,
          product.purchase_price,
          product.stock,
          product.description,
          product.status,
          profitMargin
        ]);
      }

      // Create demo orders
      const demoOrders = [
        {
          customerName: 'Rahul Kumar',
          total: 1598,
          status: 'delivered',
          products: ['Wireless Bluetooth Headphones', 'Smartphone Stand']
        },
        {
          customerName: 'Priya Sharma',
          total: 798,
          status: 'processing',
          products: ['USB-C Cable', 'Laptop Sleeve']
        },
        {
          customerName: 'Amit Patel',
          total: 599,
          status: 'shipped',
          products: ['Wireless Mouse']
        }
      ];

      for (const order of demoOrders) {
        const orderId = 'ORD' + Math.random().toString(36).substr(2, 8).toUpperCase();
        const orderQuery = `
          INSERT INTO orders (id, user_id, customer_name, total, status, order_date, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 30)} days', NOW(), NOW())
          RETURNING id
        `;
        const orderResult = await pool.query(orderQuery, [
          orderId,
          userId,
          order.customerName,
          order.total,
          order.status
        ]);
        
        // Add order items
        for (const productName of order.products) {
          const productQuery = 'SELECT price FROM products WHERE user_id = $1 AND name = $2 LIMIT 1';
          const productResult = await pool.query(productQuery, [userId, productName]);
          
          if (productResult.rows.length > 0) {
            const productPrice = productResult.rows[0].price;
            const orderItemQuery = `
              INSERT INTO order_items (order_id, product_name, quantity, price)
              VALUES ($1, $2, $3, $4)
            `;
            await pool.query(orderItemQuery, [orderId, productName, 1, productPrice]);
          }
        }
      }

      return { success: true, userId: userId };
    } catch (error) {
      console.error('Create demo account error:', error);
      return { success: false, message: 'Failed to create demo account' };
    }
  },

  // Add new functions for product history and profit tracking
  addProductHistory: async function(userId, productId, changeData) {
    const query = `
      INSERT INTO product_history (
        product_id, user_id, change_type, old_value, new_value, 
        old_price, new_price, old_profit_margin, new_profit_margin,
        profit_impact, units_affected, change_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    const values = [
      productId, userId, changeData.changeType, changeData.oldValue, changeData.newValue,
      changeData.oldPrice, changeData.newPrice, changeData.oldProfitMargin, changeData.newProfitMargin,
      changeData.profitImpact, changeData.unitsAffected, changeData.changeReason
    ];
    
    try {
      const result = await this.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding product history:', error);
      throw error;
    }
  },

  getProductHistory: async function(userId, productId, limit = 50, offset = 0) {
    const query = `
      SELECT ph.*, p.name as product_name
      FROM product_history ph
      JOIN products p ON ph.product_id = p.id
      WHERE ph.user_id = $1 AND ph.product_id = $2
      ORDER BY ph.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    try {
      const result = await this.query(query, [userId, productId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error getting product history:', error);
      throw error;
    }
  },

  updateProductWithProfit: async function(userId, productId, updates) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current product data
      const currentProduct = await client.query(
        'SELECT * FROM products WHERE id = $1 AND user_id = $2',
        [productId, userId]
      );
      
      if (currentProduct.rows.length === 0) {
        throw new Error('Product not found');
      }
      
      const current = currentProduct.rows[0];
      
      // Calculate new profit margin if price or purchase price changed
      let newProfitMargin = current.profit_margin;
      let profitImpact = 0;
      
      if (updates.price !== undefined || updates.purchase_price !== undefined) {
        const newPrice = updates.price || current.price;
        const newPurchasePrice = updates.purchase_price || current.purchase_price;
        
        if (newPurchasePrice > 0) {
          newProfitMargin = ((newPrice - newPurchasePrice) / newPrice) * 100;
        }
        
        // Calculate profit impact based on units sold
        const priceDiff = (updates.price || current.price) - current.price;
        profitImpact = priceDiff * current.units_sold;
      }
      
      // Prepare update data
      const updateData = {
        ...updates,
        profit_margin: newProfitMargin,
        last_price_change: updates.price !== undefined ? 'NOW()' : current.last_price_change
      };
      
      // Update product
      const updateFields = Object.keys(updateData)
        .filter(key => updateData[key] !== undefined)
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ');
      
      const updateValues = [productId, userId, ...Object.values(updateData).filter(v => v !== undefined)];
      
      await client.query(`
        UPDATE products 
        SET ${updateFields}, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, updateValues);
      
      // Add to product history
      const historyData = {
        changeType: 'price_change',
        oldValue: current.price,
        newValue: updates.price || current.price,
        oldPrice: current.price,
        newPrice: updates.price || current.price,
        oldProfitMargin: current.profit_margin,
        newProfitMargin: newProfitMargin,
        profitImpact: profitImpact,
        unitsAffected: current.units_sold,
        changeReason: updates.change_reason || 'Price update'
      };
      
      await this.addProductHistory(userId, productId, historyData);
      
      await client.query('COMMIT');
      
      return { success: true, newProfitMargin, profitImpact };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating product with profit:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  getProfitAnalytics: async function(userId, days = 30) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.purchase_price,
        p.profit_margin,
        p.total_profit,
        p.units_sold,
        p.stock,
        p.last_price_change,
        COALESCE(SUM(oi.quantity), 0) as total_ordered,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.name = oi.product_name
      LEFT JOIN orders o ON oi.order_id = o.id AND o.user_id = $1
      WHERE p.user_id = $1
      GROUP BY p.id, p.name, p.price, p.purchase_price, p.profit_margin, 
               p.total_profit, p.units_sold, p.stock, p.last_price_change
      ORDER BY p.total_profit DESC
    `;
    
    try {
      const result = await this.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting profit analytics:', error);
      throw error;
    }
  },

  getProductProfitHistory: async function(userId, productId, days = 30) {
    const query = `
      SELECT 
        ph.*,
        p.name as product_name
      FROM product_history ph
      JOIN products p ON ph.product_id = p.id
      WHERE ph.user_id = $1 AND ph.product_id = $2
      AND ph.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY ph.created_at DESC
    `;
    
    try {
      const result = await this.query(query, [userId, productId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting product profit history:', error);
      throw error;
    }
  },

  calculateProfitRecommendations: async function(userId) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.purchase_price,
        p.profit_margin,
        p.units_sold,
        p.stock,
        CASE 
          WHEN p.profit_margin < 20 THEN 'Low profit margin - consider increasing price'
          WHEN p.profit_margin > 50 THEN 'High profit margin - consider competitive pricing'
          ELSE 'Good profit margin'
        END as recommendation,
        CASE 
          WHEN p.stock < 10 THEN 'Low stock - consider restocking'
          WHEN p.stock > 100 THEN 'High stock - consider promotions'
          ELSE 'Stock level OK'
        END as stock_recommendation,
        (p.price - p.purchase_price) * p.units_sold as total_profit_generated
      FROM products p
      WHERE p.user_id = $1
      ORDER BY p.profit_margin DESC
    `;
    
    try {
      const result = await this.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error calculating profit recommendations:', error);
      throw error;
    }
  }
};

db.initializeDatabase = initializeDatabase;
module.exports = {
  pool,
  initializeDatabase,
  authenticateUser: db.authenticateUser,
  getUserById: db.getUserById,
  getSellerProfile: db.getSellerProfile,
  getAgentEnabled: db.getAgentEnabled,
  updateAgentEnabled: db.updateAgentEnabled,
  updateSellerProfile: db.updateSellerProfile,
  getProducts: db.getProducts,
  getProduct: db.getProduct,
  addProduct: db.addProduct,
  updateProduct: db.updateProduct,
  getOrders: db.getOrders,
  updateOrderStatus: db.updateOrderStatus,
  getAnalytics: db.getAnalytics,
  query: db.query,
  // Chat logging functions
  createChatLogsTable: db.createChatLogsTable,
  insertChatLog: db.insertChatLog,
  getChatLogsBySeller: db.getChatLogsBySeller,
  getChatAnalytics: db.getChatAnalytics,
  getPopularQueries: db.getPopularQueries,
  cleanOldChatLogs: db.cleanOldChatLogs,
  // Order History CRUD Operations
  createOrderHistory: db.createOrderHistory,
  getOrderHistory: db.getOrderHistory,
  getOrderHistoryById: db.getOrderHistoryById,
  updateOrderHistory: db.updateOrderHistory,
  deleteOrderHistory: db.deleteOrderHistory,
  getOrderHistoryStats: db.getOrderHistoryStats,
  // Demo account functions
  createDemoAccount: db.createDemoAccount,
  // Add new functions for product history and profit tracking
  addProductHistory: db.addProductHistory,
  getProductHistory: db.getProductHistory,
  updateProductWithProfit: db.updateProductWithProfit,
  getProfitAnalytics: db.getProfitAnalytics,
  getProductProfitHistory: db.getProductProfitHistory,
  calculateProfitRecommendations: db.calculateProfitRecommendations
}; 