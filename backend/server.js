/**
 * HookedLee Backend Server
 * Securely proxies AI API requests and manages API keys
 * HTTPS Support with SSL Certificates
 */

require('dotenv').config()
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const axios = require('axios')
const WebSocket = require('ws')
const { authenticate, verifyWeChatCode, generateToken } = require('./middleware/auth.js')

const app = express()
const HTTP_PORT = process.env.HTTP_PORT || 3000
const HTTPS_PORT = process.env.HTTPS_PORT || 3443

// Trust proxy - needed when behind nginx reverse proxy
app.set('trust proxy', 1)

// ========== MIDDLEWARE ==========

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for WeChat compatibility
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: '*', // WeChat Mini Program requires this
  credentials: true
}))

// Compression
app.use(compression())

// Parse JSON
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

// ========== API KEYS (from environment variables) ==========

// Parse BigModel API keys as array (comma-separated)
const BIGMODEL_KEYS = process.env.BIGMODEL_API_KEY
  ? process.env.BIGMODEL_API_KEY.split(',').map(k => k.trim()).filter(k => k.length > 0)
  : []

const API_KEYS = {
  BIGMODEL: BIGMODEL_KEYS.length > 0 ? BIGMODEL_KEYS[0] : null, // Primary key for compatibility
  BIGMODEL_ALL: BIGMODEL_KEYS, // Array of all keys
  DEEPSEEK: process.env.DEEPSEEK_API_KEY,
  DASHSCOPE: process.env.DASHSCOPE_API_KEY // For Qwen image models
}

// Chat password for OpenClaw access (set in .env)
const CHAT_PASSWORD = process.env.CHAT_PASSWORD || 'hookedlee2024'

// OpenClaw Gateway configuration
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID || 'main'

// Key rotation counter for load balancing
let bigmodelKeyIndex = 0

/**
 * Get next BigModel API key (round-robin)
 * @returns {string} API key
 */
function getNextBigModelKey() {
  if (BIGMODEL_KEYS.length === 0) return null

  const key = BIGMODEL_KEYS[bigmodelKeyIndex]
  bigmodelKeyIndex = (bigmodelKeyIndex + 1) % BIGMODEL_KEYS.length
  return key
}

/**
 * Get BigModel API key count
 * @returns {number} Number of available keys
 */
function getBigModelKeyCount() {
  return BIGMODEL_KEYS.length
}

// Validate API keys on startup
if (BIGMODEL_KEYS.length === 0 && !API_KEYS.DEEPSEEK) {
  console.error('❌ ERROR: At least one API key must be set in .env file!')
  console.error('Please set BIGMODEL_API_KEY (comma-separated for multiple keys) and/or DEEPSEEK_API_KEY')
  process.exit(1)
}

console.log(`✓ Loaded ${BIGMODEL_KEYS.length} BigModel API key(s)`)
if (API_KEYS.DEEPSEEK) {
  console.log('✓ Loaded DeepSeek API key')
}
if (API_KEYS.DASHSCOPE) {
  console.log('✓ Loaded DashScope API key (for Qwen image models)')
}
console.log(`✓ Chat password configured: ${CHAT_PASSWORD !== 'hookedlee2024' ? 'Yes (custom)' : 'Yes (default)'}`)
console.log(`✓ OpenClaw Gateway: ${OPENCLAW_GATEWAY_URL}`)

// ========== ROUTES ==========

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    models: {
      bigmodel: !!API_KEYS.BIGMODEL,
      deepseek: !!API_KEYS.DEEPSEEK
    },
    protocol: req.protocol,
    secure: req.secure
  })
})

