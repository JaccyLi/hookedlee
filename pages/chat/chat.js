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
      // Use streaming endpoint
      await this.sendStreamingMessage(message, assistantMessageId)
    } catch (error) {
      logger.error('[Chat] Error:', error)

      // Update assistant message with error
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
    }
  },

  sendStreamingMessage(message, assistantMessageId) {
    const backendUrl = wx.getStorageSync('backendUrl') || 'https://suosuoli.com:3443'

    return new Promise((resolve, reject) => {
      const requestTask = wx.request({
        url: `${backendUrl}/api/chat/openclaw/stream`,
        method: 'POST',
        data: {
          message: message,
          history: this.data.messages.slice(0, -1).slice(-10)
        },
        header: {
          'Content-Type': 'application/json'
        },
        enableChunked: true,
        success: (res) => {
          logger.log('[Chat] Stream completed, status:', res.statusCode)
          this.setData({
            messages: this.data.messages.map(m =>
              m.id === assistantMessageId
                ? { ...m, streaming: false }
                : m
            ),
            isLoading: false
          })
          resolve()
        },
        fail: (err) => {
          logger.error('[Chat] Stream failed:', err)
          reject(err)
        }
      })

      // Handle chunked data - this is called for each chunk
      if (requestTask.onChunkDataReceived) {
        requestTask.onChunkDataReceived((response) => {
          try {
            // response.data is ArrayBuffer
            const text = this.decodeArrayBuffer(response.data)
            logger.log('[Chat] Chunk received:', text.substring(0, 100))
            this.processStreamData(text, assistantMessageId)
          } catch (e) {
            logger.error('[Chat] Chunk processing error:', e)
          }
        })
      } else {
        // Fallback for older WeChat versions - use non-streaming
        logger.log('[Chat] Streaming not supported, falling back to non-streaming')
        this.sendNonStreamingMessage(message, assistantMessageId)
          .then(resolve)
          .catch(reject)
      }
    })
  },

  decodeArrayBuffer(buffer) {
    try {
      // Convert ArrayBuffer to string using TextDecoder or fallback
      if (typeof TextDecoder !== 'undefined') {
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(buffer)
      }
      // Fallback for environments without TextDecoder
      return String.fromCharCode.apply(null, new Uint8Array(buffer))
    } catch (e) {
      logger.error('[Chat] Decode error:', e)
      return ''
    }
  },

  processStreamData(data, assistantMessageId) {
    // Parse SSE format: "data: {...}\n\n" or raw JSON
    const lines = data.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (trimmedLine.startsWith('data: ')) {
        const jsonStr = trimmedLine.slice(6).trim()

        if (jsonStr === '[DONE]') {
          this.setData({
            messages: this.data.messages.map(m =>
              m.id === assistantMessageId
                ? { ...m, streaming: false }
                : m
            ),
            isLoading: false
          })
          return
        }

        try {
          const parsed = JSON.parse(jsonStr)
          const content = parsed.choices?.[0]?.delta?.content || ''

          if (content) {
            this.appendStreamContent(content, assistantMessageId)
          }
        } catch (e) {
          // Skip invalid JSON
          logger.log('[Chat] Failed to parse JSON:', jsonStr.substring(0, 50))
        }
      }
    }
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

  // Fallback non-streaming message
  async sendNonStreamingMessage(message, assistantMessageId) {
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