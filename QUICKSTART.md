# Quick Start Guide

Get your Fly Fishing Cards Mini Program running in 3 minutes!

## Prerequisites

- WeChat Developer Tools installed
- Internet connection
- BigModel API key (get free from https://open.bigmodel.cn/)

## Setup (3 minutes)

### Step 1: Get BigModel API Key (2 minutes)

1. Visit https://open.bigmodel.cn/
2. Register/Login to your account
3. Go to "API Keys" (API Key管理)
4. Create a new API key (free)
5. Copy the key

### Step 2: Configure API Key (30 seconds)

Edit `app.js` in project root:

```javascript
App({
  globalData: {
    bigModelApiKey: 'your_api_key_here'  // Paste your key here
  }
})
```

### Step 3: Open in WeChat Developer Tools (30 seconds)

1. Launch WeChat Developer Tools
2. Click "Import Project" (导入项目)
3. Select this folder (`hookedlee`)
4. Choose AppID:
   - **Development**: "Test AppID" (测试号) - no registration
   - **Production**: Your registered AppID
5. Click "Import" (导入)

## Testing (1 minute)

1. Click "Generate New Card" (生成新卡片) button
2. Wait 10-20 seconds for card generation
3. View your fly fishing card with:
   - Real article from internet
   - AI-generated image
4. Try different category filters

## Domain Whitelisting (Production Only)

Skip this for development testing.

For production, whitelist these domains in WeChat Mini Program Console:
```
https://api.rss2json.com
https://open.bigmodel.cn
```

## Features

✅ Real articles from 8+ fly fishing websites via RSS
✅ AI-generated images using BigModel (free CogView-3-Flash model)
✅ 4 category filters (Fly Tying, Casting, Biology, Gear)
✅ Modern UI with smooth animations
✅ No cloud functions or backend server needed

## Troubleshooting

### "API Key Required" Error

Edit `app.js` and add your BigModel API key.

### "Network Error" or "Request Failed"

- Check internet connection
- Verify domains are whitelisted (production)
- Check that API key is valid
- Try searching card again

### "Failed to Fetch Article"

- Check internet connection
- Some RSS feeds may be temporarily down
- App tries multiple feeds before failing
- Try searching card again

### Images Not Loading

- Check internet connection
- Image URL is valid for 30 days
- Try searching a new card

## Ready to Use! 🎣

Get your free BigModel API key and start searching cards!

For detailed documentation, see [README.md](README.md).