// Get available models (doesn't expose keys)
app.get('/api/models', (req, res) => {
  const models = []

  if (BIGMODEL_KEYS.length > 0) {
    models.push({
      id: 'glm-4.7',
      name: 'GLM-4.7',
      provider: 'bigmodel',
      available: true
    })
    models.push({
      id: 'glm-4.7-flash',
      name: 'GLM-4.7-Flash',
      provider: 'bigmodel',
      available: true
    })
    models.push({
      id: 'glm-4.7-flashx',
      name: 'GLM-4.7-FlashX',
      provider: 'bigmodel',
      available: true
    })
  }

  if (API_KEYS.DEEPSEEK) {
    models.push({
      id: 'deepseek-chat',
      name: 'DeepSeek-Chat',
      provider: 'deepseek',
      available: true
    })
    models.push({
      id: 'deepseek-reasoner',
      name: 'DeepSeek-Reasoner',
      provider: 'deepseek',
      available: true
    })
  }

  // Qwen image models
  if (API_KEYS.DASHSCOPE) {
    models.push({
      id: 'qwen-image-max',
      name: 'Qwen-Image-Max',
      provider: 'dashscope',
      type: 'image',
      available: true
    })
    models.push({
      id: 'qwen-image-plus-2026-01-09',
      name: 'Qwen-Image-Plus-2026-01-09',
      provider: 'dashscope',
      type: 'image',
      available: true
    })
    models.push({
      id: 'qwen-image-plus',
      name: 'Qwen-Image-Plus',
      provider: 'dashscope',
      type: 'image',
      available: true
    })
  }

  // Include BigModel key count for load balancing info
  res.json({
    models,
    bigmodelKeyCount: BIGMODEL_KEYS.length,
    dashscopeConfigured: !!API_KEYS.DASHSCOPE
  })
})

// ========== CHAT PASSWORD & OPENCLAW ENDPOINTS ==========

// Rate limiter for password attempts (in-memory)
const passwordAttempts = new Map() // IP -> { count, resetTime, blockedUntil }

/**
 * Check if IP is rate limited for password attempts
 * @param {string} ip - Client IP address
 * @returns {Object} { allowed: boolean, waitTime: number, blocked: boolean }
 */
function checkPasswordRateLimit(ip) {
  const now = Date.now()
  const windowMs = 1000 // 1 second window
  const maxAttempts = 3 // Max 3 attempts per second
  const blockDurationMs = 60000 // Block for 1 minute

  const record = passwordAttempts.get(ip)

  // Check if currently blocked
  if (record?.blockedUntil && now < record.blockedUntil) {
    const waitTime = Math.ceil((record.blockedUntil - now) / 1000)
    return { allowed: false, waitTime, blocked: true }
  }

  if (!record || now > record.resetTime) {
    // New window
    passwordAttempts.set(ip, { count: 1, resetTime: now + windowMs, blockedUntil: null })
    return { allowed: true, waitTime: 0, blocked: false }
  }

  if (record.count >= maxAttempts) {
    // Rate limited - block for 1 minute
    record.blockedUntil = now + blockDurationMs
    const waitTime = Math.ceil(blockDurationMs / 1000)
    console.log(`[Chat Auth] IP ${ip} blocked for 1 minute due to rate limiting`)
    return { allowed: false, waitTime, blocked: true }
  }

  // Increment count
  record.count++
  return { allowed: true, waitTime: 0, blocked: false }
}

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of passwordAttempts.entries()) {
    // Remove entries that are no longer blocked and window has passed
    if (record.blockedUntil && now > record.blockedUntil) {
      passwordAttempts.delete(ip)
    } else if (!record.blockedUntil && now > record.resetTime + 60000) {
      passwordAttempts.delete(ip)
    }
  }
}, 60000)

/**
 * Verify chat password
 * POST /api/chat/verify-password
 * Body: { password: string }
 * Response: { valid: boolean }
 */
