# WeChat Authentication Setup Guide

## Overview

Your backend now uses **WeChat authentication** to secure the API. This prevents unauthorized access and abuse of your AI API quotas.

## Security Architecture

```
┌─────────────────┐
│ WeChat User     │
│ (Your App User) │
└────────┬────────┘
         │ wx.login() → code
         ▼
┌─────────────────┐
│ WeChat Server   │
│ (Validates User)│
└────────┬────────┘
         │ openid
         ▼
┌─────────────────┐
│ Your Backend    │
│ - Generates JWT │
│ - Rate Limits   │
│ - Logs Usage    │
└────────┬────────┘
         │ Protected API
         ▼
┌─────────────────┐
│ AI APIs         │
│ (BigModel,      │
│  DeepSeek)      │
└─────────────────┘
```

## What Changed

### Backend (Server)
1. **Added authentication middleware** (`backend/middleware/auth.js`)
   - Validates JWT tokens
   - Checks user-specific rate limits (20 requests/minute per user)
   - Integrates with WeChat's code2session API

2. **Added login endpoint** (`POST /api/auth/login`)
   - Accepts WeChat login code
   - Returns JWT token
   - Creates user session

3. **Protected proxy endpoints** (now require authentication):
   - `/api/proxy/glm` - GLM chat completions
   - `/api/proxy/deepseek` - DeepSeek chat completions
   - `/api/proxy/image` - Image generation
   - `/api/proxy/chat` - Unified chat endpoint

4. **Public endpoints** (no authentication required):
   - `/api/health` - Health check
   - `/api/models` - Available models list
   - `/api/auth/login` - Login endpoint

### Miniprogram (Client)
1. **Auto-login on first request** - `backend-client.js` handles authentication automatically
2. **Token storage** - JWT tokens stored in `wx.storage`
3. **Automatic token refresh** - If token expires, user is re-authenticated
4. **Authorization headers** - All backend requests include `Bearer {token}` header

---

## Setup Instructions

### Step 1: Get WeChat App Credentials

