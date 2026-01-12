# Fly Fishing Cards - Simple Setup Guide

## Ready to Use in 2 Minutes! 🎣

No dependencies, no cloud setup, no API keys needed.

## Step 1: Open in WeChat Developer Tools

1. Launch WeChat Developer Tools
2. Click "Import Project" (导入项目)
3. Select this folder (`hookedlee`)
4. Choose AppID:
   - **Development**: "Test AppID" (测试号) - no registration
   - **Production**: Your registered AppID
5. Click "Import"

## Step 2: Test the App

1. Click "Generate New Card" button
2. Wait ~0.5 seconds
3. View your fly fishing card!
4. Try different category filters

## Step 3: Customize (Optional)

### Add Articles

Edit `data/articles.js`:

```javascript
const flyFishingArticles = {
  "fly tying": [
    {
      title: "Your Article",
      summary: "Summary here...",
      source: "Source Name"
    }
  ]
}
```

### Add Images

Edit `data/images.js`:

```javascript
const flyFishingImages = [
  {
    url: "https://images.unsplash.com/photo-...",
    description: "Description",
    category: "general"
  }
]
```

### Change Colors

Edit `pages/index/index.wxss` and modify gradient:

```css
.container {
  background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}
```

## That's It!

Your app is ready to use. No setup, no installation, no configuration.

For detailed documentation:
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Architecture

Enjoy! 🎣
