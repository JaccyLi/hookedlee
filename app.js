App({
  globalData: {
    // SECURITY: API keys should be managed by a backend proxy server
    // TODO: Implement backend API endpoint that handles AI model requests
    // Current implementation uses client-side storage (not secure for production)
    bigModelApiKey: '', // Set via wx.setStorageSync('bigModelApiKey')
    deepseekApiKey: '', // Set via wx.setStorageSync('deepseekApiKey')
    selectedModel: 'default', // Options: 'default' (smart mode) or 'deepseek-reasoner' (high quality mode)
    language: 'zh',
    debugMode: false, // Set to true for development, false for production

    // API configuration for backend migration
    apiConfig: {
      useBackendProxy: true, // Backend proxy enabled
      backendUrl: 'https://suosuoli.com' // Production backend URL (standard HTTPS port 443)
    },

    // Multi-key load balancing info (fetched from backend)
    bigModelKeyCount: 0 // Number of BigModel API keys available for rotation
  },

  onLaunch() {
    // Load saved settings
    const savedModel = wx.getStorageSync('selectedModel')
    if (savedModel) {
      this.globalData.selectedModel = savedModel
    }

    // Load API keys from storage (priority: storage > globalData default)
    const savedDeepseekKey = wx.getStorageSync('deepseekApiKey')
    if (savedDeepseekKey) {
      this.globalData.deepseekApiKey = savedDeepseekKey
    }

    const customGlmKey = wx.getStorageSync('customGlmApiKey')
    if (customGlmKey) {
      this.globalData.bigModelApiKey = customGlmKey
    }

    const savedDebugMode = wx.getStorageSync('debugMode')
    if (savedDebugMode !== undefined && savedDebugMode !== null) {
      this.globalData.debugMode = savedDebugMode
    }

    // Initialize backend URL in storage for backend-client
    // Only save to storage if not already set (don't override user's custom setting)
    const savedBackendUrl = wx.getStorageSync('backendUrl')
    if (!savedBackendUrl && this.globalData.apiConfig.backendUrl) {
      wx.setStorageSync('backendUrl', this.globalData.apiConfig.backendUrl)
    }

    // Fetch backend configuration (multi-key count, available models, etc.)
    this.fetchBackendConfig()
  },

  /**
   * Fetch backend configuration including available models and API key count
   */
  fetchBackendConfig() {
    const backendUrl = this.globalData.apiConfig.backendUrl

    wx.request({
      url: `${backendUrl}/api/models`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          // Store BigModel key count for multi-key rotation info
          if (res.data.bigmodelKeyCount !== undefined) {
            this.globalData.bigModelKeyCount = res.data.bigmodelKeyCount
            console.log('[App] Backend loaded:', res.data.bigmodelKeyCount, 'BigModel key(s)')
          }
        }
      },
      fail: (err) => {
        console.error('[App] Failed to fetch backend config:', err)
        // Continue with defaults - not critical error
      }
    })
  }
})
