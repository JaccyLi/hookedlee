# WeChat Mini Program - Fly Fishing Cards with AI

A WeChat Mini Program that generates beautiful cards featuring **real fly fishing articles** from the internet and **AI-generated images** using BigModel's image generation API.

## Features

- **Real Articles**: Fetches live articles from 8+ popular fly fishing websites via RSS feeds
- **AI-Generated Images**: Uses BigModel CogView-3-Flash (free model) to create unique fly fishing imagery
- **Multiple Sources**: MidCurrent, Orvis, Trout Unlimited, Fly Fish Food, Gink & Gasoline, Hatch Magazine, and more
- **Category Filtering**: Browse by Fly Tying, Fly Casting, Angling Biology, and Gear Tips
- **Beautiful UI**: Modern gradient design with smooth animations
- **Works in Miniprogram**: No cloud functions, no backend server
- **Real-Time Content**: Articles are fetched in real-time from RSS feeds

## Categories

1. **Fly Tying**: Patterns, techniques, and tutorials for tying flies
2. **Fly Casting**: Casting techniques, tips for distance and accuracy
3. **Angling Biology**: Understanding fish behavior and ecosystem dynamics
4. **Gear Tips**: Equipment reviews and recommendations

## Prerequisites

- WeChat Developer Tools installed
- WeChat Mini Program account (can use test AppID for development)
- **BigModel API Key**: Get free key from https://open.bigmodel.cn/

## Quick Setup (5 minutes)

### Step 1: Get BigModel API Key

1. Visit https://open.bigmodel.cn/
2. Register/Login to your account
3. Go to "API Keys" (API Key) section
4. Create a new API key (free)
5. Copy the key

### Step 2: Configure API Key

Edit `app.js` in the project root and add your API key:

```javascript
App({
  globalData: {
    bigModelApiKey: 'your_api_key_here'  // Paste your key here
  },

  onLaunch() {
  }
})
```

### Step 3: Open in WeChat Developer Tools

1. Launch WeChat Developer Tools
2. Click "Import Project" (导入项目)
3. Select this folder (`hookedlee`)
4. Choose AppID:
   - **Development**: "Test AppID" (测试号) - no registration
   - **Production**: Your registered AppID
5. Click "Import" (导入)

### Step 4: Test the App

1. Click "Generate New Card" (生成新卡片) button
2. Wait ~10-20 seconds for card generation
3. View your fly fishing card with:
   - Real article from the internet
   - AI-generated image
4. Try different category filters

### Step 5: Configure Domain Whitelist (Production Only)

For production deployment, you MUST whitelist these domains in WeChat Mini Program Console:

**Required Domains:**
- `api.rss2json.com` - For RSS feed fetching
- `open.bigmodel.cn` - For AI image generation

