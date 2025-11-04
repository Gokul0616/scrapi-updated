const axios = require('axios');
const cheerio = require('cheerio');

// Google Maps Scraper - Real data extraction
async function googleMapsScraper(input) {
  const { query, location = 'United States', maxResults = 20 } = input;
  
  if (!query) throw new Error('Query is required');
  
  try {
    // Use Google Maps search URL
    const searchQuery = encodeURIComponent(`${query} ${location}`);
    const url = `https://www.google.com/maps/search/${searchQuery}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const places = [];
    
    // Extract place data from Google Maps HTML
    // Google Maps is heavily JavaScript-based, so we get limited data from static HTML
    const pageTitle = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Try to extract any visible place data
    $('a[href*="/maps/place/"]').each((i, el) => {
      if (places.length >= maxResults) return false;
      
      const $el = $(el);
      const placeName = $el.text().trim();
      const placeUrl = $el.attr('href');
      
      if (placeName && placeName.length > 3) {
        places.push({
          name: placeName,
          url: placeUrl ? `https://www.google.com${placeUrl}` : '',
          query,
          location
        });
      }
    });
    
    // If we couldn't extract places from HTML, provide informative response
    if (places.length === 0) {
      return [{
        query,
        location,
        searchUrl: url,
        message: 'Google Maps requires browser automation for full data extraction. Static scraping provides limited results.',
        note: 'For comprehensive data, consider using Google Places API or browser automation with Puppeteer.',
        pageTitle,
        description,
        placesFound: 0,
        scrapedAt: new Date().toISOString()
      }];
    }
    
    return [{
      query,
      location,
      searchUrl: url,
      placesFound: places.length,
      places: places.slice(0, maxResults),
      message: 'Results extracted from public Google Maps data. For detailed information, use Google Places API.',
      scrapedAt: new Date().toISOString()
    }];
    
  } catch (error) {
    throw new Error(`Failed to scrape Google Maps: ${error.message}`);
  }
}

module.exports = googleMapsScraper;
