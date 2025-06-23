const FlipkartSellerAgent = require('./flipkart-ai-agent');

async function testAllStatements() {
    console.log('🤖 Testing All Bot Statements from BOT_TESTING_GUIDE.md\n');
    
    // Initialize AI agent with seller4
    const aiAgent = new FlipkartSellerAgent();
    await aiAgent.initialize(4); // seller4
    
    const testCases = [
        // 1. Basic Greetings & Help
        { category: "Basic Greetings & Help", tests: [
            "Hello", "Hi", "Help", "What can you do?", "Show me what you can do", "Tell me about your features"
        ]},
        
        // 2. Business Analytics & Insights
        { category: "Business Analytics & Insights", tests: [
            "What's my business summary?", "Show me my business analytics", "What's my revenue today?", 
            "How are my sales performing?", "Give me a business overview", "Show me my performance metrics",
            "What's my current GMV?", "Tell me about my business health"
        ]},
        
        // 3. Product Management
        { category: "Product Management", tests: [
            "Show me all products", "List all my products", "What products do I have?", 
            "Show me product details", "Display my inventory", "Show me my catalog",
            "List all items", "Show me my product list"
        ]},
        
        // 4. Product History & Details
        { category: "Product History & Details", tests: [
            "Show me Wireless Headphones history", "Tell me about Wireless Headphones",
            "Show me Smartphone history", "Give me details about Smartphone",
            "Show me Laptop history", "What's the history of Laptop?",
            "Show me Smartwatch history", "Tell me about Smartwatch sales"
        ]},
        
        // 5. Inventory Management
        { category: "Inventory Management", tests: [
            "Any low stock alerts?", "Show me low stock items", "What's running low?",
            "Check my inventory levels", "Show me stock status", "Any products out of stock?",
            "What needs restocking?", "Show me inventory alerts", "Check stock levels", "Any inventory issues?"
        ]},
        
        // 6. Bulk Inventory Updates
        { category: "Bulk Inventory Updates", tests: [
            "Update all Electronics stock to 100", "Set all Electronics to 50 units",
            "Update Electronics category to 75", "Set Electronics stock to 200",
            "Update all Electronics to 150", "Set Electronics inventory to 80"
        ]},
        
        // 7. CSV Processing & File Upload
        { category: "CSV Processing & File Upload", tests: [
            "I have a CSV file to upload", "Upload my orders CSV", "Process my CSV file",
            "I want to upload orders", "Handle my CSV data", "Upload order file",
            "Process CSV orders", "Upload my data file"
        ]},
        
        // 8. Business Predictions & Forecasting
        { category: "Business Predictions & Forecasting", tests: [
            "Show me business predictions", "What's my business forecast?", "Predict my sales",
            "Show me future predictions", "Give me a forecast", "What can I expect next month?",
            "Show me revenue predictions", "Predict my business growth", "Show me sales forecast",
            "What's my business outlook?"
        ]},
        
        // 9. Payment Analytics
        { category: "Payment Analytics", tests: [
            "Show me payment status", "What's my payment summary?", "Check my payments",
            "Show me payment analytics", "Payment overview", "Payment status report",
            "Show me payment details", "Payment summary please"
        ]},
        
        // 10. Order Management
        { category: "Order Management", tests: [
            "Show me my orders", "List all orders", "Order status", "Show me order history",
            "Check my orders", "Order summary", "Show me recent orders", "Order analytics"
        ]},
        
        // 11. Change Management & Updates
        { category: "Change Management & Updates", tests: [
            "What changed?", "What's new?", "Show me recent changes", "What updates are there?",
            "Tell me about changes", "What's different?", "Show me new features",
            "What's been updated?", "Recent changes please", "New features?"
        ]},
        
        // 12. Business Impact & Benefits
        { category: "Business Impact & Benefits", tests: [
            "How do these changes help my business?", "What are the benefits?", "How does this help me?",
            "Business benefits", "Show me the advantages", "What's in it for me?",
            "How does this improve my business?", "Benefits of these features"
        ]},
        
        // 13. Specific Product Queries
        { category: "Specific Product Queries", tests: [
            "Show me Wireless Headphones sales", "Smartphone performance", "Laptop analytics",
            "Smartwatch data", "Tablet sales", "Headphones performance", "Phone sales data",
            "Computer analytics", "Watch performance", "Pad sales data"
        ]},
        
        // 14. Category-Based Queries
        { category: "Category-Based Queries", tests: [
            "Show me Electronics performance", "Electronics sales", "Electronics analytics",
            "Electronics data", "Electronics summary", "Electronics overview", "Electronics report",
            "Electronics insights"
        ]},
        
        // 15. High Profit Products
        { category: "High Profit Products", tests: [
            "Show me high profit products", "High profit items", "Profitable products",
            "Best profit products", "Top profit items", "High margin products"
        ]},
        
        // 16. Error Handling & Edge Cases
        { category: "Error Handling & Edge Cases", tests: [
            "Update stock to -5", "Set inventory to abc", "Invalid command", "Wrong format",
            "Error test", "Break the system", "Invalid input", "Wrong data"
        ]}
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = [];
    
    for (const category of testCases) {
        console.log(`\n📋 Testing: ${category.category}`);
        console.log('='.repeat(50));
        
        for (const testMessage of category.tests) {
            totalTests++;
            try {
                const response = await aiAgent.handleMessage(testMessage);
                
                // Check if response is valid
                if (response && (response.success !== false) && response.message) {
                    console.log(`✅ "${testMessage}" - OK`);
                    passedTests++;
                } else {
                    console.log(`❌ "${testMessage}" - FAILED (Invalid response)`);
                    failedTests.push({ message: testMessage, category: category.category, issue: 'Invalid response' });
                }
            } catch (error) {
                console.log(`❌ "${testMessage}" - ERROR: ${error.message}`);
                failedTests.push({ message: testMessage, category: category.category, issue: error.message });
            }
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests.length}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        console.log('='.repeat(60));
        failedTests.forEach((test, index) => {
            console.log(`${index + 1}. Category: ${test.category}`);
            console.log(`   Message: "${test.message}"`);
            console.log(`   Issue: ${test.issue}`);
            console.log('');
        });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    if (failedTests.length === 0) {
        console.log('✅ All tests passed! The bot is working perfectly.');
    } else {
        console.log('🔧 Issues found. Consider:');
        console.log('1. Check message routing in handleMessage()');
        console.log('2. Verify all handler methods exist');
        console.log('3. Test specific failed categories');
        console.log('4. Review error handling');
    }
}

testAllStatements().catch(console.error); 