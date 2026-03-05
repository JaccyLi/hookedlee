# HookedLee Backend Server

Secure backend server for the HookedLee WeChat Mini Program. Proxies AI API requests and securely manages API keys.

## 🎯 Features

- ✅ **Secure API Key Storage** - Keys stored in environment variables, never exposed to client
- ✅ **AI Request Proxying** - Handles all AI API requests server-side
- ✅ **Multi-Model Support** - Supports GLM-4.7, DeepSeek-Chat, and DeepSeek-Reasoner
- ✅ **Rate Limiting** - Built-in protection against API abuse
- ✅ **CORS Enabled** - Configured for WeChat Mini Program compatibility
- ✅ **Health Monitoring** - Health check endpoint for status monitoring
- ✅ **Image Generation** - Proxy for BigModel's CogView-3-Flash
- ✅ **OpenClaw Chat** - Password-protected AI chat via OpenClaw gateway

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- BigModel API key (get from https://open.bigmodel.cn/)
- DeepSeek API key (get from https://platform.deepseek.com/)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

Add your API keys to `.env`:

```env
BIGMODEL_API_KEY=your_actual_bigmodel_key
DEEPSEEK_API_KEY=your_actual_deepseek_key
```

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on port 3000 (default).

### 4. Test the Server

```bash
# Health check
curl http://localhost:3000/api/health

# List available models
curl http://localhost:3000/api/models
```

## 📡 API Endpoints

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "models": {
    "bigmodel": true,
    "deepseek": true
  }
}
```

### GET `/api/models`
List available AI models.

**Response:**
```json
{
  "models": [
    {
      "id": "glm-4.7",
      "name": "GLM-4.7",
      "provider": "bigmodel",
      "available": true
    },
    {
      "id": "deepseek-chat",
      "name": "DeepSeek-Chat",
      "provider": "deepseek",
      "available": true
    },
    {
      "id": "deepseek-reasoner",
      "name": "DeepSeek-Reasoner",
      "provider": "deepseek",
      "available": true
    }
  ]
}
```

### POST `/api/proxy/chat`
Unified chat completion endpoint (automatically routes to appropriate model).

**Request Body:**
```json
{
  "model": "glm-4.7",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.8,
  "top_p": 0.95,
  "max_tokens": 8192,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "glm-4.7",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 9,
    "total_tokens": 29
  }
}
```

### POST `/api/proxy/glm`
Direct proxy to BigModel GLM-4.7 API.

### POST `/api/proxy/deepseek`
Direct proxy to DeepSeek API.

### POST `/api/proxy/image`
Image generation via BigModel CogView-3-Flash.

**Request Body:**
```json
{
  "prompt": "A professional fly fishing scene",
  "size": "1024x1024"
}
```

**Response:**
```json
{
  "created": 1234567890,
  "data": [{
    "url": "https://generated-image-url.jpg"
  }]
}
```

### POST `/api/chat/verify-password`
Verify chat password for OpenClaw access.

**Request Body:**
```json
{
  "password": "your_chat_password"
}
```

**Response:**
```json
{
  "valid": true
}
```

### POST `/api/chat/openclaw`
Send message to OpenClaw AI assistant.

**Request Body:**
```json
{
  "message": "Hello, how can you help me?",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "content": "Hello! I'm here to help you with...",
  "id": "chat-xxx",
  "model": "openclaw"
}
```

### POST `/api/chat/openclaw/stream`
Streaming chat endpoint (Server-Sent Events).

**Request Body:**
```json
{
  "message": "Tell me a story",
  "history": []
}
```

**Response:** SSE stream with `data:` prefixed JSON chunks.

## 🔒 Security Features

1. **API Key Protection** - Keys never leave the server
2. **Rate Limiting** - 100 requests per 15 minutes per IP
3. **Helmet.js** - Security headers
4. **CORS** - Configured for WeChat Mini Program
5. **Input Validation** - Request size limits
6. **Compression** - Reduced bandwidth usage

## 🏗️ Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `BIGMODEL_API_KEY`
   - `DEEPSEEK_API_KEY`

### Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard.

### Deploy to AWS EC2

1. Launch an EC2 instance (Ubuntu recommended)
2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone and setup:
```bash
git clone <your-repo>
cd hookedlee/backend
npm install
cp .env.example .env
# Edit .env with your keys
```

4. Start with PM2:
```bash
npm install -g pm2
pm2 start server.js --name hookedlee-backend
pm2 save
pm2 startup
```

5. Configure nginx reverse proxy (optional but recommended)

### Deploy to Heroku

1. Create `Procfile`:
```
web: node server.js
```

2. Deploy:
```bash
heroku create hookedlee-backend
heroku config:set BIGMODEL_API_KEY=your_key
heroku config:set DEEPSEEK_API_KEY=your_key
git push heroku main
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BIGMODEL_API_KEY` | No* | BigModel API key for GLM-4.7 (comma-separated for multiple keys) |
| `DEEPSEEK_API_KEY` | No* | DeepSeek API key |
| `DASHSCOPE_API_KEY` | No | DashScope API key for Qwen image models |
| `CHAT_PASSWORD` | No | Password for OpenClaw chat access (default: hookedlee2024) |
| `OPENCLAW_GATEWAY_URL` | No | OpenClaw gateway URL (default: http://127.0.0.1:18789) |
| `OPENCLAW_GATEWAY_TOKEN` | No | OpenClaw gateway authentication token |
| `OPENCLAW_AGENT_ID` | No | OpenClaw agent ID (default: main) |
| `HTTP_PORT` | No | HTTP server port (default: 3000) |
| `HTTPS_PORT` | No | HTTPS server port (default: 3443) |
| `NODE_ENV` | No | Environment (development/production) |

*At least one API key is required.

### Rate Limiting

Default: 100 requests per 15 minutes per IP.

To modify, edit the `limiter` configuration in `server.js`:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window
  max: 100, // Max requests per window
  message: { error: 'Too many requests' }
})
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test models endpoint
curl http://localhost:3000/api/models

# Test chat proxy
curl -X POST http://localhost:3000/api/proxy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.7",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Test chat password verification
curl -X POST http://localhost:3000/api/chat/verify-password \
  -H "Content-Type: application/json" \
  -d '{"password": "hookedlee2024"}'

# Test OpenClaw chat (requires OpenClaw running)
curl -X POST http://localhost:3000/api/chat/openclaw \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, OpenClaw!"}'
```