app.post('/api/chat/verify-password', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'

  // Check rate limit
  const rateCheck = checkPasswordRateLimit(ip)
  if (!rateCheck.allowed) {
    console.log(`[Chat Auth] Rate limited for IP: ${ip}, blocked: ${rateCheck.blocked}`)
    return res.status(429).json({
      valid: false,
      error: 'Too many attempts',
      message: rateCheck.blocked
        ? 'Too many failed attempts. Please wait 1 minute before trying again.'
        : `Please wait ${rateCheck.waitTime} second(s) before trying again`,
      retryAfter: rateCheck.waitTime,
      blocked: rateCheck.blocked
    })
  }

  const { password } = req.body

  if (!password) {
    return res.status(400).json({
      valid: false,
      error: 'Password is required'
    })
  }

  // Simple password comparison (use bcrypt in production for better security)
  const isValid = password === CHAT_PASSWORD

  if (isValid) {
    console.log(`[Chat Auth] Password verified successfully for IP: ${ip}`)
    // Clear rate limit on successful auth
    passwordAttempts.delete(ip)
    res.json({ valid: true })
  } else {
    console.log(`[Chat Auth] Invalid password attempt from IP: ${ip}`)
    res.json({ valid: false })
  }
})

/**
 * OpenClaw Chat Endpoint
 * POST /api/chat/openclaw
 * Body: { message: string, history: Array }
 * Response: { content: string }
 *
 * Forwards to OpenClaw gateway at http://127.0.0.1:18790/v1/chat/completions
 */
app.post('/api/chat/openclaw', async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      })
    }

    console.log('[OpenClaw Chat] New message:', message)
    console.log('[OpenClaw Chat] History length:', history.length)

    // Build messages array from history + new message
    // Ensure history items have correct format
    const formattedHistory = history.map(h => ({
      role: h.role || 'user',
      content: h.content || ''
    }))

    // Check if last message in history is the same as new message (avoid duplicate)
    const lastMessage = formattedHistory[formattedHistory.length - 1]
    const isDuplicate = lastMessage &&
      lastMessage.role === 'user' &&
      lastMessage.content === message

    const messages = isDuplicate
      ? formattedHistory
      : [...formattedHistory, { role: 'user', content: message }]

    console.log('[OpenClaw Chat] Total messages:', messages.length)
    console.log('[OpenClaw Chat] Gateway:', OPENCLAW_GATEWAY_URL, 'Agent:', OPENCLAW_AGENT_ID)

    // Forward to OpenClaw gateway
    const response = await axios.post(
      `${OPENCLAW_GATEWAY_URL}/v1/chat/completions`,
      {
        model: 'openclaw',
        messages: messages,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
          'x-openclaw-agent-id': OPENCLAW_AGENT_ID
        },
        timeout: 60000 // 1 minute timeout
      }
    )

    // Extract content from OpenAI-compatible response
    const content = response.data?.choices?.[0]?.message?.content || ''

    console.log('[OpenClaw Chat] Response received, length:', content.length)

    res.json({
      content: content,
      id: response.data?.id,
      model: response.data?.model
    })
  } catch (error) {
    console.error('[OpenClaw Chat Error]:', error.message)

    // Log the actual error response from OpenClaw
    if (error.response) {
      console.error('[OpenClaw Chat Error] Status:', error.response.status)
      console.error('[OpenClaw Chat Error] Data:', JSON.stringify(error.response.data))
    }

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'OpenClaw gateway not available',
        message: 'Please ensure OpenClaw is running on ' + OPENCLAW_GATEWAY_URL
      })
    }

    if (error.response?.status === 401) {
      return res.status(503).json({
        error: 'OpenClaw authentication failed',
        message: 'Check OPENCLAW_GATEWAY_TOKEN configuration'
      })
    }

    res.status(500).json({
      error: 'Failed to communicate with OpenClaw',
      details: error.response?.data || error.message
    })
  }
})

/**
 * OpenClaw Streaming Chat Endpoint (WebSocket-ready)
 * POST /api/chat/openclaw/stream
 * Returns SSE stream
 */
