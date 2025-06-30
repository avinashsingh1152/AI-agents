# Azure OpenAI Integration Guide

## 🚀 Overview

This enhanced version of the Flipkart Seller Dashboard now integrates with Azure OpenAI GPT-4o to provide intelligent, context-aware responses to seller queries. The AI agent can now:

- **Analyze business data** and provide personalized insights
- **Generate intelligent recommendations** based on current business state
- **Handle complex queries** with natural language understanding
- **Provide context-aware responses** using real business data
- **Fall back gracefully** to local processing when needed

## 🔧 Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Azure OpenAI Configuration
OPENAI_API_KEY=your_azure_openai_api_key_here

# Optional: Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flipkart_seller_db
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=3000
SESSION_SECRET=your-session-secret-key
```

### 2. Set Environment Variable

```bash
# For Linux/Mac
export OPENAI_API_KEY=your_azure_openai_api_key_here

# For Windows
set OPENAI_API_KEY=your_azure_openai_api_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the Integration

```bash
node test-azure-openai.js
```

### 5. Start the Server

```bash
node server.js
```

## 🤖 How It Works

### Enhanced AI Agent Architecture

The new `FlipkartSellerAgentEnhanced` class provides:

1. **Azure OpenAI Integration**: Direct API calls to GPT-4o
2. **Business Context Injection**: Real-time business data sent to AI
3. **Intelligent Fallback**: Local processing when AI is unavailable
4. **Enhanced Logging**: Track AI interactions and performance

### Message Processing Flow

```
User Message → Enhanced AI Agent → Azure OpenAI API → Context-Aware Response
                ↓ (if AI fails)
            Local Processing → Fallback Response
```

### Business Context Preparation

The AI receives real-time business data including:

- **Product Information**: Stock levels, prices, profit margins
- **Order Data**: Recent orders, revenue, order values
- **Payment Analytics**: Success rates, disputes, processing times
- **Business Metrics**: Total revenue, average order value, alerts

## 📊 Key Features

### 1. Intelligent Business Insights

The AI can now provide:
- **Personalized recommendations** based on your business data
- **Predictive analytics** for inventory and sales
- **Strategic advice** for business growth
- **Context-aware responses** to complex queries

### 2. Enhanced Inventory Management

- **AI-powered stock recommendations**
- **Intelligent restocking suggestions**
- **Demand forecasting** based on sales patterns
- **Risk assessment** for low stock items

### 3. Smart Order Processing

- **Intelligent order analysis**
- **Customer behavior insights**
- **Revenue optimization suggestions**
- **Trend identification**

### 4. Advanced Analytics

- **AI-enhanced business summaries**
- **Predictive performance metrics**
- **Competitive analysis insights**
- **Growth opportunity identification**

## 🔍 API Configuration

### Azure OpenAI Endpoint

```javascript
const azureConfig = {
    endpoint: 'http://10.83.64.112/gpt-4o/chat/completions',
    apiVersion: '2023-07-01-preview',
    apiKey: process.env.OPENAI_API_KEY
};
```

### Request Format

```javascript
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
```

## 📝 Usage Examples

### 1. Business Analysis

**User**: "How can I improve my inventory management?"

**AI Response**: Based on your current data showing 2 low-stock products and 3 high-profit items, I recommend:
- Restock USB-C Cable (currently 5 units) to prevent stockouts
- Focus on promoting Smart Watch (35% profit margin) for better profitability
- Consider bulk ordering for Electronics category to reduce costs

### 2. Inventory Updates

**User**: "Update Wireless Headphones stock to 75"

**AI Response**: ✅ Inventory Updated Successfully
📦 Product Details:
- Product Name: Wireless Headphones
- Previous Stock: 50 units
- New Stock: 75 units
- Change: +25 units

🤖 AI Insights: This 50% stock increase is strategic for Wireless Headphones given its 25% profit margin. Consider monitoring sales velocity to optimize future restocking cycles.

### 3. Business Summary

**User**: "Show me my business summary"

**AI Response**: 📊 Business Summary (AI Enhanced)
💰 Total Revenue: ₹4,700
📦 Total Orders: 3
📈 Avg Order Value: ₹1,567
🛍️ Total Products: 3

⚠️ Alerts:
- Low Stock Items: 1 products (below 10 units)
- High Profit Products: 2 products (>20% margin)

💡 Ask me for AI-powered insights and recommendations! 🤖

## 🛠️ Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```
   ⚠️ No API key found. Set OPENAI_API_KEY environment variable
   ```
   **Solution**: Set the environment variable correctly

2. **API Call Failed**
   ```
   ❌ Azure OpenAI API call failed: Network Error
   ```
   **Solution**: Check network connectivity and endpoint URL

3. **Timeout Errors**
   ```
   ❌ Azure OpenAI API call error: timeout
   ```
   **Solution**: Increase timeout or check API service status

4. **Fallback to Local Processing**
   ```
   AI source: local_fallback
   ```
   **Solution**: This is normal when AI is unavailable

### Testing

Run the test suite to verify integration:

```bash
node test-azure-openai.js
```

## 🔄 Migration from v2.0

### What Changed

1. **New AI Agent Class**: `FlipkartSellerAgentEnhanced`
2. **Azure OpenAI Integration**: Direct API calls
3. **Enhanced Context**: Real business data injection
4. **Improved Logging**: AI interaction tracking
5. **Graceful Fallback**: Local processing when AI fails

### Backward Compatibility

- All existing features work as before
- Local processing is maintained as fallback
- No breaking changes to existing functionality

## 📈 Performance Monitoring

### AI Interaction Logging

The system logs all AI interactions with:
- User message
- AI response
- Processing time
- AI source (azure_openai, local_fallback, etc.)
- Success/failure status

### Metrics to Monitor

- **API Response Time**: Target < 5 seconds
- **Success Rate**: Target > 95%
- **Fallback Rate**: Monitor local processing usage
- **User Satisfaction**: Track response quality

## 🔮 Future Enhancements

### Planned Features

1. **Conversation Memory**: Remember previous interactions
2. **Multi-language Support**: Handle queries in different languages
3. **Voice Integration**: Speech-to-text and text-to-speech
4. **Advanced Analytics**: Deeper business insights
5. **Predictive Modeling**: Sales and inventory forecasting

### Customization Options

- **Prompt Engineering**: Customize AI behavior
- **Context Filtering**: Control data sent to AI
- **Response Formatting**: Custom output formats
- **Integration Hooks**: Connect with external systems

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Run the test suite: `node test-azure-openai.js`
3. Review server logs for error details
4. Verify API key and endpoint configuration

## 🎯 Best Practices

1. **Secure API Keys**: Never commit API keys to version control
2. **Monitor Usage**: Track API calls and costs
3. **Test Regularly**: Run tests before deployment
4. **Backup Data**: Ensure business data is backed up
5. **Update Prompts**: Refine system prompts for better responses

---

**Version**: v3.0  
**Last Updated**: January 2024  
**Status**: Production Ready ✅ 