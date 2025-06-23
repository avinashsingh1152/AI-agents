const puppeteer = require('puppeteer');
const fs = require('fs');

class SimpleDemoRecorder {
    constructor() {
        this.browser = null;
        this.page = null;
        this.screenshotDir = './demo-screenshots';
    }

    async initialize() {
        console.log('🚀 Starting automated demo...');
        
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir);
        }

        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
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
        await this.page.type('#chatInput', message);
        await this.page.keyboard.press('Enter');
        await this.wait(3000);
    }

    async runDemo() {
        try {
            // Scene 1: Dashboard
            console.log('\n📋 Scene 1: Dashboard');
            await this.page.goto('http://localhost:3000');
            await this.takeScreenshot('01-dashboard');

            // Scene 2: AI Chat
            console.log('\n📋 Scene 2: AI Chat Demo');
            await this.page.click('#chatToggle');
            await this.takeScreenshot('02-chat-open');

            await this.typeMessage('Hello');
            await this.takeScreenshot('03-hello');

            await this.typeMessage('Help');
            await this.takeScreenshot('04-help');

            await this.typeMessage('What\'s my business summary?');
            await this.takeScreenshot('05-business-summary');

            await this.typeMessage('Show me all products');
            await this.takeScreenshot('06-products');

            await this.typeMessage('Any low stock alerts?');
            await this.takeScreenshot('07-low-stock');

            await this.typeMessage('Update Wireless Headphones stock to 150');
            await this.takeScreenshot('08-inventory-update');

            // Scene 3: Analytics
            console.log('\n📋 Scene 3: Analytics');
            await this.page.click('a[href="/analytics"]');
            await this.takeScreenshot('09-analytics');

            // Scene 4: Inventory
            console.log('\n📋 Scene 4: Inventory');
            await this.page.click('a[href="/inventory"]');
            await this.takeScreenshot('10-inventory');

            // Scene 5: Payments
            console.log('\n📋 Scene 5: Payments');
            await this.page.click('a[href="/payment-details"]');
            await this.takeScreenshot('11-payments');

            // Scene 6: Predictions
            console.log('\n📋 Scene 6: Predictions');
            await this.page.click('#chatToggle');
            await this.typeMessage('Show me business predictions');
            await this.takeScreenshot('12-predictions');

            console.log('\n✅ Demo completed!');
            console.log(`📸 Screenshots: ${this.screenshotDir}`);
            console.log(`🎬 Total: ${fs.readdirSync(this.screenshotDir).length} screenshots`);

        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    async cleanup() {
        if (this.browser) await this.browser.close();
    }
}

async function main() {
    const demo = new SimpleDemoRecorder();
    try {
        await demo.initialize();
        await demo.runDemo();
    } finally {
        await demo.cleanup();
    }
}

if (require.main === module) {
    main();
} 