const HF_API_URL = 'https://api-inference.huggingface.co/models/'

const MODELS = {
  'stable-diffusion': 'stabilityai/stable-diffusion-xl-base-1.0',
  'dreamlike': 'dreamlike-art/dreamlike-photoreal-2.0',
  'playground': 'playgroundai/playground-v2.5-1024px-aesthetic',
  'openjourney': 'prompthero/openjourney-v4'
}

const DEFAULT_MODEL = MODELS['dreamlike']

function generateFlyFishingImage(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const modelId = prompt.toLowerCase().includes('fish') ?
      MODELS['dreamlike'] : DEFAULT_MODEL

    const requestPayload = {
      inputs: `${prompt}. Professional fly fishing photography, high quality, natural lighting, detailed`,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly, cartoon',
        num_inference_steps: 30,
        guidance_scale: 7.5
      }
    }

    wx.request({
      url: `${HF_API_URL}${modelId}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: requestPayload,
      responseType: 'arraybuffer',
      timeout: 60000,
      success: (response) => {
        if (response.statusCode === 200) {
          try {
            const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_image_${Date.now()}.jpg`
            const fsm = wx.getFileSystemManager()

            fsm.writeFileSync(tempFilePath, response.data, 'binary')

            resolve(tempFilePath)
          } catch (error) {
            reject(new Error(`Failed to process image: ${error.message}`))
          }
        } else {
          reject(new Error(`API returned status ${response.statusCode}`))
        }
      },
      fail: (error) => {
        reject(new Error(`API request failed: ${error.errMsg || 'Network error'}`))
      }
    })
  })
}

function generateImagePrompt(category, title) {
  const categoryKeywords = {
    'fly tying': ['fly tying', 'feathers', 'vise', 'detailed flies', 'macro photography'],
    'fly casting': ['fly casting', 'rod bending', 'line in air', 'casting action', 'river scene'],
    'biology': ['trout swimming', 'underwater', 'fish habitat', 'aquatic insects', 'stream life'],
    'gear': ['fishing gear', 'rods and reels', 'wading boots', 'fly box', 'equipment'],
    'all': ['fly fishing', 'river fishing', 'trout stream', 'peaceful fishing scene', 'mountain river']
  }

  const keywords = categoryKeywords[category] || categoryKeywords['all']
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)]

  return `Fly fishing scene showing ${randomKeyword}. ${title.substring(0, 50)}`
}

module.exports = {
  generateFlyFishingImage,
  generateImagePrompt,
  MODELS
}
