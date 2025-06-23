const FlipkartSellerAgent = require('./flipkart-ai-agent');

async function testSpecificIssues() {
    console.log('🔍 Testing Specific Failing Queries\n');
    
    // Initialize AI agent with seller4
    const aiAgent = new FlipkartSellerAgent();
    await aiAgent.initialize(4); // seller4
    
    const failingQueries = [
        // Basic greetings and help
        "Hello",
        "Help", 
        "What can you do?",
        
        // Product listing
        "Show me all products",
        "List all my products",
        
        // Business analytics
        "What's my revenue today?",
        "What's my current GMV?",
        
        // Inventory
        "What's running low?",
        "What needs restocking?",
        
        // CSV processing
        "I have a CSV file to upload",
        "Process my CSV file",
        
        // Predictions
        "Show me business predictions",
        "Show me future predictions",
        
        // Payments
        "Show me payment status",
        "Check my payments",
        
        // Change management
        "What's different?",
        "What's been updated?",
        
        // Business impact
        "Show me the advantages",
        "What's in it for me?",
        
        // Product queries
        "Smartwatch data",
        "Electronics data",
        
        // Error handling
        "Invalid command",
        "Wrong format"
    ];
    
    let workingQueries = [];
    let failingQueriesList = [];
    
    for (const query of failingQueries) {
        try {
            console.log(`\n🔍 Testing: "${query}"`);
            const response = await aiAgent.handleMessage(query);
            
            // Handle nested response format
            let actualMessage = '';
            let responseType = '';
            
            if (response && response.response) {
                // Nested format
                actualMessage = response.response;
                responseType = response.responseType || 'unknown';
            } else if (response && response.message) {
                // Direct format
                actualMessage = response.message;
                responseType = response.responseType || 'unknown';
            } else {
                actualMessage = response;
                responseType = 'unknown';
            }
            
            if (actualMessage && !actualMessage.includes("I'm Here to Help!")) {
                console.log(`✅ WORKING: Got specific response (${responseType})`);
                console.log(`   Message preview: ${actualMessage.substring(0, 100)}...`);
                workingQueries.push(query);
            } else {
                console.log(`❌ FAILING: Generic help response`);
                console.log(`   Response type: ${responseType}`);
                failingQueriesList.push(query);
            }
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            failingQueriesList.push(query);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Queries: ${failingQueries.length}`);
    console.log(`Working: ${workingQueries.length}`);
    console.log(`Failing: ${failingQueriesList.length}`);
    console.log(`Success Rate: ${((workingQueries.length / failingQueries.length) * 100).toFixed(1)}%`);
    
    if (workingQueries.length > 0) {
        console.log('\n✅ WORKING QUERIES:');
        workingQueries.forEach((query, index) => {
            console.log(`${index + 1}. "${query}"`);
        });
    }
    
    if (failingQueriesList.length > 0) {
        console.log('\n❌ FAILING QUERIES (returning generic help):');
        failingQueriesList.forEach((query, index) => {
            console.log(`${index + 1}. "${query}"`);
        });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    if (failingQueriesList.length === 0) {
        console.log('✅ All queries are working! The bot is functioning perfectly.');
    } else {
        console.log('🔧 Issues found. The following queries need specific handlers:');
        console.log('1. Add handlers for basic greetings and help queries');
        console.log('2. Add handlers for specific business analytics queries');
        console.log('3. Add handlers for specific inventory queries');
        console.log('4. Add handlers for specific CSV processing queries');
        console.log('5. Add handlers for specific change management queries');
        console.log('6. Add handlers for specific product queries');
        console.log('7. Add handlers for error cases');
    }
}

testSpecificIssues().catch(console.error); 