app.post('/api/chat/openclaw/stream', async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      })
    }

    console.log('[OpenClaw Stream] New streaming request, message:', message)
    console.log('[OpenClaw Stream] History length:', history.length)

    // Build messages array - check for duplicates
    const formattedHistory = history.map(h => ({
      role: h.role || 'user',
      content: h.content || ''
    }))

    // Check if last message in history is the same as new message (avoid duplicate)
    const lastMessage = formattedHistory[formattedHistory.length - 1]
    const isDuplicate = lastMessage &&
      lastMessage.role === 'user' &&
      lastMessage.content === message

    const messages = isDuplicate
      ? formattedHistory
      : [...formattedHistory, { role: 'user', content: message }]

    console.log('[OpenClaw Stream] Total messages:', messages.length)

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    console.log('[OpenClaw Stream] Connecting to gateway...')

    // Make streaming request to OpenClaw
    const response = await axios({
      method: 'post',
      url: `${OPENCLAW_GATEWAY_URL}/v1/chat/completions`,
      data: {
        model: 'openclaw',
        messages: messages,
        stream: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        'x-openclaw-agent-id': OPENCLAW_AGENT_ID
      },
      responseType: 'stream',
      timeout: 120000 // 2 minutes
    })

    console.log('[OpenClaw Stream] Connected, streaming data...')

    // Pipe the stream to response
    response.data.on('data', (chunk) => {
      const chunkStr = chunk.toString()
      console.log('[OpenClaw Stream] Chunk:', chunkStr.substring(0, 100))
      res.write(chunk)
    })

    response.data.on('end', () => {
      console.log('[OpenClaw Stream] Stream ended')
      res.end()
    })

    response.data.on('error', (error) => {
      console.error('[OpenClaw Stream Error]:', error)
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    })
  } catch (error) {
    console.error('[OpenClaw Stream Setup Error]:', error.message)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to setup streaming',
        details: error.message
      })
    }
  }
})

// ========== AUTH ENDPOINTS ==========

// WeChat Mini Program login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        error: 'Missing code',
        message: 'WeChat login code is required'
      })
    }

    // Verify code with WeChat server
    const wechatData = await verifyWeChatCode(code)

    if (!wechatData || !wechatData.openid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid WeChat login code'
      })
    }

    // Generate JWT token
    const token = generateToken(wechatData.openid)

    console.log(`[Auth] User logged in: ${wechatData.openid}`)

    res.json({
      token,
      openid: wechatData.openid
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    })
  }
})

// Helper function to retry API calls on rate limiting (429)
async function retryApiCall(apiCall, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await apiCall()
      return response
    } catch (error) {
      const isRateLimit = error.response?.status === 429
      const isLastAttempt = attempt === maxRetries - 1

      if (isRateLimit && !isLastAttempt) {
        const waitTime = Math.pow(2, attempt) * 2000 // Exponential backoff: 2s, 4s, 8s
        console.log(`[Rate Limit] Got 429, retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      throw error // Re-throw if not rate limit or last attempt failed
    }
  }
}

// Proxy endpoint for GLM (BigModel) chat completions
app.post('/api/proxy/glm', authenticate, async (req, res) => {
  try {
    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    // Get next API key using round-robin
    const apiKey = getNextBigModelKey()
    if (!apiKey) {
      return res.status(400).json({
        error: 'BigModel API key not configured'
      })
    }

    const keyIndex = bigmodelKeyIndex === 0 ? BIGMODEL_KEYS.length : bigmodelKeyIndex
    console.log(`[GLM Proxy] Request model: ${model}, Using key ${keyIndex}/${BIGMODEL_KEYS.length}, Messages: ${messages?.length}`)

    const response = await retryApiCall(async () => {
      return await axios.post(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: model || 'glm-4.7',
          messages,
          temperature: temperature || 0.8,
          top_p: top_p || 0.95,
          max_tokens: max_tokens || 8192,
          stream: stream || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 300000 // 5 minutes
        }
      )
    }, 3) // Max 3 retries

    console.log(`[GLM Proxy] Success for model: ${model}, Key ${keyIndex}/${BIGMODEL_KEYS.length}`)
    res.json(response.data)
  } catch (error) {
    console.error('[GLM Proxy Error]:', error.message)
    console.error('[GLM Proxy Error] Requested model:', req.body.model)
    res.status(500).json({
      error: 'Failed to proxy request to GLM API',
      details: error.response?.data || error.message
    })
  }
})

// Proxy endpoint for DeepSeek chat completions
app.post('/api/proxy/deepseek', authenticate, async (req, res) => {
  try {
    if (!API_KEYS.DEEPSEEK) {
      return res.status(400).json({
        error: 'DeepSeek API key not configured'
      })
    }

    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    console.log('[DeepSeek Proxy] Request model:', model, 'Temperature:', temperature, 'Messages:', messages?.length)

    const response = await retryApiCall(async () => {
      return await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: model || 'deepseek-chat',
          messages,
          temperature: temperature || 0.8,
          top_p: top_p || 0.95,
          max_tokens: max_tokens || 8192,
          stream: stream || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.DEEPSEEK}`
          },
          timeout: 300000 // 5 minutes
        }
      )
    }, 3) // Max 3 retries

    console.log('[DeepSeek Proxy] Success for model:', model)
    res.json(response.data)
  } catch (error) {
    console.error('[DeepSeek Proxy Error]:', error.message)
    console.error('[DeepSeek Proxy Error] Requested model:', req.body.model)
    res.status(500).json({
      error: 'Failed to proxy request to DeepSeek API',
      details: error.response?.data || error.message
    })
  }
})

