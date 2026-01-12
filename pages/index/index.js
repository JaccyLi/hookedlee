const { generateArticleOutline, expandSection, generateImagesForParagraphs, generateHeroImage, generateImage } = require('../../utils/bigmodel.js')
const { categories, categoryLabels } = require('../../utils/categories.js')

const i18n = {
  en: {
    title: 'HookedLee',
    subtitle: 'Discover fly fishing tips, techniques & more',
    generateBtn: 'Generate New Article',
    generating: 'Generating...',
    cancelBtn: 'Cancel',
    cancelling: 'Cancelling...',
    cancelled: 'Generation cancelled',
    backBtn: '← Back',
    nextBtn: 'Next',
    loadingText: 'Generating article...',
    errorText: 'Failed to generate article. Please try again.',
    emptyText: 'Tap button below to generate a new article',
    filterLabel: 'Category:',
    placeholderCategory: 'Enter custom topic...',
    copyArticle: 'Copy Article',
    jokeBtn: 'Fly Fishing Tip 🎣',
    categories: categories.en,
    categoryLabels: categoryLabels.en
  },
  zh: {
    title: 'HookedLee',
    subtitle: '一键生成文章-解锁各种飞钓技巧',
    generateBtn: '生成新文章',
    generating: '生成中...',
    cancelBtn: '取消',
    cancelling: '取消中...',
    cancelled: '已取消',
    backBtn: '← Back',
    nextBtn: 'Next',
    loadingText: '正在生成文章...',
    errorText: '生成文章失败，请重试',
    emptyText: '点击下方按钮生成新文章',
    filterLabel: '分类：',
    placeholderCategory: '输入自定义主题...',
    copyArticle: '复制文章',
    jokeBtn: '飞钓技巧 🎣',
    categories: categories.zh,
    categoryLabels: categoryLabels.zh
  }
}