**Configuration Steps:**
1. Log in to WeChat Mini Program Admin Console (https://mp.weixin.qq.com/)
2. Go to "Development" (开发) → "Development Settings" (开发设置)
3. Go to "Server Domain Names" (服务器域名) section
4. Add these domains:
   ```
   https://api.rss2json.com
   https://open.bigmodel.cn
   ```
5. Save and upload new version

**Note**: During development, you can enable "Do not verify legal domain names" (不校验合法域名) in WeChat Developer Tools to skip whitelisting.

## How It Works

### Article Fetching

The app uses **rss2json.com** to fetch real articles from fly fishing websites:

1. RSS feeds from 8+ popular fly fishing sites
2. RSS2JSON converts XML to JSON (10K free requests/day)
3. App randomly selects an article from category
4. Extracts title, content, and metadata

### Image Generation

The app uses **BigModel CogView-3-Flash** (free model):

1. Generates image prompt based on article category and title
2. Sends prompt to BigModel image generation API
3. Receives high-quality fly fishing image URL
4. Displays image on card

### Data Flow

```
User clicks "Generate New Card"
    ↓
[Frontend] pages/index/index.js
    ├─→ Fetch random article via RSS (rss2json.com)
    │   ├─→ Try multiple RSS feeds
    │   ├─→ Extract article data
    │   └─→ Fallback if all feeds fail
    ├─→ Generate image prompt from category/title
    ├─→ Call BigModel API for image
    └─→ Combine into card format
    ↓
Update UI with card data
    ↓
[Display] pages/index/index.wxml
    ├─→ Show AI-generated image
    ├─→ Show article title and content
    ├─→ Show category tag
    ├─→ Show source attribution
    └─→ Show "Read Full Article" button
```

## Project Structure

```
hookedlee/
├── app.js                          # App configuration (API key storage)
├── app.json                        # Global configuration (no cloud)
├── app.wxss                        # Global styles
├── sitemap.json                    # Search configuration
├── project.config.json             # WeChat Developer Tools config
│
├── pages/index/                      # Main page
│   ├── index.js                   # Card generation logic
│   ├── index.json                 # Page configuration
│   ├── index.wxml                 # UI template
│   └── index.wxss                 # Page styles
│
├── utils/                           # Utility modules
│   ├── rssfetcher.js             # RSS feed fetching via rss2json
│   ├── bigmodel.js               # BigModel image generation API
│   └── util.js                   # Helper functions
│
└── Documentation
    ├── README.md                  # This file
    ├── SETUP.md                   # Setup guide
    └── API_KEY_SETUP.md         # API key configuration
```

## RSS Feed Sources

The app fetches articles from these confirmed RSS feeds:

1. **MidCurrent** - https://midcurrent.com/news/feed
   - Daily fly fishing news, reviews, tips, gear, and travel articles
   - Status: ✅ Confirmed

2. **Orvis Fly-Fishing Blog** - https://news.orvis.com/fly-fishing/feed
   - Latest fly-fishing news, helpful tips, and entertaining articles
   - Status: ✅ Confirmed

3. **Trout Unlimited (Trout Magazine)** - https://www.tu.org/magazine/feed
   - Daily discussion of trout fishing, conservation news, fishing tips, fly tying, and photo essays
   - Status: ✅ Verified

4. **Fly Fish Food** - http://www.flyfishfood.com/feeds/posts/default?alt=rss
   - Fly tying videos, tutorials, product reviews, and shop content
   - Status: ✅ Confirmed

5. **Gink & Gasoline** - https://www.ginkandgasoline.com/feed/
   - Fly fishing tips, techniques, fly tying, photography, and stories
   - Status: ✅ Verified

6. **Hatch Magazine** - https://www.hatchmag.com/blog/feed
   - Independent fly fishing journalism, gear reviews, conservation news, travel stories
   - Status: ✅ Verified

7. **Oregon Fly Fishing Blog** - https://oregonflyfishingblog.com/feed
   - Oregon fishing reports, conservation news, fly tying videos, local conditions
   - Status: ✅ Verified

8. **Duranglers Fly Shop Blog** - https://duranglers.com/feed
   - Southwest Colorado fly fishing articles, local conditions, tips and events
   - Status: ✅ Confirmed

## Image Generation

### BigModel API Details

- **Model**: CogView-3-Flash (FREE model)
- **Endpoint**: https://open.bigmodel.cn/api/paas/v4/images/generations
- **Cost**: Free (no charge for flash model)
- **Image Size**: 1024x1024 pixels
- **Generation Time**: 5-10 seconds
- **Image URL Validity**: 30 days

### Prompt Generation

The app generates contextual prompts based on category:

```javascript
// Example prompts generated:
"Fly fishing scene showing fly tying. The Woolly Bugger: Ultimate Guide. Professional photography, high quality, natural lighting."

"Fly fishing scene showing rod bending. Perfect Your Fly Casting: Advanced Techniques. Professional photography, high quality, natural lighting."

"Fly fishing scene showing trout behavior. Understanding Trout Behavior: Reading the Water. Professional photography, high quality, natural lighting."
```

## Configuration

### API Key Storage

Your BigModel API key is stored in `app.js`:

```javascript
App({
  globalData: {
    bigModelApiKey: 'your_api_key_here'
  }
})
```

**Security Note**: For production, you may want to implement a backend proxy to avoid exposing your API key in client code. See `DEPLOYMENT.md` for details.

### Domain Whitelisting

**Production Requirements:**

Must whitelist these domains in WeChat Mini Program Console:
```
https://api.rss2json.com
https://open.bigmodel.cn
```

**Development:**
Can bypass whitelisting by enabling "Do not verify legal domain names" in WeChat Developer Tools.

## Troubleshooting

### "API Key Required" Error

**Problem**: App shows modal asking for API key

**Solution**:
1. Edit `app.js`
2. Add your BigModel API key to `globalData.bigModelApiKey`
3. Save and restart app

### "Network Error" or "Request Failed"

**Problem**: External API calls failing

**Solutions**:
1. Check internet connection
2. Verify domains are whitelisted (production)
3. Check that API key is valid
4. Try searching card again

### "Failed to Fetch Article"

**Problem**: RSS feeds not loading

**Solutions**:
1. Check internet connection
2. Verify `api.rss2json.com` is accessible
3. Some RSS feeds may be temporarily down
4. App will try multiple feeds before failing

### "Image Generation Failed"

**Problem**: BigModel API not returning images

**Solutions**:
1. Verify API key is valid and has credits
2. Check that `open.bigmodel.cn` is whitelisted
3. Try again (API may be temporarily busy)
4. Check API status page: https://open.bigmodel.cn/

### Images Not Loading

**Problem**: Image shows broken or doesn't load

**Solutions**:
1. Check internet connection
2. Image URL is valid for 30 days
3. Some networks may block external images
4. Try different network or use VPN

## Customization

### Add More RSS Feeds

Edit `utils/rssfetcher.js`:

```javascript
const RSS_FEEDS = {
  'midcurrent': 'https://midcurrent.com/news/feed',
  'orvis': 'https://news.orvis.com/fly-fishing/feed',
  'your_new_source': 'https://yoursite.com/feed'  // Add here
}
```

### Change Image Prompts

Edit `utils/bigmodel.js`:

```javascript
function generateImagePrompt(category, title) {
  const categoryKeywords = {
    'fly tying': ['your', 'custom', 'keywords'],
    // ...
  }
  // ...
}
```

### Change UI Styling

Edit `pages/index/index.wxss`:
- Modify gradient colors
- Change card shadows and borders
- Adjust font sizes and spacing
- Add custom animations

## Deployment

### Development

1. Use test AppID (no registration needed)
2. Click "Preview" (预览) to test on your phone
3. Share QR code with others for testing

### Production

1. Register Mini Program with WeChat
2. Add your AppID in `project.config.json`
3. Whitelist required domains:
   - `api.rss2json.com`
   - `open.bigmodel.cn`
4. Test thoroughly
5. Submit for review in WeChat Admin Console
6. Release after approval

See `DEPLOYMENT.md` for detailed production deployment guide.

## Performance

### Article Fetching

- **Time**: 1-5 seconds (depends on RSS feed)
- **Retries**: Tries multiple feeds if first fails
- **Cache**: RSS2JSON caches for 1 hour

### Image Generation

- **Time**: 5-10 seconds (BigModel API)
- **Model**: CogView-3-Flash (free, fast)
- **Size**: 1024x1024 pixels
- **Cost**: Free

### Total Card Generation

- **Min Time**: ~7 seconds
- **Max Time**: ~15 seconds
- **Average**: ~10 seconds

## Known Limitations

1. **Article Sources**: Limited to websites with RSS feeds
2. **Image Model**: Uses free BigModel model (limited quality vs paid models)
3. **API Key**: Must be manually configured in app.js
4. **Domain Whitelisting**: Required for production deployment
5. **Offline**: Requires internet connection for article fetching and image generation

## Security Considerations

### API Key Exposure

**Current Implementation**: API key stored in `app.js` client-side

**Risks**:
- API key visible in compiled miniprogram code
- Anyone with decompiled app can extract the key

**Production Recommendations**:
1. Implement backend proxy server
2. Have miniprogram call your backend
3. Backend makes BigModel API calls
4. Backend can add rate limiting and authentication

See `DEPLOYMENT.md` for backend proxy implementation example.

### Domain Whitelisting

Always verify that external domains are properly whitelisted before production deployment. Unauthorized domain calls will fail with error code 4.

## Future Enhancements

Possible additions:
- Add more RSS feeds
- Implement article caching for faster loading
- Add backend proxy for API key security
- Add user authentication and favorites
- Implement card history
- Add dark mode theme
- Add push notifications for new articles
- Create different card layouts

## Support Resources

### Official Documentation

- **WeChat Mini Program Docs**: https://developers.weixin.qq.com/miniprogram/dev/framework/
- **BigModel API Docs**: https://docs.bigmodel.cn/api-reference/%E6%8A%A1%E5%9E%8B-api/%E5%9B%BE%E5%83%8F%E7%94%9F%E6%88%90
- **RSS2JSON Docs**: https://api.rss2json.com/

### External APIs Used

- **RSS2JSON**: Converts RSS feeds to JSON (10K free requests/day)
- **BigModel**: AI image generation (free model available)

## License

This project is open source and available for personal and educational use.

## Credits

- Article content from: MidCurrent, Orvis, Trout Unlimited, Fly Fish Food, Gink & Gasoline, Hatch Magazine, Oregon Fly Fishing Blog, Duranglers
- AI images generated with: BigModel CogView-3-Flash
- RSS conversion via: RSS2JSON
- Built with: WeChat Mini Program Framework

---

**Ready to use! Get your free BigModel API key and start searching fly fishing cards! 🎣**
