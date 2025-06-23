const FlipkartSellerAgent = require('./flipkart-ai-agent');
const db = require('./database');

async function testHighProfitProducts() {
    try {
        console.log('Testing high profit products query...');
        
        // Initialize AI agent with seller4
        const aiAgent = new FlipkartSellerAgent();
        await aiAgent.initialize(4); // seller4
        
        // Test the high profit products query
        const response = await aiAgent.handleMessage('Show me high profit products');
        
        console.log('Response:', JSON.stringify(response, null, 2));
        
        // Close database connection
        await db.close();
        
    } catch (error) {
        console.error('Test error:', error);
        await db.close();
    }
}

testHighProfitProducts(); 