const puppeteer = require('puppeteer');
const fs = require('fs');

class WhatsAppDemoRecorder {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshotDir = './whatsapp-demo-screenshots';
    }

    async initialize() {
        console.log('🚀 Starting WhatsApp Demo...');
        
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir);
        }

        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1600, height: 900 });
    }

    async takeScreenshot(name) {
        const filename = `${this.screenshotDir}/${name}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        console.log(`📸 ${name}`);
        await this.wait(2000);
    }

    async wait(ms = 2000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async typeMessage(message) {
        console.log(`💬 "${message}"`);
        await this.page.type('#messageInput', message);
        await this.page.keyboard.press('Enter');
        await this.wait(3000);
    }

    async runWhatsAppDemo() {
        try {
            // Scene 0: Login
            console.log('\n📋 Scene 0: Login');
            await this.page.goto('http://localhost:3000/login');
            await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
            await this.page.type('input[name="username"]', 'seller3');
            await this.page.type('input[name="password"]', 'password123');
            await this.takeScreenshot('00-login-filled');
            await this.page.click('button[type="submit"].btn-login');
            await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
            await this.takeScreenshot('00-dashboard-after-login');

            // Scene 1: Navigate to WhatsApp
            console.log('\n📋 Scene 1: Navigate to WhatsApp');
            // Try to find a WhatsApp button or link
            const whatsappSelector = 'a[href="/whatsapp"], button[onclick*="whatsapp"], .btn-whatsapp, .fa-whatsapp';
            await this.page.waitForSelector(whatsappSelector, { timeout: 10000 });
            // Click the first matching element
            await this.page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
            }, whatsappSelector);
            await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
            await this.wait(2000);
            await this.takeScreenshot('01-whatsapp-interface');

            // Scene 2: Select AI Assistant
            console.log('\n📋 Scene 2: Select AI Assistant');
            await this.page.waitForSelector('.chat-item .chat-name', { timeout: 10000 });
            await this.page.evaluate(() => {
                const items = [...document.querySelectorAll('.chat-item .chat-name')];
                const ai = items.find(el => el.textContent.includes('Flipkart Agent'));
                if (ai) ai.closest('.chat-item').click();
            });
            await this.wait(2000);
            await this.takeScreenshot('02-ai-assistant-selected');

            // Scene 3: Send Hello Message
            console.log('\n📋 Scene 3: Send Hello Message');
            await this.page.waitForSelector('#messageInput', { timeout: 10000 });
            await this.typeMessage('Hello');
            await this.takeScreenshot('03-hello-message');

            // Scene 4: Business Summary
            console.log('\n📋 Scene 4: Business Summary');
            await this.typeMessage('What\'s my business summary?');
            await this.takeScreenshot('04-business-summary');

            // Scene 5: Product Catalog
            console.log('\n📋 Scene 5: Product Catalog');
            await this.typeMessage('Show me all products');
            await this.takeScreenshot('05-product-catalog');

            // Scene 6: Low Stock Alerts
            console.log('\n📋 Scene 6: Low Stock Alerts');
            await this.typeMessage('Any low stock alerts?');
            await this.takeScreenshot('06-low-stock-alerts');

            // Scene 7: Inventory Update
            console.log('\n📋 Scene 7: Inventory Update');
            await this.typeMessage('Update Wireless Headphones stock to 150');
            await this.takeScreenshot('07-inventory-update');

            // Scene 8: Business Predictions
            console.log('\n📋 Scene 8: Business Predictions');
            await this.typeMessage('Show me business predictions');
            await this.takeScreenshot('08-business-predictions');

            // Scene 9: Help Request
            console.log('\n📋 Scene 9: Help Request');
            await this.typeMessage('Help');
            await this.takeScreenshot('09-help-request');

            // Scene 10: CSV Upload
            console.log('\n📋 Scene 10: CSV Upload');
            await this.typeMessage('I want to upload orders');
            await this.takeScreenshot('10-csv-upload');

            console.log('\n✅ WhatsApp Demo completed!');
            console.log(`📸 Screenshots: ${this.screenshotDir}`);
            console.log(`🎬 Total: ${fs.readdirSync(this.screenshotDir).length} screenshots`);

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.log('\n💡 Make sure your server is running: node server.js');
            console.log('💡 Check if the WhatsApp route is accessible at: http://localhost:3000/whatsapp');
        }
    }

    async createWhatsAppSlideshow() {
        console.log('\n🎬 Creating WhatsApp slideshow...');
        
        const screenshots = fs.readdirSync(this.screenshotDir)
            .filter(file => file.endsWith('.png'))
            .sort();

        const titles = {
            '01-whatsapp-interface': 'WhatsApp Interface',
            '02-ai-assistant-selected': 'AI Assistant Selected',
            '03-hello-message': 'Hello Message',
            '04-business-summary': 'Business Summary',
            '05-product-catalog': 'Product Catalog',
            '06-low-stock-alerts': 'Low Stock Alerts',
            '07-inventory-update': 'Inventory Update',
            '08-business-predictions': 'Business Predictions',
            '09-help-request': 'Help Request',
            '10-csv-upload': 'CSV Upload'
        };

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp AI Assistant Demo</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); 
            color: white; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: white; font-size: 2.5em; margin-bottom: 10px; }
        .header p { color: #e8f5e8; font-size: 1.2em; }
        
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
            border: 3px solid #128c7e; 
            border-radius: 12px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .slide h3 { 
            color: white; 
            margin: 20px 0 15px 0; 
            font-size: 1.5em;
        }
        
        .controls { 
            text-align: center; 
            margin: 30px 0; 
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        button { 
            padding: 12px 24px; 
            margin: 0 10px; 
            background: linear-gradient(45deg, #25d366, #128c7e); 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            color: white;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(37,211,102,0.3);
        }
        .counter { 
            display: inline-block; 
            margin-left: 20px; 
            color: white; 
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
            background: rgba(255,255,255,0.1); 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
        }
        .feature h4 { color: white; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 WhatsApp AI Assistant Demo</h1>
            <p>AI-Powered Business Management via WhatsApp Interface</p>
        </div>
        
        <div class="features">
            <div class="feature">
                <h4>🤖 AI Assistant</h4>
                <p>Natural language business queries</p>
            </div>
            <div class="feature">
                <h4>📊 Business Analytics</h4>
                <p>Real-time business insights</p>
            </div>
            <div class="feature">
                <h4>📦 Inventory Management</h4>
                <p>Smart stock control via chat</p>
            </div>
            <div class="feature">
                <h4>📈 Predictions</h4>
                <p>AI-powered business forecasting</p>
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
                <img src="${this.screenshotDir}/${file}" alt="Demo Screenshot ${index + 1}">
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

        fs.writeFileSync('whatsapp-demo-slideshow.html', htmlContent);
        console.log('✅ WhatsApp slideshow created: whatsapp-demo-slideshow.html');
        console.log('🌐 Open whatsapp-demo-slideshow.html in your browser');
    }

    async cleanup() {
        if (this.browser) await this.browser.close();
    }
}

async function main() {
    const demo = new WhatsAppDemoRecorder();
    try {
        await demo.initialize();
        await demo.runWhatsAppDemo();
        await demo.createWhatsAppSlideshow();
    } finally {
        await demo.cleanup();
    }
}

if (require.main === module) {
    main();
} 