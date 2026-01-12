const { generateArticle, validateApiKey, generateImagesForArticle } = require('../../utils/bigmodel.js')

function insertImagesIntoContent(content, images) {
  let modifiedContent = content
  const maxImagesToInsert = Math.min(images.length, 3)
  let imageIndex = 0

  modifiedContent = modifiedContent.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, title) => {
    if (imageIndex < maxImagesToInsert) {
      const imgTag = `<img src="${images[imageIndex].url}" alt="${images[imageIndex].description}" style="width: 100%; border-radius: 8px; margin: 16px 0;">`
      imageIndex++
      return `<h2${attrs}>${title}</h2>${imgTag}`
    }
    return match
  })

  modifiedContent = modifiedContent.replace(/<h3([^>]*)>(.*?)<\/h3>/gi, (match, attrs, title) => {
    if (imageIndex < maxImagesToInsert) {
      const imgTag = `<img src="${images[imageIndex].url}" alt="${images[imageIndex].description}" style="width: 100%; border-radius: 8px; margin: 16px 0;">`
      imageIndex++
      return `<h3${attrs}>${title}</h3>${imgTag}`
    }
    return match
  })

  return modifiedContent
}

const i18n = {
  en: {
    title: 'HookedLee',
    subtitle: 'Discover fly fishing tips, techniques & more',
    generateBtn: 'Generate New Article',
    generating: 'Generating...',
    backBtn: '← Back',
    nextBtn: '← Back',
    loadingText: 'Generating article...',
    errorText: 'Failed to generate article. Please try again.',
    emptyText: 'Tap button below to generate a new article',
    filterLabel: 'Category:',
    categories: {
      all: 'Random',
      'fly tying': 'FlyTying',
      'fly casting': 'FlyCasting',
      'biology': 'AnglingBio',
      'gear': 'Gear',
      'conservation': 'Conservation'
    },
    categoryLabels: {
      'fly tying': 'FlyTying',
      'fly casting': 'FlyCasting',
      'biology': 'AnglingBio',
      'gear': 'Gear',
      'conservation': 'Conservation'
    }
  },
  zh: {
    title: 'HookedLee',
    subtitle: '一键生成文章-解锁各种飞钓技巧',
    generateBtn: '生成新文章',
    generating: '生成中...',
    backBtn: '← 返回',
    nextBtn: '← 返回',
    loadingText: '正在生成文章...',
    errorText: '生成文章失败，请重试',
    emptyText: '点击下方按钮生成新文章',
    filterLabel: '分类：',
    categories: {
      all: '随机',
      'fly tying': '毛钩',
      'fly casting': '抛投',
      'biology': '飞钓生物学',
      'gear': '装备',
      'conservation': '生态保护'
    },
    categoryLabels: {
      'fly tying': '毛钩',
      'fly casting': '抛投',
      'biology': '飞钓生物学',
      'gear': '装备',
      'conservation': '生态保护'
    }
  }
}

