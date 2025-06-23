const fs = require('fs');

function createSlideshow() {
    const screenshotDir = './demo-screenshots';
    
    if (!fs.existsSync(screenshotDir)) {
        console.log('❌ No screenshots found. Run the demo first!');
        return;
    }

    const screenshots = fs.readdirSync(screenshotDir)
        .filter(file => file.endsWith('.png'))
        .sort();

    const titles = {
        '01-dashboard': 'Dashboard Overview',
        '02-chat-open': 'AI Chat Interface',
        '03-hello': 'Hello Response',
        '04-help': 'Help Response',
        '05-business-summary': 'Business Summary',
        '06-products': 'Product Catalog',
        '07-low-stock': 'Low Stock Alerts',
        '08-inventory-update': 'Inventory Update',
        '09-analytics': 'Analytics Dashboard',
        '10-inventory': 'Inventory Management',
        '11-payments': 'Payment Analytics',
        '12-predictions': 'Business Predictions'
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Flipkart Seller Dashboard Demo</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); 
            color: white; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #00d4ff; font-size: 2.5em; margin-bottom: 10px; }
        .header p { color: #ccc; font-size: 1.2em; }
        
        .slide { 
            text-align: center; 
            margin-bottom: 40px; 
            display: none;
            animation: fadeIn 0.5s ease-in;
        }
        .slide.current { display: block; }
        
        .slide img { 
            max-width: 100%; 
            height: auto; 
            border: 3px solid #333; 
            border-radius: 12px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .slide h3 { 
            color: #00d4ff; 
            margin: 20px 0 15px 0; 
            font-size: 1.5em;
        }
        .slide p { color: #ccc; margin-bottom: 20px; }
        
        .controls { 
            text-align: center; 
            margin: 30px 0; 
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
        }
        button { 
            padding: 12px 24px; 
            margin: 0 10px; 
            background: linear-gradient(45deg, #00d4ff, #0099cc); 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            color: white;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,212,255,0.3);
        }
        .counter { 
            display: inline-block; 
            margin-left: 20px; 
            color: #00d4ff; 
            font-weight: bold;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .features { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 30px 0;
        }
        .feature { 
            background: rgba(255,255,255,0.05); 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
        }
        .feature h4 { color: #00d4ff; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Flipkart Seller Dashboard Demo</h1>
            <p>AI-Powered Business Intelligence Platform</p>
        </div>
        
        <div class="features">
            <div class="feature">
                <h4>🤖 AI Chatbot</h4>
                <p>Natural language queries for business insights</p>
            </div>
            <div class="feature">
                <h4>📊 Real-time Analytics</h4>
                <p>Live business metrics and performance tracking</p>
            </div>
            <div class="feature">
                <h4>📦 Inventory Management</h4>
                <p>Smart stock control and alerts</p>
            </div>
            <div class="feature">
                <h4>💳 Payment Analytics</h4>
                <p>Comprehensive financial tracking</p>
            </div>
        </div>
        
        <div class="controls">
            <button onclick="previousSlide()">⬅️ Previous</button>
            <button onclick="nextSlide()">Next ➡️</button>
            <button onclick="autoPlay()">▶️ Auto Play</button>
            <button onclick="stopAutoPlay()">⏹️ Stop</button>
            <span class="counter" id="slide-counter">Slide 1 of ${screenshots.length}</span>
        </div>

        ${screenshots.map((file, index) => `
            <div class="slide ${index === 0 ? 'current' : ''}" id="slide-${index}">
                <h3>${titles[file.replace('.png', '')] || 'Demo Screenshot'}</h3>
                <img src="${screenshotDir}/${file}" alt="Demo Screenshot ${index + 1}">
                <p>${getSlideDescription(file)}</p>
            </div>
        `).join('')}
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${screenshots.length};
        let autoPlayInterval = null;

        function showSlide(n) {
            document.querySelectorAll('.slide').forEach(slide => {
                slide.classList.remove('current');
            });
            
            document.getElementById('slide-' + n).classList.add('current');
            document.getElementById('slide-counter').textContent = \`Slide \${n + 1} of \${totalSlides}\`;
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }

        function previousSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            showSlide(currentSlide);
        }

        function autoPlay() {
            if (autoPlayInterval) return;
            autoPlayInterval = setInterval(nextSlide, 4000);
        }

        function stopAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') previousSlide();
            if (e.key === ' ') {
                e.preventDefault();
                if (autoPlayInterval) stopAutoPlay();
                else autoPlay();
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync('demo-slideshow.html', htmlContent);
    console.log('✅ HTML slideshow created: demo-slideshow.html');
    console.log('🌐 Open demo-slideshow.html in your browser to view the demo');
}

function getSlideDescription(filename) {
    const descriptions = {
        '01-dashboard': 'Main dashboard with business overview and key metrics',
        '02-chat-open': 'AI chatbot interface for natural language queries',
        '03-hello': 'Welcome greeting and user interaction',
        '04-help': 'Comprehensive help and feature overview',
        '05-business-summary': 'Detailed business analytics and performance metrics',
        '06-products': 'Complete product catalog with inventory status',
        '07-low-stock': 'Smart alerts for low stock items',
        '08-inventory-update': 'Real-time inventory management and updates',
        '09-analytics': 'Advanced analytics dashboard with trends and insights',
        '10-inventory': 'Comprehensive inventory management system',
        '11-payments': 'Payment analytics and transaction tracking',
        '12-predictions': 'AI-powered business predictions and forecasting'
    };
    return descriptions[filename.replace('.png', '')] || 'Feature demonstration';
}

if (require.main === module) {
    createSlideshow();
}

module.exports = { createSlideshow }; 