Page({
  data: {
    cardData: null,
    loading: false,
    error: null,
    selectedCategory: 'all',
    customCategory: '',
    navigationHistory: [],
    currentArticleIndex: -1,
    hasPreviousArticle: false,
    hasNextArticle: false,
    language: 'en',
    uiText: {},
    loadingText: '',
    shouldCancel: false,
    showJoke: false,
    jokeText: ''
  },

  onLoad() {
    const app = getApp()
    const savedLanguage = app.globalData.language || 'en'
    
    const navigationHistory = wx.getStorageSync('navigationHistory') || []
    this.setData({
      language: savedLanguage,
      loadingText: i18n[savedLanguage].loadingText,
      navigationHistory: navigationHistory,
      currentArticleIndex: navigationHistory.length - 1
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

  cancelGeneration() {
    this.setData({
      shouldCancel: true,
      loading: false,
      loadingText: this.data.language === 'en' ? i18n[this.data.language].cancelled : i18n[this.data.language].cancelled
    })

    wx.showToast({
      title: this.data.language === 'en' ? i18n[this.data.language].cancelled : i18n[this.data.language].cancelled,
      icon: 'none',
      duration: 2000
    })
  },

  generateJoke() {
    console.log('[generateJoke] Loading fly fishing tips...')
    try {
      const tipsData = require('./fly-fishing-tips.js')
      const isEn = this.data.language === 'en'
      const tips = tipsData.tips || []
      console.log('[generateJoke] Loaded tips count:', tips.length)

      if (tips.length === 0) {
        console.error('[generateJoke] No tips found in data')
        this.setData({
          showJoke: true,
          jokeText: isEn ? 'No tips available' : '没有可用技巧'
        })
        return
      }

      const randomTip = tips[Math.floor(Math.random() * tips.length)]
      const tipText = isEn ? randomTip.en : randomTip.zh
      console.log('[generateJoke] Selected tip:', tipText.substring(0, 50) + '...')

      this.setData({
        showJoke: true,
        jokeText: tipText
      })
  } catch (error) {
    console.error('[generateJoke] Error loading tips:', error)
    const isEn = this.data.language === 'en'
    this.setData({
      showJoke: true,
      jokeText: isEn ? 'Error loading tips' : '加载技巧失败'
    })
  }
  },

  onCategoryInput(e) {
    const value = e.detail.value
    this.setData({
      customCategory: value,
      selectedCategory: value ? value : 'all'
    })
  },

  goBackToPrevious() {
    const { navigationHistory, currentArticleIndex } = this.data
    
    if (currentArticleIndex <= 0) {
      console.log('[Navigation] No previous articles')
      return
    }
    
    const prevIndex = currentArticleIndex - 1
    const prevArticle = navigationHistory[prevIndex]
    
    this.setData({
      cardData: prevArticle,
      currentArticleIndex: prevIndex,
      hasPreviousArticle: prevIndex > 0,
      hasNextArticle: navigationHistory.length > prevIndex
    })
  },

  goBackToNext() {
    const { navigationHistory, currentArticleIndex } = this.data
    
    if (currentArticleIndex >= navigationHistory.length - 1) {
      console.log('[Navigation] No next articles')
      return
    }
    
    const nextIndex = currentArticleIndex + 1
    const nextArticle = navigationHistory[nextIndex]
    
    this.setData({
      cardData: nextArticle,
      currentArticleIndex: nextIndex,
      hasPreviousArticle: nextIndex > 0,
      hasNextArticle: navigationHistory.length > nextIndex
    })
  },

  addToNavigationHistory(article) {
    const newNavigationHistory = [...this.data.navigationHistory, article]
    wx.setStorageSync('navigationHistory', newNavigationHistory)
  },

  async generateCard() {
    console.log('=== generateCard called ===')

    if (this.data.loading) {
      return
    }

    console.log('selectedCategory:', this.data.selectedCategory)
    const app = getApp()
    const apiKey = app.globalData.bigModelApiKey

    if (this.data.shouldCancel) {
      this.setData({
        shouldCancel: false
      })
      return
    }

    if (this.data.cardData) {
      this.addToNavigationHistory(this.data.cardData)
    }

    const isEn = this.data.language === 'en'
    const self = this

    // Set loading state to show progress UI
    this.setData({
      loading: true,
      error: null,
      showJoke: false,
      jokeText: '',
      loadingTitle: isEn ? 'Generating Your Article' : '正在生成您的文章',
      loadingStep: isEn ? 'Initializing...' : '初始化中...',
      loadingTip: isEn ? 'Starting generation process' : '正在启动生成流程',
      loadingDetail: ''
    })

    console.log('Generating article for category:', this.data.selectedCategory)

    try {
      const categoryToUse = this.data.customCategory ? this.data.customCategory : this.data.selectedCategory

      // STEP 1: Generate article outline (title + section summaries) - FAST!
      const outline = await generateArticleOutline(categoryToUse, apiKey, this.data.language, (progress) => {
        if (self.data.shouldCancel) return

        console.log('[Progress]', progress)

        self.setData({
          loadingStep: progress.message,
          loadingDetail: progress.detail
        })
      })

      if (this.data.shouldCancel) {
        return
      }

      // STEP 2: Expand sections AND generate images in PARALLEL - MUCH FASTER!
      self.setData({
        loadingStep: isEn ? 'Step 2 of 2: Parallel processing...' : '步骤 2/2：并行处理中...',
        loadingTip: isEn ? 'Expanding 5 sections + generating 6 images simultaneously' : '同时扩展 5 个章节 + 生成 6 张图片',
        loadingDetail: isEn ? 'Processing all sections in parallel...' : '正在并行处理所有章节...'
      })

      // Generate all section content and images in parallel
      const sectionPromises = outline.sections.map(async (section, index) => {
        // Expand section content
        const expandedSection = await expandSection(section, apiKey, self.data.language)

        // Generate section image
        let imageUrl = ''
        try {
          imageUrl = await generateImage(section.imagePrompt, apiKey)
          console.log(`[Section ${index + 1}] Content and image ready`)
        } catch (error) {
          console.error(`[Section ${index + 1}] Image generation failed:`, error)
        }

        return {
          ...expandedSection,
          imageUrl: imageUrl
        }
      })

      // Generate hero image in parallel with sections
      const heroImagePromise = generateHeroImage(outline.title, outline.originalCategory, apiKey)

      // Wait for all sections and hero image to complete
      const [paragraphs, heroImageUrl] = await Promise.all([
        Promise.all(sectionPromises),
        heroImagePromise
      ])

      if (self.data.shouldCancel) {
        return
      }

      // Update completion status
      self.setData({
        loadingDetail: isEn ? 'Assembling article...' : '正在组装文章...'
      })

      // Build the final article
      const cardData = {
        title: outline.title,
        paragraphs: paragraphs,
        references: outline.references || [],
        category: outline.category,
        imageUrl: heroImageUrl || '',
        source: 'Generated by AI',
        timestamp: new Date().toISOString()
      }

      if (!self.data.shouldCancel) {
        // Update navigation history
        self.addToNavigationHistory(cardData)
        self.setData({
          cardData: cardData
        })

        wx.showToast({
          title: this.data.language === 'en' ? 'Article generated!' : '文章已生成！',
          icon: 'success',
          duration: 2000
        })
      }
    } catch (err) {
      if (self.data.shouldCancel) {
        return
      }
      console.error('Generate card error:', err)
      self.setData({
        error: this.data.language === 'en' ? 'Failed to generate article. Please try again.' : '生成文章失败，请重试。'
      })
      wx.showToast({
        title: this.data.language === 'en' ? 'Error generating article' : '生成文章失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      self.setData({
        loading: false,
        shouldCancel: false
      })
    }
  },

  copyArticle() {
    if (!this.data.cardData) {
      return
    }

    const cardData = this.data.cardData
    let articleText = ''

    // Title and Category
    articleText += `${cardData.title}\n\nCategory: ${cardData.category}\n\n`

    // Main image URL
    if (cardData.imageUrl) {
      articleText += `Hero Image: ${cardData.imageUrl}\n\n`
    }

    // All paragraphs with their image URLs
    if (cardData.paragraphs && cardData.paragraphs.length > 0) {
      cardData.paragraphs.forEach((para, index) => {
        articleText += `--- Section ${index + 1} ---\n`
        articleText += `${para.intro}\n`

        // Paragraph image URL
        if (para.imageUrl) {
          articleText += `Image: ${para.imageUrl}\n`
        }

        // Sub-paragraphs
        if (para.subParagraphs && para.subParagraphs.length > 0) {
          para.subParagraphs.forEach(sub => {
            articleText += `• ${sub}\n`
          })
        }

        articleText += '\n'
      })
    }

    // References with URLs
    if (cardData.references && cardData.references.length > 0) {
      articleText += '--- References ---\n'
      cardData.references.forEach(ref => {
        articleText += `${ref.title}\n${ref.url}\n\n`
      })
    }

    // Source
    articleText += `\nGenerated by HookedLee`

    wx.setClipboardData({
      data: articleText,
      success: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'Article copied!' : '文章已复制！',
          icon: 'success',
          duration: 2000
        })
      },
      fail: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'Copy failed' : '复制失败',
          icon: 'none'
        })
      }
    })
  }
})
