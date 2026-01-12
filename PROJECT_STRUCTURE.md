# Project Structure

```
hookedlee/
│
├── app.js                          # Mini program entry point
├── app.json                        # Global configuration (pages, window, etc.)
├── app.wxss                        # Global styles
├── sitemap.json                    # WeChat search configuration
├── project.config.json             # WeChat Developer Tools configuration
│
├── pages/                          # Mini program pages
│   └── index/                      # Main (and only) page
│       ├── index.js                # Page logic:
│       │                           #   - Card generation
│       │                           #   - Category selection
│       │                           #   - Loading/error states
│       ├── index.json              # Page configuration
│       ├── index.wxml              # Page template (UI structure)
│       │                           #   - Card display
│       │                           #   - Category filters
│       │                           #   - Generate button
│       └── index.wxss              # Page styles (card design, animations)
│
├── data/                           # Local data (no cloud functions!)
│   ├── articles.js                 # Fly fishing articles database
│   │   # 32 expert articles from:
│   │   #   - Orvis Fly Fishing
│   │   #   - Fly Fish Food
│   │   #   - Trout Unlimited
│   │   #   - MidCurrent
│   │
│   └── images.js                  # Fly fishing images database
│       # 20 high-quality images from Unsplash
│       #   - Categorized by content type
│       #   - Optimized for display
│
├── utils/                          # Utility functions
│   └── util.js                     # Helper functions
│
├── .gitignore                      # Git ignore rules
├── .env.example                    # Environment variables template (not used)
├── README.md                       # Full documentation
├── QUICKSTART.md                   # Quick start guide
├── PROJECT_STRUCTURE.md            # This file
└── DEPLOYMENT.md                  # Deployment guide
```

## Data Flow

```
User clicks "Generate New Card"
    ↓
[Frontend] pages/index/index.js
    ├─→ Select category (default: 'all')
    ├─→ Get random article from data/articles.js
    ├─→ Get random image from data/images.js
    └─→ Combine into card object
    ↓
Update UI with card data
    ↓
[Display] pages/index/index.wxml
    ├─→ Show image
    ├─→ Show title
    ├─→ Show summary
    └─→ Show category & source
```

## Key Components

### Frontend (Mini Program)