// Proxy endpoint for image generation (supports multiple providers)
app.post('/api/proxy/image', authenticate, async (req, res) => {
  try {
    const { prompt, size, isHero, imageModel = 'cogview-3-flash' } = req.body

    console.log('[Image Gen]', isHero ? 'Hero image' : 'Section image', 'model:', imageModel)

    // Route to appropriate image provider
    if (imageModel.startsWith('qwen-')) {
      // Qwen Image Generation (DashScope)
      if (!API_KEYS.DASHSCOPE) {
        return res.status(400).json({
          error: 'DashScope API key not configured'
        })
      }

      // Map size to Qwen format (e.g., "1024x1024" -> "1024*1024")
      const qwenSize = (size || '1024x1024').replace('x', '*')

      const response = await retryApiCall(async () => {
        return await axios.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
          {
            model: imageModel,
            input: {
              messages: [
                {
                  role: 'user',
                  content: [
                    { text: prompt }
                  ]
                }
              ]
            },
            parameters: {
              size: qwenSize,
              prompt_extend: false, // Don't extend prompt, use as-is
              watermark: false,
              negative_prompt: ''
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEYS.DASHSCOPE}`
            },
            timeout: 60000
          }
        )
      }, 3)

      // Transform Qwen response to match BigModel format
      // Qwen: { output: { choices: [{ message: { content: [{ image: url }] } }] } }
      // BigModel: { data: [{ url: url }] }
      const imageUrl = response.data?.output?.choices?.[0]?.message?.content?.[0]?.image
      if (imageUrl) {
        return res.json({
          data: [{ url: imageUrl }]
        })
      } else {
        throw new Error('Invalid Qwen image response format')
      }
    } else {
      // BigModel CogView Generation
      const apiKey = getNextBigModelKey()
      if (!apiKey) {
        return res.status(400).json({
          error: 'BigModel API key not configured'
        })
      }

      const keyIndex = bigmodelKeyIndex === 0 ? BIGMODEL_KEYS.length : bigmodelKeyIndex
      console.log(`[Image Gen] Using BigModel CogView, key ${keyIndex}/${BIGMODEL_KEYS.length}`)

      const response = await retryApiCall(async () => {
        return await axios.post(
          'https://open.bigmodel.cn/api/paas/v4/images/generations',
          {
            model: imageModel,
            prompt: prompt,
            size: size || '1024x1024'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 60000
          }
        )
      }, 3)

      res.json(response.data)
    }
  } catch (error) {
    console.error('[Image Generation Error]:', error.message)
    console.error('[Image Generation Error Details]:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.response?.data || error.message
    })
  }
})

// Unified proxy endpoint (routes to appropriate API based on model)
app.post('/api/proxy/chat', authenticate, async (req, res) => {
  try {
    const { model } = req.body

    console.log('[Unified Proxy] Received request for model:', model)

    if (!model) {
      return res.status(400).json({
        error: 'Model is required'
      })
    }

    // Route to appropriate proxy
    if (model === 'glm-4.7' || model === 'glm-4.7-flash' || model === 'glm-4.7-flashx') {
      console.log('[Unified Proxy] Routing to GLM endpoint for model:', model)
      req.url = '/api/proxy/glm'
      return app._router.handle(req, res)
    } else if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
      console.log('[Unified Proxy] Routing to DeepSeek endpoint for model:', model)
      req.url = '/api/proxy/deepseek'
      return app._router.handle(req, res)
    } else {
      console.error('[Unified Proxy] Unknown model:', model)
      return res.status(400).json({
        error: `Unknown model: ${model}`
      })
    }
  } catch (error) {
    console.error('[Unified Proxy Error]:', error.message)
    res.status(500).json({
      error: 'Failed to proxy chat request',
      details: error.message
    })
  }
})

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// ========== SSL CERTIFICATE OPTIONS ==========

// SSL certificate paths
const certPaths = {
  key: process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'key.pem'),
  cert: process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'cert.pem'),
  ca: process.env.SSL_CA_PATH || path.join(__dirname, 'ssl', 'ca.pem')
}

// Check if SSL certificates exist
const sslExists = fs.existsSync(certPaths.key) && fs.existsSync(certPaths.cert)

// ========== CREATE HTTPS SERVER ==========

let httpsServer = null

if (sslExists) {
  // SSL certificates found - start HTTPS server
  try {
    const httpsOptions = {
      key: fs.readFileSync(certPaths.key),
      cert: fs.readFileSync(certPaths.cert),
      ca: fs.existsSync(certPaths.ca) ? fs.readFileSync(certPaths.ca) : undefined
    }

    httpsServer = https.createServer(httpsOptions, app)

    httpsServer.listen(HTTPS_PORT, () => {
      console.log('=================================')
      console.log('🔒 HTTPS Server Started')
      console.log('=================================')
      console.log(`✓ HTTPS running on port ${HTTPS_PORT}`)
      console.log(`✓ SSL certificates loaded`)
      console.log(`✓ Certificate: ${certPaths.cert}`)
      console.log(`✓ Key: ${certPaths.key}`)
      console.log('=================================\n')
    })

    httpsServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${HTTPS_PORT} is already in use!`)
        console.error('Please stop the other process or use a different port')
      } else {
        console.error('❌ HTTPS server error:', error)
      }
    })
  } catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message)
    console.log('ℹ️  Falling back to HTTP only...')
    console.log('ℹ️  See README.md for instructions on generating SSL certificates\n')
  }
} else {
  // No SSL certificates - HTTP only
  console.log('=================================')
  console.log('⚠️  SSL certificates not found')
  console.log('=================================')
  console.log('ℹ️  HTTPS server not started')
  console.log('ℹ️  To enable HTTPS, follow these steps:')
  console.log('')
  console.log('For local development (self-signed cert):')
  console.log('  npm run generate-cert')
  console.log('')
  console.log('For production (Let\'s Encrypt):')
  console.log('  1. Point your domain to this server')
  console.log('  2. Run: sudo certbot --nginx -d yourdomain.com')
  console.log('  3. Update cert paths in .env')
  console.log('')
  console.log('=================================\n')
}

