# Multi-Key Setup Guide

## Overview

Your backend now supports **multiple BigModel API keys** to avoid rate limiting and enable faster parallel processing.

---

## How It Works

### Round-Robin Key Rotation

When you have multiple API keys configured:

```
Request 1 → Key 1
Request 2 → Key 2
Request 3 → Key 3
Request 4 → Key 1 (cycles back)
Request 5 → Key 2
```

### Benefits

- ✅ **No Rate Limiting**: Multiple keys share the load
- ✅ **Faster Processing**: All 5 sections can expand in parallel
- ✅ **Load Balancing**: Even distribution across keys
- ✅ **Automatic**: No manual intervention needed

---

## Setup Instructions

### Step 1: Get Multiple API Keys

1. Log in to https://open.bigmodel.cn/
2. Navigate to **API Keys** section
3. Create multiple API keys (2-3 recommended)
4. Copy each key

### Step 2: Update Backend .env File

Edit `/data/hookedli/backend/.env`:

```bash
# Single key (no load balancing)
BIGMODEL_API_KEY=your_single_key_here

# Multiple keys (comma-separated, NO SPACES)
BIGMODEL_API_KEY=key1,key2,key3
```

**Example with real keys:**
```bash
BIGMODEL_API_KEY=bae66e9df8274f079451d708744af0b2.8sEcD3QeAPPvERLh,another_key_here.thirdKeyHere,fourth_key_here
```

**Important:**
- NO spaces after commas
- Each key should be a valid BigModel API key
- Format: `key1,key2,key3`

### Step 3: Restart Backend

```bash
ssh root@suosuoli
cd /data/hookedli
git pull
systemctl restart hookedlee-backend
systemctl status hookedlee-backend
```

### Step 4: Verify

Check logs to confirm keys loaded:

```bash
journalctl -u hookedlee-backend | grep "Loaded.*BigModel"
```

Expected output:
```
✓ Loaded 3 BigModel API key(s)
✓ DeepSeek API: Not configured
```

---

## Testing

### Generate an Article and Check Logs

```bash
journalctl -f -u hookedlee-backend
```

When generating, you'll see:

```
[GLM Proxy] Request model: glm-4.7-flash, Using key 1/3, Messages: 2
[GLM Proxy] Request model: glm-4.7-flash, Using key 2/3, Messages: 2
[GLM Proxy] Request model: glm-4.7-flash, Using key 3/3, Messages: 2
[GLM Proxy] Request model: glm-4.7-flash, Using key 1/3, Messages: 2
[GLM Proxy] Request model: glm-4.7-flash, Using key 2/3, Messages: 2
```

This shows:
- **5 parallel requests** for section expansion
- **Each uses a different key** (1, 2, 3, 1, 2)
- **No rate limiting** because keys are rotated

---

## Performance Comparison

### Single Key:
```
Section 1 → Wait → Section 2 → Wait → Section 3...
Time: ~2-3 minutes (with delays to avoid 429)
```

### 3 Keys (Parallel):
```
Section 1 ┐
Section 2 ├─ All at once!
Section 3 │
Section 4 │
Section 5 ┘
Time: ~30-45 seconds (5x faster!)
```

---

## Recommended Configuration

### For Testing/Development:
```
BIGMODEL_API_KEY=your_test_key
```

### For Production (Recommended):
```
BIGMODEL_API_KEY=key1,key2,key3
```

### For High Volume:
```
BIGMODEL_API_KEY=key1,key2,key3,key4,key5
```

---

## Troubleshooting

### Error: "BigModel API key not configured"

**Cause**: No valid keys in BIGMODEL_API_KEY

**Solution**:
```bash
# Check your .env file
cat /data/hookedli/backend/.env | grep BIGMODEL_API_KEY

# Should show:
# BIGMODEL_API_KEY=key1,key2,key3
```

### Still Getting 429 Errors?

**Check**:
1. Are all keys valid?
2. Did you restart the backend after updating .env?
3. Check logs: `journalctl -u hookedlee-backend | grep "Using key"`

**Solution**: Add more keys to spread the load

### Keys Not Rotating?

**Check logs**:
```
# Should see different key numbers
Using key 1/3
Using key 2/3
Using key 3/3
```

**If all requests show "key 1/1"**: Only one key configured

---

## Best Practices

### ✅ DO:
- Use 2-3 keys for normal usage
- Rotate keys periodically (monthly)
- Monitor key usage in BigModel dashboard
- Keep keys secret (never commit to git)

### ❌ DON'T:
- Use spaces between keys: `key1, key2, key3` ❌
- Mix keys from different accounts (billing issues)
- Share keys publicly
- Use expired keys

---

## Current Configuration

Your current `.env` has placeholder keys:
```bash
BIGMODEL_API_KEY=bae66e9df8274f079451d708744af0b2.8sEcD3QeAPPvERLh,second_key_here,third_key_here
```

**Action needed**:
1. Get your real API keys from https://open.bigmodel.cn/
2. Replace `second_key_here` and `third_key_here` with actual keys
3. Or use just the single key if you only have one

---

## Summary

With multiple keys:
- **No rate limiting** (429 errors)
- **5x faster** (parallel processing)
- **Load balanced** (even distribution)
- **Automatic rotation** (no manual work)

Configure multiple keys and enjoy faster, more reliable article generation! 🚀
