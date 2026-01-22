Page({
  data: {
    selectedModel: 'default',
    language: 'en'
  },

  onLoad() {
    // Enable sharing in production
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    const app = getApp()

    // Map internal model to simplified UI options
    const savedModel = wx.getStorageSync('selectedModel')
    // If user has 'deepseek-reasoner' stored, map to 'high-quality'
    // Otherwise map to 'default' (covers 'glm-4.7', 'deepseek-chat', etc.)
    const uiModel = savedModel === 'deepseek-reasoner' ? 'high-quality' : 'default'

    const savedLanguage = app.globalData.language || 'en'

    this.setData({
      selectedModel: uiModel,
      language: savedLanguage
    })
  },

  onModelChange(e) {
    const uiModel = e.detail.value
    this.setData({ selectedModel: uiModel })

    const app = getApp()

    // Map UI option back to internal model
    // 'default' → smart mode (will be handled by generateCard logic)
    // 'high-quality' → deepseek-reasoner for all sections
    const internalModel = uiModel === 'high-quality' ? 'deepseek-reasoner' : 'default'

    app.globalData.selectedModel = internalModel
    wx.setStorageSync('selectedModel', internalModel)

    const modelNames = {
      'default': { en: 'Default Search', zh: '默认搜索' },
      'high-quality': { en: 'High Quality Search', zh: '高质量搜索' }
    }

    wx.showToast({
      title: this.data.language === 'en' ? `Switched to ${modelNames[uiModel].en}` : `已切换到${modelNames[uiModel].zh}`,
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
  },

  onShareTimeline() {
    const language = this.data.language || 'en'
    return {
      title: language === 'en' ? 'HookedLee - Your Fly Fishing Knowledge Base' : 'HookedLee - 你的飞钓知识库',
      imageUrl: '/images/share-cover.jpg',
      query: ''
    }
  }
})