1. Log in to [WeChat Mini Program Platform](https://mp.weixin.qq.com/)
2. Go to: **Development → Development Settings**
3. Copy:
   - **AppID**: `wx959be5518e08de0f` (already set in .env)
   - **AppSecret**: Click "Generate" or "Reset" to get your secret

### Step 2: Update Backend .env File

Edit `/mnt/d/data/experiments/hookedli/backend/.env`:

```bash
# WeChat Mini Program Credentials
WECHAT_APP_ID=wx959be5518e08de0f
WECHAT_APP_SECRET=your_wechat_appsecret_here  # ← PASTE HERE

# JWT Secret for token generation
# IMPORTANT: Generate a strong random string!
JWT_SECRET=change-this-to-a-strong-random-string-in-production  # ← GENERATE WITH BELOW COMMAND
```

**Generate JWT Secret** (run in terminal):
```bash
openssl rand -base64 32
```

Copy the output and paste it as `JWT_SECRET`.

### Step 3: Restart Backend Server

```bash
cd /mnt/d/data/experiments/hookedli/backend
npm start
```

The server will now:
- Verify WeChat codes before issuing tokens
- Require valid tokens for all API requests
- Rate limit each user to 20 requests/minute

---

## Testing

### 1. Test Health Endpoint (Public)
```bash
curl https://suosuoli.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T...",
  "models": {
    "bigmodel": true,
    "deepseek": false
  }
}
```

### 2. Test Protected Endpoint (Should Fail Without Token)
```bash
curl -X POST https://suosuoli.com/api/proxy/glm \
  -H "Content-Type: application/json" \
  -d '{"model": "glm-4.7", "messages": [{"role": "user", "content": "test"}]}'
```

Expected response:
```json
{
  "error": "Authentication required",
  "message": "Please login first"
}
```

### 3. Test Login Endpoint
```bash
curl -X POST https://suosuoli.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code"}'
```

Expected response (if code is invalid):
```json
{
  "error": "Authentication failed",
  "message": "Invalid WeChat login code"
}
```

### 4. Test in WeChat DevTools
1. Open your miniprogram in WeChat DevTools
2. Generate an article
3. The app will automatically:
   - Call `wx.login()` to get a code
   - Send code to `/api/auth/login`
   - Receive and store JWT token
   - Use token for all subsequent requests

---

## How It Works

### Login Flow

1. **User opens miniprogram**
   ```javascript
   wx.login({
     success: (res) => {
       const code = res.code  // Temporary login code
     }
   })
   ```

2. **Miniprogram sends code to backend**
   ```
   POST /api/auth/login
   { "code": "0x1a2b3c..." }
   ```

3. **Backend verifies code with WeChat**
   ```
   GET https://api.weixin.qq.com/sns/jscode2session
   ?appid=wx959be5518e08de0f
   &secret=YOUR_APP_SECRET
   &js_code=0x1a2b3c...
   &grant_type=authorization_code
   ```

4. **WeChat returns openid**
   ```json
   {
     "openid": "o6zAJsx3ekDyen-qAlp3Bi9FEbqE",
     "session_key": "..."
   }
   ```

5. **Backend generates JWT token**
   ```javascript
   const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: '30d' })
   ```

6. **Token returned to miniprogram**
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIs...",
     "openid": "o6zAJsx3ekDyen-qAlp3Bi9FEbqE"
   }
   ```

7. **Miniprogram stores token**
   ```javascript
   wx.setStorageSync('authToken', token)
   ```

### API Request Flow

1. **Miniprogram makes API request**
   ```javascript
   wx.request({
     url: 'https://suosuoli.com/api/proxy/glm',
     header: {
       'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'
     },
     data: { model: 'glm-4.7', messages: [...] }
   })
   ```

2. **Backend validates token**
   ```javascript
   const decoded = jwt.verify(token, JWT_SECRET)
   // decoded = { openid: 'o6zAJsx3ekDyen-qAlp3Bi9FEbqE', iat: ..., exp: ... }
   ```

3. **Backend checks rate limit for this user**
   ```javascript
   const limit = checkUserRateLimit(decoded.openid, 20, 60000)
   // Allows 20 requests per minute per user
   ```

4. **Request forwarded to AI API**
   ```
   Backend → BigModel API → Response
   ```

---

## Security Features

### ✅ User Authentication
- Only valid WeChat users can access the backend
- Each user gets a unique `openid` from WeChat
- JWT tokens expire after 30 days

### ✅ Rate Limiting
- **Per-user limits**: 20 requests/minute
- **Per-user tracking**: Based on WeChat openid
- **Automatic cleanup**: Old rate limit data cleared hourly

### ✅ Token Security
- Tokens stored securely in WeChat storage
- Automatic token refresh on expiration
- Invalid tokens rejected with 401 error

### ✅ Audit Trail
- Backend logs all login events: `[Auth] User logged in: {openid}`
- User-specific request tracking in memory
- Easy to add database logging later

---

## Troubleshooting

### Error: "Missing code"
**Cause**: Miniprogram didn't call `wx.login()` first
**Solution**: The backend-client.js handles this automatically

### Error: "Invalid WeChat login code"
**Cause**: Wrong AppSecret or code expired
**Solution**:
- Verify `WECHAT_APP_SECRET` in .env
- WeChat codes expire in 5 minutes
- Make sure backend can reach WeChat API

### Error: "Authentication expired"
**Cause**: JWT token expired (30 days)
**Solution**: Token auto-refreshes, user doesn't need to do anything

### Error: "Rate limit exceeded"
**Cause**: User made >20 requests in 1 minute
**Solution**: Wait and retry (backend returns `retryAfter` seconds)

---

## Migration Notes

### Before (Insecure)
- Backend was **publicly accessible**
- Anyone could call `https://suosuoli.com/api/proxy/glm`
- API quotas could be drained by attackers

### After (Secure)
- Backend is **protected by WeChat auth**
- Only users of your miniprogram can access it
- Each user rate-limited independently
- Audit trail for all requests

---

## What's Next?

### Optional Enhancements

1. **Persistent User Database**
   - Store user usage in MongoDB/PostgreSQL
   - Track daily/monthly usage per user
   - Implement premium tier with higher limits

2. **Admin Dashboard**
   - View active users
   - Monitor API usage
   - Block abusive users

3. **Cost Monitoring**
   - Track token usage per user
   - Calculate costs
   - Set budget alerts

4. **Redis for Rate Limiting**
   - Replace in-memory Map with Redis
   - Distributed rate limiting across multiple servers
   - Automatic persistence

---

## Summary

✅ **Security**: Your backend is now secured with WeChat authentication
✅ **Rate Limiting**: 20 requests/minute per user
✅ **Auto-login**: Miniprogram handles authentication automatically
✅ **Audit Trail**: All requests logged with user openid

**Action Items**:
1. Get `WECHAT_APP_SECRET` from WeChat MP Platform
2. Generate strong `JWT_SECRET` with `openssl rand -base64 32`
3. Update `/backend/.env` with both values
4. Restart backend server
5. Test in WeChat DevTools

Your backend is now production-ready! 🎉
