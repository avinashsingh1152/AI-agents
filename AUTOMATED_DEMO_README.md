# 🎬 Automated Demo System

## 📋 **Overview**

This automated demo system captures screenshots of all your Flipkart Seller Dashboard features and creates an interactive HTML slideshow. Perfect for presentations, demos, and documentation!

## 🚀 **Quick Start**

### **Step 1: Start Your Server**
```bash
node server.js
```

### **Step 2: Run the Automated Demo**
```bash
node run-demo.js
```

### **Step 3: View the Results**
- **Screenshots**: Check `demo-screenshots/` folder
- **Slideshow**: Open `demo-slideshow.html` in your browser

## 📁 **Files Created**

### **Demo Scripts**:
- `simple-demo-script.js` - Main automation script
- `run-demo.js` - Setup and execution script
- `create-slideshow.js` - HTML slideshow generator

### **Output Files**:
- `demo-screenshots/` - Folder with all screenshots
- `demo-slideshow.html` - Interactive slideshow

## 🎯 **What the Demo Covers**

### **Scene 1: Dashboard Overview**
- Main dashboard landing page
- Business metrics and overview

### **Scene 2: AI Chatbot Demo**
- Chat interface opening
- "Hello" greeting response
- "Help" feature overview
- "What's my business summary?" query
- "Show me all products" catalog
- "Any low stock alerts?" warnings
- "Update Wireless Headphones stock to 150" inventory update

### **Scene 3: Analytics Section**
- Analytics dashboard
- Performance metrics

### **Scene 4: Inventory Management**
- Inventory dashboard
- Stock management features

### **Scene 5: Payment Analytics**
- Payment details page
- Transaction tracking

### **Scene 6: Business Predictions**
- AI predictions interface
- Forecasting capabilities

## 🎬 **Interactive Slideshow Features**

### **Controls**:
- ⬅️ **Previous** - Go to previous slide
- ➡️ **Next** - Go to next slide
- ▶️ **Auto Play** - Automatic slideshow (4 seconds per slide)
- ⏹️ **Stop** - Stop auto-play

### **Keyboard Shortcuts**:
- **Arrow Keys** - Navigate slides
- **Spacebar** - Toggle auto-play

### **Professional Design**:
- Modern dark theme
- Smooth animations
- Responsive layout
- Feature highlights

## 🔧 **Customization**

### **Modify Demo Flow**:
Edit `simple-demo-script.js` to:
- Add more scenes
- Change timing
- Modify queries
- Add new features

### **Customize Slideshow**:
Edit `create-slideshow.js` to:
- Change styling
- Add more descriptions
- Modify transitions
- Include additional content

## 🛠️ **Troubleshooting**

### **Common Issues**:

1. **"Puppeteer not found"**
   ```bash
   npm install puppeteer
   ```

2. **"Server not running"**
   ```bash
   node server.js
   ```

3. **"Screenshots not captured"**
   - Check if `http://localhost:3000` is accessible
   - Ensure all page elements exist
   - Verify CSS selectors in the script

4. **"Browser doesn't open"**
   - Check if Chrome/Chromium is installed
   - Try running with `headless: true` in the script

### **Performance Tips**:
- Close other browser tabs
- Ensure stable internet connection
- Run during low system load

## 📊 **Demo Statistics**

- **Total Scenes**: 6 main scenes
- **Screenshots**: 12+ captured images
- **Duration**: ~2-3 minutes automated run
- **File Size**: ~5-10 MB total

## 🎯 **Use Cases**

### **For Presentations**:
- Investor demos
- Client presentations
- Team meetings
- Conference talks

### **For Documentation**:
- Feature documentation
- User guides
- Training materials
- Marketing collateral

### **For Development**:
- Feature testing
- UI/UX validation
- Regression testing
- Quality assurance

## 🚀 **Advanced Usage**

### **Batch Processing**:
```bash
# Run multiple demos
for i in {1..5}; do
    node run-demo.js
    sleep 10
done
```

### **Custom Screenshots**:
```javascript
// Add to simple-demo-script.js
await this.takeScreenshot('custom-feature');
```

### **Video Creation** (Optional):
```bash
# Install ffmpeg for video creation
brew install ffmpeg  # macOS
# Then convert screenshots to video
ffmpeg -framerate 1/3 -i demo-screenshots/%02d.png -c:v libx264 -pix_fmt yuv420p demo-video.mp4
```

## 📞 **Support**

If you encounter any issues:
1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Ensure your server is running properly
4. Check browser console for errors

---

**🎉 Enjoy your automated demo system!** 