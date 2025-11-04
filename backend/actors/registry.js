// Google Maps Ultimate Scraper - 40+ fields, parallel enrichment, website scraping
const googleMapsUltimate = require('../scrapers/googleMapsUltimate');

/**
 * Actor Registry - Define all public actors with field schemas
 * inputFields: Defines the input form fields for the frontend (DYNAMIC FIELDS)
 * outputFields: Defines the expected output schema (for documentation)
 */
const actorRegistry = [
  {
    actorId: 'google-maps',
    name: 'Google Maps Scraper',
    title: 'Google Maps Ultimate Extractor',
    description: '🚀 ULTIMATE Google Maps scraper with 40+ fields! Extracts: business info, contact details, social media, emails, opening hours, popular times, photos, reviews, owner responses, and more. Parallel processing for speed. Website enrichment for emails & social profiles. Professional-grade data extraction.',
    author: 'compass',
    slug: 'compass/ultimate-google-maps',
    category: 'SEO tools',
    icon: '🗺️',
    stats: { runs: 0, rating: 4.9, reviews: 500 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: googleMapsUltimate,
    inputFields: [
      {
        key: 'query',
        label: 'Search Query',
        type: 'text',
        required: true,
        placeholder: 'e.g., pizza restaurants, coffee shops, dentists',
        description: 'What to search for on Google Maps'
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        required: false,
        placeholder: 'e.g., New York, USA or Brooklyn, NY',
        default: 'United States',
        description: 'Geographic location to search in'
      },
      {
        key: 'maxResults',
        label: 'Maximum Results',
        type: 'number',
        required: false,
        placeholder: '20',
        default: 20,
        description: 'Total number of places to scrape (1-100). Each result includes full enrichment.'
      }
    ],
    outputFields: [
      'name', 'rating', 'reviewsCount', 'mainCategory', 'categories', 'priceLevel', 'verified',
      'fullAddress', 'street', 'city', 'state', 'zip', 'country', 
      'phone', 'phoneType', 'website', 'hasWebsite',
      'openingHours', 'liveStatus', 
      'photoCount', 'photos', 'ownerResponses', 'popularTimes',
      'services', 'additionalInfo', 'accessibility',
      'menuUrl', 'reservationUrl', 'bookingOptions',
      'location', 'placeId', 'cid',
      'emails', 'emailValid', 'social', 'hasSocialMedia', 'structuredData',
      'about', 'founder', 'yearFounded',
      'aiSummary', 'searchQuery', 'searchRank', 'placeUrl', 'hasDetailedData'
    ]
  }
];

/**
 * Get scraper function by actorId
 */
function getScraperFunction(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.scraperFunction || null;
}

/**
 * Get input field schema by actorId
 */
function getInputFields(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.inputFields || [];
}

/**
 * Get output field schema by actorId
 */
function getOutputFields(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.outputFields || [];
}

module.exports = {
  actorRegistry,
  getScraperFunction,
  getInputFields,
  getOutputFields
};
