const backendClient = require('../../utils/backend-client.js')
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
    this.setData({
      messages,
      inputMessage: '',
      isLoading: true,
      scrollToView: `msg-${messages.length - 1}`
    })

    try {
      // Call OpenClaw via backend
      const response = await backendClient.makeBackendRequest('/api/chat/openclaw', {
        message: message,
        history: this.data.messages.slice(-10) // Send last 10 messages for context
      }, 'POST', false)

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.content || response.message || (this.data.language === 'en' ? 'Sorry, I could not generate a response.' : '抱歉，无法生成回复。')
      }

      this.setData({
        messages: [...this.data.messages, assistantMessage],
        isLoading: false,
        scrollToView: `msg-${this.data.messages.length}`
      })
    } catch (error) {
      logger.error('[Chat] Error:', error)

      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: this.data.language === 'en'
          ? 'Sorry, an error occurred. Please try again.'
          : '抱歉，发生了错误。请重试。'
      }

      this.setData({
        messages: [...this.data.messages, errorMessage],
        isLoading: false
      })
    }
  }
})