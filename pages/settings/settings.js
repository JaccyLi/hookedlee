Page({
  data: {
    selectedModel: 'deepseek-chat',
    language: 'en'
  },

  onLoad() {
    const app = getApp()

    const savedModel = wx.getStorageSync('selectedModel')
    const savedLanguage = app.globalData.language || 'en'

    this.setData({
      selectedModel: savedModel || 'deepseek-chat',
      language: savedLanguage
    })
  },

  onModelChange(e) {
    const model = e.detail.value
    this.setData({ selectedModel: model })

    const app = getApp()
    app.globalData.selectedModel = model
    wx.setStorageSync('selectedModel', model)

    const modelNames = {
      'glm-4.7': { en: 'Quality Search', zh: '质量搜索' },
      'deepseek-chat': { en: 'Fast Search', zh: '快速搜索' },
      'deepseek-reasoner': { en: 'Deep Search', zh: '深度搜索' }
    }

    wx.showToast({
      title: this.data.language === 'en' ? `Switched to ${modelNames[model].en}` : `已切换到${modelNames[model].zh}`,
      icon: 'success',
      duration: 2000
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    const language = this.data.language || 'en'
    return {
      title: language === 'en' ? 'HookedLee - Your Fly Fishing Knowledge Base' : 'HookedLee - 你的飞钓知识库',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  }
})
