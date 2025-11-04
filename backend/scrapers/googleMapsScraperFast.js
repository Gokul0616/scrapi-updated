const browserManager = require('../utils/browserManager');

/**
 * Fast Google Maps Scraper - Extracts data from search results ONLY
 * Does NOT visit individual business pages for maximum speed
 * Perfect for getting quick results with basic information
 */
async function googleMapsScraperFast(input) {
  const { query, location = 'United States', maxResults = 10 } = input;
  
  if (!query) throw new Error('Query is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const searchQuery = `${query} ${location}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;
    
    console.log(`🗺️  Fast scraping Google Maps: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait for results feed to load
    await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll to load more results (quick scroll)
    console.log('📜 Loading results...');
    await page.evaluate(async () => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        for (let i = 0; i < 2; i++) {
          feed.scrollTop = feed.scrollHeight;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract ALL data from search results page (no individual visits)
    console.log('⚡ Extracting data from search results...');
    const places = await page.evaluate((maxResults) => {
      const results = [];
      const placeElements = document.querySelectorAll('div[role="feed"] > div > div[jsaction]');
      
      console.log(`Found ${placeElements.length} place elements`);
      
      for (let i = 0; i < Math.min(placeElements.length, maxResults); i++) {
        const element = placeElements[i];
        
        try {
          // Title
          const titleEl = element.querySelector('div.fontHeadlineSmall, a.hfpxzc');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          if (!title) continue;
          
          // Rating and reviews
          const ratingEl = element.querySelector('span[role="img"][aria-label*="star"]');
          const ratingText = ratingEl ? ratingEl.getAttribute('aria-label') : '';
          const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
          const totalScore = ratingMatch ? parseFloat(ratingMatch[1]) : null;
          
          const reviewsEl = ratingEl?.parentElement?.parentElement?.querySelector('span[aria-label]');
          const reviewsText = reviewsEl ? reviewsEl.getAttribute('aria-label') : '';
          const reviewsMatch = reviewsText.match(/(\d+)/);
          const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;
          
          // Category and price
          const fontBodyElements = element.querySelectorAll('div.fontBodyMedium');
          let categoryName = '';
          let price = '';
          
          for (const el of fontBodyElements) {
            const text = el.textContent.trim();
            
            // Price detection
            if (text.match(/^\$+$/)) {
              price = text;
            }
            // Category detection (not an address)
            else if (text && !text.match(/\d+.*(?:St|Ave|Rd|Dr|Blvd|Street|Avenue|Road|Drive|Boulevard)/i) && !price && categoryName === '') {
              categoryName = text.split('·')[0].trim();
            }
          }
          
          // Address
          let address = '';
          const addressSpans = element.querySelectorAll('div.fontBodyMedium span, div.fontBodyMedium');
          for (const el of addressSpans) {
            const text = el.textContent.trim();
            if (text.match(/\d+.*(?:St|Ave|Rd|Dr|Blvd|Street|Avenue|Road|Drive|Boulevard|Lane|Way|Court|Place|Circle)/i)) {
              address = text;
              break;
            }
          }
          
          // Place URL and ID
          const linkEl = element.querySelector('a[href*="/maps/place/"]');
          let placeUrl = linkEl ? linkEl.getAttribute('href') : '';
          
          // Make full URL if relative
          if (placeUrl && !placeUrl.startsWith('http')) {
            placeUrl = `https://www.google.com${placeUrl}`;
          }
          
          // Extract place ID from URL
          let placeId = '';
          if (placeUrl) {
            const placeIdMatch = placeUrl.match(/!1s([^!]+)/);
            placeId = placeIdMatch ? placeIdMatch[1] : '';
          }
          
          // Phone (if visible in preview)
          let phone = '';
          const phoneEls = element.querySelectorAll('span[aria-label*="Phone"]');
          if (phoneEls.length > 0) {
            phone = phoneEls[0].getAttribute('aria-label').replace('Phone: ', '');
          }
          
          // Opening hours status
          let openingHoursStatus = '';
          const hoursEl = element.querySelector('span[aria-label*="Open"], span[aria-label*="Closed"]');
          if (hoursEl) {
            openingHoursStatus = hoursEl.getAttribute('aria-label');
          }
          
          results.push({
            title,
            categoryName,
            price,
            address,
            phone,
            totalScore,
            reviewsCount,
            placeId,
            url: placeUrl,
            openingHoursStatus,
            scrapedAt: new Date().toISOString(),
            rank: i + 1
          });
          
        } catch (err) {
          console.error('Error extracting place:', err.message);
        }
      }
      
      return results;
    }, maxResults);
    
    await page.close();
    
    console.log(`✅ Fast extraction complete: ${places.length} places`);
    
    // Return just the array of places (consistent with other scrapers)
    return places;
    
  } catch (error) {
    if (page) await page.close();
    console.error('Fast Google Maps scraping error:', error);
    throw new Error(`Failed to scrape Google Maps: ${error.message}`);
  }
}

module.exports = googleMapsScraperFast;