## 📊 Monitoring

### Health Check

Monitor server health:

```bash
watch -n 5 'curl -s http://localhost:3000/api/health | jq'
```

### Logs

View logs in production:

```bash
# PM2
pm2 logs hookedlee-backend

# Docker
docker logs -f hookedlee-backend

# Systemd
journalctl -u hookedlee-backend -f
```

## 🐛 Troubleshooting

### Server won't start

1. Check if port is in use:
```bash
lsof -i :3000
```

2. Kill process using the port:
```bash
kill -9 <PID>
```

### API requests failing

1. Verify API keys are set in `.env`
2. Check API key format (no extra spaces)
3. Verify API key has valid credits/quota
4. Check server logs for error details

### Connection refused from WeChat Mini Program

1. Verify backend URL is correct
2. Check if backend is running
3. Ensure CORS is enabled (default: enabled)
4. Verify firewall settings allow connections

## 📝 Maintenance

### Update dependencies

```bash
npm update
npm audit fix
```

### Restart server

```bash
# PM2
pm2 restart hookedlee-backend

# Docker
docker restart hookedlee-backend

# Direct
kill -HUP <PID>
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT

## 🆘 Support

For issues and questions:
- Check the logs for error details
- Review API key configuration
- Verify network connectivity
- Check API provider status pages

---

**Last Updated**: 2026-01-21
**Version**: 1.0.0
