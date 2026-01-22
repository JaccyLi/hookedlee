/**
 * WebSocket Client for Streaming AI Content
 */

const logger = {
  log: (...args) => console.log('[WebSocket]', ...args),
  error: (...args) => console.error('[WebSocket]', ...args),
  warn: (...args) => console.warn('[WebSocket]', ...args)
}

class WebSocketClient {
  constructor() {
    this.ws = null
    this.clientId = null
    this.isConnected = false
    this.messageHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 3
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - JWT token for authentication
   * @returns {Promise<void>}
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      const backendUrl = wx.getStorageSync('backendUrl') || 'https://suosuoli.com'

      // Construct WebSocket URL
      const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws'
      const wsUrl = `${wsProtocol}://${backendUrl.replace(/^https?:\/\//, '')}/ws`

      logger.log('Connecting to WebSocket:', wsUrl)

      this.ws = wx.connectSocket({
        url: wsUrl,
        header: {
          'Authorization': `Bearer ${token}`
        }
      })

      this.ws.onOpen(() => {
        logger.log('WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        resolve()
      })

      this.ws.onMessage((message) => {
        try {
          const data = JSON.parse(message.data)
          logger.log('Received message:', data.type)

          // Handle different message types
          if (data.type === 'connected') {
            this.clientId = data.clientId
            logger.log('Client ID assigned:', this.clientId)
            // Authenticate after connecting
            this.authenticate(token)
          } else if (data.type === 'auth_success') {
            logger.log('Authentication successful')
          } else if (data.type === 'chunk') {
            // Stream chunk - call handler if registered
            const handler = this.messageHandlers.get(`chunk_${data.sectionIndex}`)
            if (handler) {
              handler(data.content)
            }
          } else if (data.type === 'done') {
            // Stream done - call handler if registered
            const handler = this.messageHandlers.get(`done_${data.sectionIndex}`)
            if (handler) {
              handler()
            }
          } else if (data.type === 'error') {
            logger.error('Stream error:', data.error)
            const handler = this.messageHandlers.get(`error_${data.sectionIndex}`)
            if (handler) {
              handler(data.error)
            }
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error)
        }
      })

      this.ws.onError((error) => {
        logger.error('WebSocket error:', error)
        this.isConnected = false
        reject(error)
      })

      this.ws.onClose(() => {
        logger.log('WebSocket closed')
        this.isConnected = false
        this.messageHandlers.clear()
      })
    })
  }

  /**
   * Authenticate with the server
   * @param {string} token - JWT token
   */
  authenticate(token) {
    if (!this.isConnected) {
      logger.warn('Cannot authenticate - not connected')
      return
    }

    this.send({
      type: 'auth',
      token
    })
  }

  /**
   * Request streaming content for a section
   * @param {number} sectionIndex - Section index
   * @param {string} model - Model to use
   * @param {Array} messages - Messages array
   * @param {number} temperature - Temperature
   * @param {Function} onChunk - Callback for each chunk
   * @param {Function} onDone - Callback when done
   * @param {Function} onError - Callback on error
   */
  streamSection(sectionIndex, model, messages, temperature, onChunk, onDone, onError) {
    if (!this.isConnected) {
      logger.warn('Cannot stream - not connected')
      onError('Not connected')
      return
    }

    // Register handlers for this section
    this.messageHandlers.set(`chunk_${sectionIndex}`, onChunk)
    this.messageHandlers.set(`done_${sectionIndex}`, onDone)
    this.messageHandlers.set(`error_${sectionIndex}`, onError)

    // Send stream request
    this.send({
      type: 'stream_request',
      sectionIndex,
      model,
      messages,
      temperature
    })
  }

  /**
   * Send message to server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.isConnected) {
      logger.warn('Cannot send - not connected')
      return
    }

    this.ws.send({
      data: JSON.stringify(data)
    })
  }

  /**
   * Clear handlers for a specific section
   * @param {number} sectionIndex - Section index
   */
  clearHandlers(sectionIndex) {
    this.messageHandlers.delete(`chunk_${sectionIndex}`)
    this.messageHandlers.delete(`done_${sectionIndex}`)
    this.messageHandlers.delete(`error_${sectionIndex}`)
  }

  /**
   * Close WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
      this.messageHandlers.clear()
    }
  }
}

// Export singleton instance
module.exports = new WebSocketClient()
