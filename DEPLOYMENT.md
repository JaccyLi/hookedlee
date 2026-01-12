# Deployment Guide

Deploy your Fly Fishing Cards Mini Program to WeChat.

## Pre-Deployment Checklist

- [ ] App tested in development environment
- [ ] All features working (card generation, filters, sharing)
- [ ] Content reviewed (articles and images)
- [ ] App name and description ready
- [ ] Icon and screenshots prepared

## Development vs Production

### Development

- Uses "Test AppID" (测试号)
- No registration needed
- Limited to 5 testers
- Can't submit for review

### Production

- Requires registered Mini Program
- Full distribution to public
- Can submit for WeChat review
- Unlimited users

## Step 1: Register Mini Program (Production Only)

Skip this if using test AppID.

### 1. Register Account

1. Visit [WeChat Mini Program Platform](https://mp.weixin.qq.com/)
2. Click "Register" (注册)
3. Choose "Mini Program" (小程序)
4. Complete registration:
   - Email or phone verification
   - Account type (Individual or Enterprise)
   - Basic information

### 2. Verify Identity

- **Individual**: ID card verification required
- **Enterprise**: Business license and organization certificate
- Verification takes 1-7 days

### 3. Note Your AppID

After registration, you'll receive an AppID:
- Format: `wx1234567890abcdef`
- Save this for step 3

## Step 2: Update Project Configuration

### 1. Update AppID

In `project.config.json`:

```json
{
  "appid": "your_actual_appid_here",
  ...
}
```

For development (test AppID), use:
```json
{
  "appid": "touristappid",
  ...
}
```

### 2. Update App Information

1. Open WeChat Developer Tools
2. Go to "Details" (详情)
3. Update:
   - **Mini Program Name**: "Fly Fishing Cards" (or your choice)
   - **Description**: "Discover fly fishing tips, techniques, and more"
   - **Category**: "Sports" (体育)

### 3. Upload Icons

Required icons for production:

| Size | Resolution | Purpose |
|------|------------|---------|
| Icon 1 | 144×144px | Mini program icon |
| Icon 2 | 256×256px | Mini program icon |

1. In WeChat Developer Tools → "Details"
2. Click "Upload" next to Icon
3. Upload both sizes
4. Click "Save"

### 4. Upload Screenshots

For production review, upload screenshots:

| Size | Purpose |
|------|---------|
| 670×350px | Landscape screenshot |
| 540×400px | Portrait screenshot |

1. Click "Upload" next to Screenshots
2. Upload both sizes
3. Click "Save"

## Step 3: Test Thoroughly

### Development Testing

1. Open in WeChat Developer Tools
2. Test all features:
   - Generate new cards (try all categories)
   - Test category filters
   - Check loading states
   - Test error handling
   - Test share to Moments
   - Test on different screen sizes

### Phone Testing

1. In WeChat Developer Tools, click "Preview" (预览)
2. Scan QR code with your phone
3. Test on real device:
   - iOS and Android (if possible)
   - Different network conditions
   - Screen rotations

### User Testing

1. Share preview QR code with testers
2. Get feedback on:
   - UX and flow
   - Content quality
   - Performance
   - Any bugs

## Step 4: Upload Code

### 1. Generate Code

1. In WeChat Developer Tools
2. Click "Upload" (上传) button (top right)
3. Fill in project notes:
   - Version: `1.0.0`
   - Notes: "Initial release - Fly Fishing Cards"
4. Click "Upload"
5. Wait for upload to complete

### 2. Verify Upload

1. Go to [WeChat Mini Program Admin Console](https://mp.weixin.qq.com/)
2. Login with your account
3. Go to "Version Management" (版本管理)
4. Verify your version appears

## Step 5: Submit for Review (Production Only)

### 1. Submit Version

1. In WeChat Mini Program Admin Console
2. Go to "Version Management"
3. Find your version (e.g., "1.0.0")
4. Click "Submit for Review" (提交审核)

### 2. Fill Review Information

**Basic Info:**
- Version Number: `1.0.0`
- Update Notes: Describe what's new
  ```
  Initial release with:
  - 32 fly fishing articles
  - 20 high-quality images
  - 4 category filters
  - Beautiful gradient UI
  ```

**Test Account (if needed):**
- Some categories require test account
- Provide login credentials if applicable
- Most apps don't need this

**Additional Information:**
- Any special permissions requested
- Privacy policy URL (if collecting user data)
- Service agreement (if applicable)

### 3. Submit for Review

Click "Submit" button and wait.

### 4. Review Process

- **Time**: 1-7 business days
- **Process**: WeChat team tests your Mini Program
- **Feedback**: You'll receive notification with results

**Possible Outcomes:**

- ✅ **Approved**: Proceed to step 6
- ⚠️ **Modifications Requested**: Fix issues and resubmit
- ❌ **Rejected**: More serious issues, may need significant changes

### 5. Handle Feedback

If modifications requested:

1. Read feedback carefully
2. Make required changes in WeChat Developer Tools
3. Upload new version (increment version number)
4. Resubmit for review

## Step 6: Release

### 1. Release Approved Version

1. In WeChat Mini Program Admin Console
2. Go to "Version Management"
3. Find your approved version
4. Click "Release" (发布)

### 2. Choose Release Type

- **Immediate Release**: Available to all users immediately
- **Scheduled Release**: Choose specific date/time

### 3. Confirm Release

Click "Confirm" and your Mini Program is live!

## Step 7: Post-Release

### Monitor Analytics

1. In WeChat Mini Program Admin Console
2. Go to "Statistics" (统计分析)
3. Monitor:
   - Daily Active Users (DAU)
   - Page Views
   - User retention
   - Share counts

### Collect Feedback

- Read user reviews in WeChat
- Check for bug reports
- Note feature requests

### Plan Updates

Based on feedback and usage:
- Add more articles and images
- Fix any discovered bugs
- Add new features
- Improve performance

## Domain Configuration

### No Server Domains Needed

Since this Mini Program has no external API calls:
- No request domain configuration needed
- No upload domain needed
- No download domain needed

### Images Only

- Images load from Unsplash CDN
- No configuration needed
- Works automatically

## Privacy and Legal

### Privacy Policy

If you add features that collect user data:
- Add privacy policy page
- Link in Mini Program
- Host on your website

### Service Agreement

If offering paid features:
- Create service agreement
- Link in Mini Program
- Host on your website

### Terms of Use

Ensure compliance with:
- WeChat Mini Program Terms of Service
- Unsplash License (for images)
- Content copyright laws

## Common Review Issues

### Content Issues

**Problem**: Articles or images inappropriate
**Solution**: Review and remove flagged content

**Problem**: Copyrighted content
**Solution**: Use only content with proper attribution

### Technical Issues

**Problem**: Crashes or errors
**Solution**: Test thoroughly on different devices

**Problem**: Performance problems
**Solution**: Optimize images and code

### Functionality Issues

**Problem**: Features not working
**Solution**: Test all features before submission

**Problem**: Poor UX
**Solution**: Improve navigation and feedback

## Update Checklist

When releasing updates:

1. Increment version number (e.g., 1.0.0 → 1.0.1)
2. Add meaningful changelog
3. Test all changes
4. Test backward compatibility
5. Upload new version
6. Submit for review
7. Release after approval

## Version Numbering

Format: `MAJOR.MINOR.PATCH`

- `MAJOR`: Major changes, breaking changes
- `MINOR`: New features, backward compatible
- `PATCH`: Bug fixes, small improvements

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (major update)

## Rollback

If critical issues discovered after release:

1. Quickly fix issues
2. Upload new version with higher version number
3. Submit for expedited review
4. Request urgent release

## Support During Deployment

### WeChat Resources

- [Mini Program Documentation](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [WeChat Help Center](https://kf.qq.com/product/wx_xcx.html)

### Common Issues

**Upload fails**:
- Check network connection
- Ensure file sizes within limits
- Try again later

**Review rejected**:
- Read feedback carefully
- Make required changes
- Resubmit

**Release fails**:
- Check version number format
- Ensure version is approved
- Try again

## Summary Checklist

### For Development

- [ ] Test AppID configured
- [ ] All features tested
- [ ] Preview on phone works
- [ ] No console errors

### For Production

- [ ] Mini Program registered
- [ ] AppID updated in config
- [ ] Icons uploaded
- [ ] Screenshots uploaded
- [ ] Code tested thoroughly
- [ ] Version uploaded
- [ ] Submitted for review
- [ ] Review approved
- [ ] Released to public

---

**Good luck with your deployment! 🚀**

Remember: This is a simple, client-side Mini Program with no server components, making deployment straightforward!