Page({
  data: {
    cardData: null,
    loading: false,
    error: null,
    selectedCategory: 'all',
    articleHistory: [],
    forwardHistory: [],
    hasPreviousArticle: false,
    hasNextArticle: false,
    language: 'en',
    uiText: {},
    loadingText: ''
  },

  onLoad() {
    const app = getApp()
    const savedLanguage = app.globalData.language || 'en'
    this.setData({
      language: savedLanguage,
      loadingText: i18n[savedLanguage].loadingText
    })
    this.updateUIText()
  },

  updateUIText() {
    const lang = this.data.language
    this.setData({
      uiText: i18n[lang]
    })
  },

  toggleLanguage() {
    const newLanguage = this.data.language === 'en' ? 'zh' : 'en'
    this.setData({ language: newLanguage })

    const app = getApp()
    app.globalData.language = newLanguage

    this.updateUIText()

    wx.showToast({
      title: newLanguage === 'en' ? 'Switched to English' : '已切换到中文',
      icon: 'success',
      duration: 1000
    })
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
  },

  async generateCard() {
    const app = getApp()
    const apiKey = app.globalData.bigModelApiKey

    if (!validateApiKey(apiKey)) {
      this.setData({
        error: this.data.language === 'en' ? 'Please configure your BigModel API key in app.js' : '请在 app.js 中配置您的 BigModel API 密钥'
      })
      wx.showToast({
        title: this.data.language === 'en' ? 'API key required' : '需要 API 密钥',
        icon: 'none',
        duration: 3000
      })
      return
    }

    if (this.data.cardData) {
      const newForwardHistory = [...this.data.forwardHistory, this.data.cardData]
      this.setData({
        forwardHistory: newForwardHistory,
        hasNextArticle: true
      })
    }

    this.setData({
      loading: true,
      error: null
    })

    try {
      const article = await generateArticle(this.data.selectedCategory, apiKey, this.data.language)

      this.setData({
        loadingText: this.data.language === 'en' ? 'Generating images...' : '正在生成图片...'
      })

      const h2Count = (article.content.match(/<h2[^>]*>/gi) || []).length
      const h3Count = (article.content.match(/<h3[^>]*>/gi) || []).length
      const sectionCount = h2Count + h3Count

      const imageCount = Math.min(sectionCount, 3)
      const images = await generateImagesForArticle(this.data.selectedCategory, article.title, imageCount, apiKey)
      const contentWithImages = insertImagesIntoContent(article.content, images)
      const firstImage = images.length > 0 ? images[0] : null

      const categoryLabel = i18n[this.data.language].categoryLabels[article.originalCategory] || i18n[this.data.language].categoryLabels[this.data.selectedCategory]

      const cardData = {
        title: article.title,
        summary: article.title,
        content: contentWithImages,
        category: categoryLabel,
        image: firstImage ? firstImage.url : '',
        imageUrl: firstImage ? firstImage.url : '',
        source: 'Generated by AI',
        timestamp: new Date().toISOString()
      }

      this.setData({
        cardData: cardData
      })

      wx.showToast({
        title: this.data.language === 'en' ? 'Article generated!' : '文章已生成！',
        icon: 'success',
        duration: 2000
      })
    } catch (err) {
      console.error('Generate card error:', err)
      this.setData({
        error: this.data.language === 'en' ? 'Failed to generate article. Please try again.' : '生成文章失败，请重试。'
      })
      wx.showToast({
        title: this.data.language === 'en' ? 'Error generating article' : '生成文章失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  goBackToPrevious() {
    if (this.data.forwardHistory.length > 0) {
      const history = this.data.forwardHistory
      const previousArticle = history[history.length - 1]

      const newHistory = history.slice(0, -1)
      const hasPrevious = newHistory.length > 0

      this.setData({
        cardData: previousArticle,
        forwardHistory: newHistory,
        hasPreviousArticle: hasPrevious
      })

      wx.showToast({
        title: this.data.language === 'en' ? 'Back to previous' : '返回',
        icon: 'success',
        duration: 1000
      })
    }
  },

  goBackToNext() {
    if (this.data.articleHistory.length > 0) {
      const history = this.data.articleHistory
      const nextArticle = history[0]

      const newHistory = history.slice(1)
      const hasNext = newHistory.length > 0

      this.setData({
        cardData: nextArticle,
        articleHistory: newHistory,
        hasPreviousArticle: true,
        hasNextArticle: hasNext
      })

      wx.showToast({
        title: this.data.language === 'en' ? 'Back' : '返回',
        icon: 'success',
        duration: 1000
      })
    }
  },

  onShareAppMessage() {
    const title = this.data.language === 'en'
      ? 'Fly Fishing Daily Article - Discover fly fishing tips'
      : '飞钓文章 - 解锁各种飞钓技巧'
    return {
      title: title,
      path: '/pages/index/index',
      imageUrl: this.data.cardData ? this.data.cardData.imageUrl : ''
    }
  }
})