**pages/index/**
- **index.wxml**:
  - Card container
  - Image component (lazy-loaded)
  - Category tag
  - Title and summary text
  - Category filter buttons
  - Generate button
  - Loading spinner
  - Error message container

- **index.wxss**:
  - Gradient background
  - Card styling (shadows, radius)
  - Button styling
  - Loading animation
  - Responsive layout

- **index.js**:
  - Card generation logic
  - Category selection handler
  - State management
  - Share functionality

### Data Layer (Local Files)

**data/articles.js**
- Contains 32 fly fishing articles
- Organized by 4 categories
- Functions:
  - `getRandomArticle(category)` - Get random article
  - `getAllArticlesCount()` - Total articles
  - `categoryDisplayNames` - Display name mapping

**data/images.js**
- Contains 20 fly fishing images
- From Unsplash (free to use)
- Organized by category
- Functions:
  - `getRandomImage(category)` - Get random image
  - `getAllImages()` - All images
  - `getImagesCount()` - Total images

### Utilities

**utils/util.js**
- Helper functions
- Date formatting
- Can be expanded as needed

## Content Database

### Article Categories

| Category | Article Count | Topics |
|----------|---------------|---------|
| Fly Tying | 8 | Woolly Bugger, Pheasant Tail, Elk Hair Caddis, etc. |
| Fly Casting | 8 | Double haul, Roll cast, Mending, etc. |
| Angling Biology | 8 | Trout behavior, Aquatic insects, Rise forms, etc. |
| Gear Tips | 8 | Rods, reels, lines, waders, tools, etc. |
| **Total** | **32** | Complete fly fishing knowledge base |

### Image Categories

| Category | Image Count | Type |
|----------|--------------|------|
| General | 8 | Various fly fishing scenes |
| Fly Tying | 3 | Fly tying tools and flies |
| Fly Casting | 3 | Casting action |
| Biology | 2 | Fish and habitat |
| Gear | 4 | Equipment and tools |
| **Total** | **20** | Professional photography |

## Card Generation Algorithm

```javascript
function generateCard(category) {
  // Step 1: Determine article category
  if (category === 'all') {
    articleCategory = random(['fly tying', 'fly casting', 'biology', 'gear'])
  } else {
    articleCategory = category
  }

  // Step 2: Get random article from category
  article = getRandomArticle(articleCategory)

  // Step 3: Get random image (category-aware)
  image = getRandomImage(category)

  // Step 4: Combine into card
  card = {
    title: article.title,
    summary: article.summary,
    category: article.category,
    source: article.source,
    imageUrl: image.url,
    timestamp: now()
  }

  return card
}
```

## Category Mapping

| User Filter | Article Source | Image Source |
|-------------|----------------|--------------|
| All | Random from all 4 categories | All images |
| Fly Tying | Fly tying articles | Fly tying + general images |
| Casting | Fly casting articles | Casting + general images |
| Biology | Biology articles | Biology + general images |
| Gear | Gear articles | Gear + general images |

## State Management

### Page Data

```javascript
{
  cardData: null,        // Current card object
  loading: false,        // Loading state
  error: null,           // Error message
  selectedCategory: 'all' // Selected filter
}
```

### Card Data Structure

```javascript
{
  title: "String",          // Article title
  summary: "String",       // Article summary (2-3 sentences)
  category: "String",      // Display category name
  source: "String",        // Content source (e.g., "Orvis")
  imageUrl: "String",      // Image URL (from Unsplash)
  timestamp: "String"      // ISO timestamp
}
```

## Performance Characteristics

### Data Loading

- **Articles**: Loaded once on app start (~5KB)
- **Images**: Not pre-loaded, loaded on demand
- **Total Initial Load**: ~150KB (miniprogram code + data)

### Generation Speed

- **Card Generation**: ~0.5 seconds (local only)
- **Image Loading**: 0.5-3 seconds (depends on network)
- **Total to Display**: ~1-3.5 seconds

### Optimization

- Lazy loading for images
- No external API calls
- Local data only
- Minimal network requests

## File Sizes

| File | Size | Notes |
|------|------|-------|
| app.js | ~50 bytes | Minimal initialization |
| app.json | ~300 bytes | Configuration |
| app.wxss | ~400 bytes | Global styles |
| pages/index/index.js | ~1KB | Main logic |
| pages/index/index.wxml | ~3KB | UI template |
| pages/index/index.wxss | ~3KB | Page styles |
| data/articles.js | ~8KB | 32 articles |
| data/images.js | ~4KB | 20 image URLs |
| **Total Code** | **~20KB** | Very lightweight |

## External Dependencies

### None! ✅

- No cloud functions
- No external APIs
- No npm packages
- No build steps

Everything is native WeChat Mini Program code.

### External Resources

- **Images**: Served from Unsplash CDN
  - URLs stored in `data/images.js`
  - Loaded on demand via `<image>` component
  - Cached by WeChat automatically

## Customization Points

### Easy Changes

1. **Add Articles**: Edit `data/articles.js`
2. **Add Images**: Edit `data/images.js`
3. **Change Colors**: Edit `pages/index/index.wxss`
4. **Add Categories**: Edit data files + `index.wxml`
5. **Change Layout**: Edit `pages/index/index.wxml`

### Advanced Changes

1. **Add History**: Store cards in `app.globalData` or `wx.storage`
2. **Add Favorites**: Use `wx.setStorageSync()`
3. **Add Search**: Implement filter on data arrays
4. **Add Animations**: Use `wx.createAnimation()`
5. **Add Pages**: Add to `app.json` pages array

## Key Advantages

### Simplicity

- No backend needed
- No API keys to configure
- No cloud development setup
- No build process
- Just open and run!

### Performance

- Instant card generation
- Minimal network requests
- Small app size
- Fast load times

### Reliability

- No API failures
- No rate limits
- Works offline (except images)
- Predictable behavior

### Maintainability

- Clear file structure
- Well-documented code
- Easy to extend
- Easy to customize

## Data Source Attribution

### Article Content

Based on expert content from:
- **Orvis Fly Fishing** - General techniques and tips
- **Fly Fish Food** - Fly tying tutorials
- **Trout Unlimited** - Biology and conservation
- **MidCurrent** - Casting techniques

### Images

Sourced from Unsplash photographers:
- Professional fly fishing photography
- Free to use (Unsplash License)
- High resolution and quality
- Optimized for web

---

## Architecture Summary

**Frontend**: WeChat Mini Program (WXML, WXSS, JS)
**Backend**: None (local data only)
**Database**: None (local JavaScript arrays)
**API**: None (no external calls)
**Storage**: None (can add wx.storage for features)

This is a **100% client-side** WeChat Mini Program with no server components!
