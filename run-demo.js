const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎬 Flipkart Seller Dashboard - Automated Demo');
console.log('=============================================\n');

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000');
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Install puppeteer if not installed
async function setupDependencies() {
    console.log('📦 Checking dependencies...');
    
    try {
        require('puppeteer');
        console.log('✅ Puppeteer already installed');
    } catch (error) {
        console.log('📥 Installing Puppeteer...');
        execSync('npm install puppeteer', { stdio: 'inherit' });
        console.log('✅ Puppeteer installed successfully');
    }
}

// Start the demo
async function startDemo() {
    console.log('\n🚀 Starting automated demo...');
    console.log('⚠️  Make sure your server is running on http://localhost:3000');
    console.log('⚠️  The browser will open automatically and run through all features\n');
    
    // Wait for user confirmation
    console.log('Press Enter to start the demo...');
    process.stdin.once('data', async () => {
        try {
            const { SimpleDemoRecorder } = require('./simple-demo-script.js');
            const demo = new SimpleDemoRecorder();
            await demo.initialize();
            await demo.runDemo();
            await demo.cleanup();
            
            console.log('\n🎉 Demo completed successfully!');
            console.log('📸 Check the demo-screenshots folder for all screenshots');
            console.log('🌐 You can also open demo-slideshow.html for an interactive slideshow');
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            console.log('\n💡 Troubleshooting:');
            console.log('1. Make sure your server is running: node server.js');
            console.log('2. Check if http://localhost:3000 is accessible');
            console.log('3. Ensure all dependencies are installed');
        }
    });
}

// Main execution
async function main() {
    await setupDependencies();
    await startDemo();
}

main().catch(console.error); 