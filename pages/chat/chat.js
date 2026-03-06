const logger = require('../../utils/logger.js')

Page({
  data: {
    messages: [],
    inputMessage: '',
    isLoading: false,
    language: 'en',
    scrollToView: ''
  },

  onLoad() {
    const app = getApp()
    this.setData({
      language: app.globalData.language || 'en'
    })
  },

  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },

  async sendMessage() {
    const message = this.data.inputMessage.trim()
    if (!message || this.data.isLoading) return

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message
    }

    const messages = [...this.data.messages, userMessage]
    const assistantMessageId = Date.now() + 1

    this.setData({
      messages,
      inputMessage: '',
      isLoading: true,
      scrollToView: `msg-${messages.length - 1}`
    })

    // Add empty assistant message that will be filled with streaming content
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      streaming: true
    }

    this.setData({
      messages: [...this.data.messages, assistantMessage]
    })

    try {
      // Use streaming via WebSocket
      await this.sendStreamingMessageWebSocket(message, assistantMessageId)
    } catch (error) {
      logger.error('[Chat] WebSocket error, falling back to HTTP:', error)
      // Fallback to non-streaming HTTP
      try {
        await this.sendNonStreamingMessage(message, assistantMessageId)
      } catch (fallbackError) {
        logger.error('[Chat] Fallback error:', fallbackError)
        this.setErrorState(assistantMessageId)
      }
    }
  },

  sendStreamingMessageWebSocket(message, assistantMessageId) {
    const backendUrl = wx.getStorageSync('backendUrl') || 'https://suosuoli.com:3443'
    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/chat'

    return new Promise((resolve, reject) => {
      let settled = false

      logger.log('[Chat] Connecting to WebSocket:', wsUrl)

      const socketTask = wx.connectSocket({
        url: wsUrl,
        success: () => {
          logger.log('[Chat] WebSocket connection initiated')
        },
        fail: (err) => {
          logger.error('[Chat] WebSocket connection failed:', err)
          if (!settled) {
            settled = true
            reject(err)
          }
        }
      })

      // Connection opened
      wx.onSocketOpen(() => {
        logger.log('[Chat] WebSocket connected')
        // Send the chat message
        const payload = {
          type: 'chat',
          message: message,
          history: this.data.messages.slice(0, -1).slice(-10)
        }
        wx.sendSocketMessage({
          data: JSON.stringify(payload),
          success: () => logger.log('[Chat] Message sent via WebSocket'),
          fail: (err) => logger.error('[Chat] Failed to send message:', err)
        })
      })

      // Receive messages
      wx.onSocketMessage((res) => {
        try {
          const data = JSON.parse(res.data)
          logger.log('[Chat] WebSocket message received:', data.type || 'unknown')

          if (data.type === 'chunk' && data.content) {
            // Append streaming content
            this.appendStreamContent(data.content, assistantMessageId)
          } else if (data.type === 'done') {
            // Stream complete
            logger.log('[Chat] Stream complete')
            this.setData({
              messages: this.data.messages.map(m =>
                m.id === assistantMessageId
                  ? { ...m, streaming: false }
                  : m
              ),
              isLoading: false
            })
            if (!settled) {
              settled = true
              wx.closeSocket()
              resolve()
            }
          } else if (data.type === 'error') {
            logger.error('[Chat] Server error:', data.error)
            this.setErrorState(assistantMessageId)
            if (!settled) {
              settled = true
              wx.closeSocket()
              reject(new Error(data.error))
            }
          }
        } catch (e) {
          logger.error('[Chat] Failed to parse WebSocket message:', e)
        }
      })

      // Handle errors
      wx.onSocketError((err) => {
        logger.error('[Chat] WebSocket error:', err)
        if (!settled) {
          settled = true
          reject(err)
        }
      })

      // Handle close
      wx.onSocketClose(() => {
        logger.log('[Chat] WebSocket closed')
      })

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!settled) {
          settled = true
          wx.closeSocket()
          reject(new Error('WebSocket timeout'))
        }
      }, 120000)
    })
  },

  appendStreamContent(content, assistantMessageId) {
    const currentMessages = this.data.messages
    const msgIndex = currentMessages.findIndex(m => m.id === assistantMessageId)

    if (msgIndex !== -1) {
      const currentContent = currentMessages[msgIndex].content || ''
      const updatedMessages = [...currentMessages]
      updatedMessages[msgIndex] = {
        ...updatedMessages[msgIndex],
        content: currentContent + content
      }

      this.setData({
        messages: updatedMessages,
        scrollToView: `msg-${msgIndex}`
      })
    }
  },

  setErrorState(assistantMessageId) {
    const errorMsg = this.data.language === 'en'
      ? 'Sorry, an error occurred. Please try again.'
      : '抱歉，发生了错误。请重试。'

    this.setData({
      messages: this.data.messages.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: errorMsg, streaming: false }
          : m
      ),
      isLoading: false
    })
  },

  // Non-streaming fallback
  sendNonStreamingMessage(message, assistantMessageId) {
    const backendUrl = wx.getStorageSync('backendUrl') || 'https://suosuoli.com:3443'

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${backendUrl}/api/chat/openclaw`,
        method: 'POST',
        data: {
          message: message,
          history: this.data.messages.slice(0, -1).slice(-10)
        },
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          const content = res.data?.content || ''
          this.setData({
            messages: this.data.messages.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: content, streaming: false }
                : m
            ),
            isLoading: false
          })
          resolve()
        },
        fail: reject
      })
    })
  }
})