// ========== CREATE HTTP SERVER (redirects to HTTPS) ==========

const httpServer = http.createServer((req, res) => {
  // Check if request is coming from nginx reverse proxy
  const forwardedProto = req.headers['x-forwarded-proto']

  // If behind nginx proxy (https forwarded), serve directly without redirect
  if (forwardedProto === 'https') {
    app(req, res)
  } else if (sslExists) {
    // Redirect all direct HTTP traffic to HTTPS
    const httpsHost = req.headers.host.split(':')[0] // Remove port if present
    const httpsUrl = `https://${httpsHost}:${HTTPS_PORT}${req.url}`
    console.log(`[HTTP → HTTPS] Redirecting to: ${httpsUrl}`)

    res.writeHead(301, {
      Location: httpsUrl
    })
    res.end()
  } else {
    // No HTTPS available, serve HTTP directly
    app(req, res)
  }
})

httpServer.listen(HTTP_PORT, () => {
  if (sslExists) {
    console.log('=================================')
    console.log('🌐 HTTP Server Started (Redirect Mode)')
    console.log('=================================')
    console.log(`✓ HTTP running on port ${HTTP_PORT}`)
    console.log(`✓ Redirecting to HTTPS port ${HTTPS_PORT}`)
  } else {
    console.log('=================================')
    console.log('🌐 HTTP Server Started (Development Mode)')
    console.log('=================================')
    console.log(`✓ HTTP running on port ${HTTP_PORT}`)
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
  }
  console.log(`✓ BigModel API: ${API_KEYS.BIGMODEL ? '✓ Configured' : '✗ Not configured'}`)
  console.log(`✓ DeepSeek API: ${API_KEYS.DEEPSEEK ? '✓ Configured' : '✗ Not configured'}`)
  console.log('=================================')
  console.log('\nAvailable endpoints:')
  console.log(`  HTTP:  http://localhost:${HTTP_PORT}/api/health`)
  if (sslExists) {
    console.log(`  HTTPS: https://localhost:${HTTPS_PORT}/api/health`)
  }
  console.log('=================================\n')
})

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${HTTP_PORT} is already in use!`)
    console.error('Please stop the other process or use a different port')
  } else {
    console.error('❌ HTTP server error:', error)
  }
})

// ========== WEBSOCKET SERVER FOR STREAMING ==========

// Choose the appropriate server for WebSocket (HTTPS or HTTP)
const wsServer = httpsServer || httpServer
const wss = new WebSocket.Server({ server: wsServer, path: '/ws/chat' })

console.log('=================================')
console.log('🔌 WebSocket Server Started')
console.log('=================================')
console.log(`✓ WebSocket running on ${httpsServer ? 'HTTPS' : 'HTTP'} server`)
console.log(`✓ WebSocket path: /ws/chat`)
console.log('=================================\n')

// Store active connections with their session info
const connections = new Map()

wss.on('connection', (ws, req) => {
  const clientId = Date.now() + Math.random().toString(36).substr(2, 9)
  console.log(`[WebSocket] Client connected: ${clientId}`)

  // Store connection
  connections.set(clientId, {
    ws,
    isAuthenticated: false,
    userOpenid: null
  })

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId,
    message: 'Connected to streaming server'
  }))

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      console.log(`[WebSocket] Received from ${clientId}:`, data.type)

      const connection = connections.get(clientId)

      // Handle authentication
      if (data.type === 'auth') {
        const { token } = data
        // Verify token (simplified - use your auth middleware)
        if (token) {
          connection.isAuthenticated = true
          connection.userOpenid = token // In production, verify JWT properly
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Authenticated successfully'
          }))
        } else {
          ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Authentication failed'
          }))
        }
        return
      }

      // Handle streaming requests
      if (data.type === 'stream_request') {
        const { model, messages, temperature, sectionIndex } = data

        console.log(`[WebSocket] Stream request for section ${sectionIndex}, model: ${model}`)

        // Route to appropriate API
        let apiUrl = ''
        let apiKey = ''

        if (model === 'glm-4.7' || model === 'glm-4.7-flash' || model === 'glm-4.7-flashx') {
          apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
          apiKey = getNextBigModelKey()
        } else if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
          apiUrl = 'https://api.deepseek.com/v1/chat/completions'
          apiKey = API_KEYS.DEEPSEEK
        }

        if (!apiUrl || !apiKey) {
          ws.send(JSON.stringify({
            type: 'error',
            sectionIndex,
            error: 'Model not configured'
          }))
          return
        }

        try {
          // Make streaming request to AI API
          const response = await axios({
            method: 'post',
            url: apiUrl,
            data: {
              model,
              messages,
              temperature: temperature || 0.8,
              stream: true
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            responseType: 'stream'
          })

          // Stream chunks back to client
          response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  ws.send(JSON.stringify({
                    type: 'done',
                    sectionIndex
                  }))
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''

                  if (content) {
                    ws.send(JSON.stringify({
                      type: 'chunk',
                      sectionIndex,
                      content
                    }))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          })

          response.data.on('end', () => {
            console.log(`[WebSocket] Stream completed for section ${sectionIndex}`)
          })

          response.data.on('error', (error) => {
            console.error(`[WebSocket] Stream error for section ${sectionIndex}:`, error)
            ws.send(JSON.stringify({
              type: 'error',
              sectionIndex,
              error: error.message
            }))
          })
        } catch (error) {
          console.error(`[WebSocket] Stream setup error for section ${sectionIndex}:`, error)
          ws.send(JSON.stringify({
            type: 'error',
            sectionIndex,
            error: error.message
          }))
        }
      }

      // Handle chat messages (OpenClaw streaming)
      if (data.type === 'chat') {
        const { message, history = [] } = data

        console.log(`[WebSocket] Chat request from ${clientId}:`, message?.substring(0, 50))

        // Build messages array
        const formattedHistory = history.map(h => ({
          role: h.role || 'user',
          content: h.content || ''
        }))

        // Check for duplicates
        const lastMessage = formattedHistory[formattedHistory.length - 1]
        const isDuplicate = lastMessage &&
          lastMessage.role === 'user' &&
          lastMessage.content === message

        const messages = isDuplicate
          ? formattedHistory
          : [...formattedHistory, { role: 'user', content: message }]

        console.log(`[WebSocket] Chat messages count: ${messages.length}`)

        try {
          // Make streaming request to OpenClaw
          const response = await axios({
            method: 'post',
            url: `${OPENCLAW_GATEWAY_URL}/v1/chat/completions`,
            data: {
              model: 'openclaw',
              messages: messages,
              stream: true
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
              'x-openclaw-agent-id': OPENCLAW_AGENT_ID
            },
            responseType: 'stream',
            timeout: 120000
          })

          console.log(`[WebSocket] Chat stream started for ${clientId}`)

          // Stream chunks back to client
          response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  ws.send(JSON.stringify({
                    type: 'done'
                  }))
                  console.log(`[WebSocket] Chat stream done for ${clientId}`)
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''

                  if (content) {
                    ws.send(JSON.stringify({
                      type: 'chunk',
                      content
                    }))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          })

          response.data.on('end', () => {
            console.log(`[WebSocket] Chat stream ended for ${clientId}`)
          })

          response.data.on('error', (error) => {
            console.error(`[WebSocket] Chat stream error for ${clientId}:`, error)
            ws.send(JSON.stringify({
              type: 'error',
              error: error.message
            }))
          })
        } catch (error) {
          console.error(`[WebSocket] Chat setup error for ${clientId}:`, error.message)
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message
          }))
        }
      }
    } catch (error) {
      console.error('[WebSocket] Message handling error:', error)
    }
  })

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${clientId}`)
    connections.delete(clientId)
  })

  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for ${clientId}:`, error)
    connections.delete(clientId)
  })
})

// ========== GRACEFUL SHUTDOWN ==========

const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...')

  httpServer.close(() => {
    console.log('✓ HTTP server closed')
  })

  if (httpsServer) {
    httpsServer.close(() => {
      console.log('✓ HTTPS server closed')
    })
  }

  setTimeout(() => {
    console.log('✓ Goodbye!')
    process.exit(0)
  }, 1000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

module.exports = app
