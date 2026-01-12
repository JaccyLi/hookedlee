const RSS2JSON_URL = 'https://api.rss2json.com/v1/api.json'

const RSS_FEEDS = {
  'midcurrent': 'https://midcurrent.com/news/feed',
  'orvis': 'https://news.orvis.com/fly-fishing/feed',
  'troutunlimited': 'https://www.tu.org/magazine/feed',
  'flyfishfood': 'http://www.flyfishfood.com/feeds/posts/default?alt=rss',
  'ginkandgasoline': 'https://www.ginkandgasoline.com/feed/',
  'hatchmag': 'https://www.hatchmag.com/blog/feed',
  'oregonflyfishing': 'https://oregonflyfishingblog.com/feed',
  'duranglers': 'https://duranglers.com/feed'
}

function fetchRandomArticle(category, language) {
  return new Promise((resolve, reject) => {
    let feedsToTry = []

    if (category === 'all' || category === 'random') {
      feedsToTry = Object.values(RSS_FEEDS)
    } else {
      const categoryFeeds = {
        'fly tying': ['ginkandgasoline', 'flyfishfood', 'hatchmag'],
        'fly casting': ['midcurrent', 'oregonflyfishingblog', 'duranglers'],
        'anglingbio': ['troutunlimited', 'midcurrent', 'orvis'],
        'gear': ['orvis', 'flyfishfood', 'troutunlimited']
      }
      feedsToTry = categoryFeeds[category] || Object.values(RSS_FEEDS)
    }

    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }

    const shuffledFeeds = shuffleArray(feedsToTry)

    const tryFetchFromFeeds = (index) => {
      if (index >= shuffledFeeds.length) {
        reject(new Error('Failed to fetch article from any feed'))
        return
      }

      const feedUrl = shuffledFeeds[index]
      const encodedFeedUrl = encodeURIComponent(feedUrl)

      wx.request({
        url: `${RSS2JSON_URL}?rss_url=${encodedFeedUrl}`,
        method: 'GET',
        timeout: 15000,
        success: (response) => {
          if (response.statusCode === 200 && response.data && response.data.status === 'ok') {
            const items = response.data.items

            if (items && items.length > 0) {
              const randomIndex = Math.floor(Math.random() * items.length)
              const item = items[randomIndex]

              const article = {
                title: item.title || 'Fly Fishing Article',
                summary: extractSummary(item),
                content: extractContent(item),
                image: extractImage(item),
                link: item.link,
                pubDate: item.pubDate,
                source: extractSource(feedUrl),
                language: language
              }

              resolve(article)
            } else {
              tryFetchFromFeeds(index + 1)
            }
          } else {
            tryFetchFromFeeds(index + 1)
          }
        },
        fail: (error) => {
          console.error('RSS fetch error:', error, 'Feed:', feedUrl)
          tryFetchFromFeeds(index + 1)
        }
      })
    }

    tryFetchFromFeeds(0)
  })
}

function extractSummary(item) {
  const content = item.description || item.content || ''

  const plainText = cleanHtml(content)

  const sentences = plainText.split(/[.!?]+/)
  const summary = sentences.slice(0, 3).join('.').trim()

  return summary.length > 150 ? summary.substring(0, 250) + '...' : (summary + '...')
}

function extractContent(item) {
  if (item.content && item.content.length > 100) {
    return item.content
  }

  if (item.description && item.description.length > 100) {
    return item.description
  }

  return '<p>A comprehensive article about fly fishing techniques, tips, and advice.</p>'
}

function extractImage(item) {
  const content = item.content || item.description || ''

  const imgRegex = /<img[^>]+src=['"]([^'"]+)['"][^>]*>/gi
  const matches = content.match(imgRegex)

  if (matches && matches.length > 0) {
    const srcMatch = matches[0].match(/src=['"]([^'"]+)['"]/i)
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1]
    }
  }

  const enclosure = item.enclosure
  if (enclosure && (enclosure.type || '').startsWith('image/')) {
    return enclosure.url
  }

  const thumbnail = item.thumbnail
  if (thumbnail) {
    return thumbnail
  }

  return null
}

function cleanHtml(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSource(feedUrl) {
  const sourceMap = {
    'midcurrent.com': 'MidCurrent',
    'orvis.com': 'Orvis',
    'tu.org': 'Trout Unlimited',
    'flyfishfood.com': 'Fly Fish Food',
    'ginkandgasoline.com': 'Gink & Gasoline',
    'hatchmag.com': 'Hatch Magazine',
    'oregonflyfishingblog.com': 'Oregon Fly Fishing Blog',
    'duranglers.com': 'Duranglers'
  }

  for (const [domain, name] of Object.entries(sourceMap)) {
    if (feedUrl.includes(domain)) {
      return name
    }
  }

  return 'Fly Fishing'
}

module.exports = {
  fetchRandomArticle,
  RSS_FEEDS
}
