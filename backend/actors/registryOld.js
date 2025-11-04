// V2 scrapers with Puppeteer (comprehensive data)
const googleMapsScraperV2 = require('../scrapers/googleMapsScraperV2');
const amazonScraperV2 = require('../scrapers/amazonScraperV2');
const instagramScraperV2 = require('../scrapers/instagramScraperV2');
const twitterScraperV2 = require('../scrapers/twitterScraperV2');
const facebookScraperV2 = require('../scrapers/facebookScraperV2');
const linkedinScraperV2 = require('../scrapers/linkedinScraperV2');
const tiktokScraperV2 = require('../scrapers/tiktokScraperV2');
const websiteScraper = require('../scrapers/websiteScraper');

/**
 * Actor Registry - Define all public actors here
 * These will be auto-synced to database on backend startup
 */
const actorRegistry = [
  {
    actorId: 'google-maps',
    name: 'Google Maps Scraper',
    title: 'Google Maps Extractor',
    description: 'Extract data from thousands of Google Maps locations and businesses, including reviews, reviewer details, contact information, and more.',
    author: 'compass',
    slug: 'compass/crawler-google-places',
    category: 'SEO tools',
    icon: '🗺️',
    stats: { runs: 0, rating: 4.8, reviews: 377 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: googleMapsScraper
  },
  {
    actorId: 'amazon',
    name: 'Amazon Scraper',
    title: 'Amazon Product Scraper',
    description: 'Scrape Amazon products, prices, reviews, and ratings. Extract product data for price monitoring, competitor analysis, and market research.',
    author: 'junglee',
    slug: 'junglee/amazon-crawler',
    category: 'E-commerce',
    icon: '📦',
    stats: { runs: 0, rating: 4.6, reviews: 289 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: amazonScraper
  },
  {
    actorId: 'instagram',
    name: 'Instagram Scraper',
    title: 'Instagram Profile & Posts Scraper',
    description: 'Scrape and download Instagram posts, profiles, places, hashtags, photos, and comments. Get data from Instagram without any limits.',
    author: 'apify',
    slug: 'apify/instagram-scraper',
    category: 'Social media',
    icon: '📸',
    stats: { runs: 0, rating: 4.7, reviews: 512 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: instagramScraper
  },
  {
    actorId: 'website',
    name: 'Website Content Crawler',
    title: 'Universal Web Scraper',
    description: 'Crawl websites and extract text content to feed AI models, LLM applications, vector databases, or RAG pipelines. Supports custom selectors.',
    author: 'apify',
    slug: 'apify/website-content-crawler',
    category: 'AI',
    icon: '🌐',
    stats: { runs: 0, rating: 4.6, reviews: 100 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: websiteScraper
  },
  {
    actorId: 'tiktok',
    name: 'TikTok Scraper',
    title: 'TikTok Video & Profile Scraper',
    description: 'Extract data from TikTok videos, hashtags, and users. Use URLs or search queries to scrape TikTok without limits.',
    author: 'clockworks',
    slug: 'clockworks/tiktok-scraper',
    category: 'Social media',
    icon: '🎵',
    stats: { runs: 0, rating: 4.5, reviews: 84 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: tiktokScraper
  },
  {
    actorId: 'twitter',
    name: 'Tweet Scraper V2',
    title: 'X/Twitter Scraper',
    description: 'Lightning-fast search, URL, list, and profile scraping, with customizable filters. At $0.40 per 1000 tweets.',
    author: 'apidojo',
    slug: 'apidojo/tweet-scraper',
    category: 'Social media',
    icon: '🐦',
    stats: { runs: 0, rating: 4.9, reviews: 654 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: twitterScraper
  },
  {
    actorId: 'facebook',
    name: 'Facebook Posts Scraper',
    title: 'Facebook Data Extractor',
    description: 'Extract data from hundreds of Facebook posts from one or multiple Facebook pages and profiles.',
    author: 'apify',
    slug: 'apify/facebook-posts-scraper',
    category: 'Social media',
    icon: '📘',
    stats: { runs: 0, rating: 4.4, reviews: 221 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: facebookScraper
  },
  {
    actorId: 'linkedin',
    name: 'LinkedIn Profile Scraper',
    title: 'LinkedIn Data Extractor',
    description: 'Extract LinkedIn profile data including work experience, education, skills, and recommendations.',
    author: 'compass',
    slug: 'compass/linkedin-scraper',
    category: 'Lead generation',
    icon: '💼',
    stats: { runs: 0, rating: 4.7, reviews: 156 },
    pricingModel: 'Pay per event',
    isPublic: true,
    scraperFunction: linkedinScraper
  }
];

/**
 * Get scraper function by actorId
 */
function getScraperFunction(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.scraperFunction || null;
}

module.exports = {
  actorRegistry,
  getScraperFunction
};
