# Clear Cache & Recompile Instructions

## Issue Fixed

The problem wasn't just cache - the actual source files had old code:
- `pages/index/index.js` was requiring `rssfetcher.js`
- `utils/bigmodel.js` had image generation instead of article generation

**These files have now been corrected.**

## Immediate Steps

1. **In WeChat Developer Tools:**
   - Click "Compile" → "Clear Cache" → "Clear all"
   - Click "Confirm"

2. **Force Rebuild:**
   - Click "Compile" button (not just "Save")
   - Wait for compilation to complete
   - Check console for "Compile completed" message

3. **Restart Simulator:**
   - Close simulator window
   - Reopen simulator
   - Click "Refresh" button in simulator toolbar

4. **Clear Browser Cache (if using preview):**
   - Open browser DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"

## Verify Fix

After recompiling, you should see in console:
```
✓ No "rssfetcher.js" errors
✓ No "cloud.callFunction" errors
✓ Direct HTTP requests to BigModel API
```

## If Still Failing

1. **Check File Contents:**
   ```bash
   # Verify index.js imports
   head -3 /path/to/hookedlee/pages/index/index.js
   # Should show: const { getRandomImage } = require('../../data/images.js')
   #               const { generateArticle, validateApiKey } = require('../../utils/bigmodel.js')
   ```

2. **Delete Compiled Files:**
   - Close WeChat Developer Tools
   - Delete project's `.temp` folder
   - Delete project's `.miniprogram_cache` folder
   - Reopen project

3. **Fresh Project:**
   - Export current project
   - Create new project in WeChat Developer Tools
   - Import all files from old project

## API Key Setup

Don't forget to set your API key in `app.js`:

```javascript
App({
  globalData: {
    bigModelApiKey: 'your-actual-api-key-from-bigmodel.cn'
  },
  onLaunch() {}
})
```

Get your key from: https://bigmodel.cn/usercenter/proj-mgmt/apikeys

## What Changed

**Before (Old Code):**
- ❌ Required `rssfetcher.js` (doesn't exist)
- ❌ Used image generation API
- ❌ Had cloud function references

**After (New Code):**
- ✅ Requires `bigmodel.js` (article generation)
- ✅ Uses chat completions API for articles
- ✅ Direct HTTP requests via `wx.request()`
- ✅ Uses existing images from `images.js`

## Expected Behavior After Fix

1. Click "Generate New Card"
2. Wait 2-5 seconds for API call
3. See AI-generated article with markdown formatting
4. See fly fishing image from existing collection
5. No cloud function errors
