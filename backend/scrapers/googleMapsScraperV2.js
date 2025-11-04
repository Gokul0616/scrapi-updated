const browserManager = require('../utils/browserManager');

// Google Maps Scraper with Puppeteer - Real comprehensive data
async function googleMapsScraperV2(input) {
  const { query, location = 'United States', maxResults = 20 } = input;
  
  if (!query) throw new Error('Query is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const searchQuery = `${query} ${location}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load
    await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll to load more results
    await autoScroll(page);
    
    // Extract place data
    const places = await page.evaluate((maxResults) => {
      const results = [];
      const placeElements = document.querySelectorAll('div[role="feed"] > div > div[jsaction]');
      
      for (let i = 0; i < Math.min(placeElements.length, maxResults); i++) {
        const element = placeElements[i];
        
        try {
          // Basic info
          const titleEl = element.querySelector('div.fontHeadlineSmall');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Rating and reviews
          const ratingEl = element.querySelector('span[role="img"]');
          const ratingText = ratingEl ? ratingEl.getAttribute('aria-label') : '';
          const ratingMatch = ratingText.match(/(\\d+\\.\\d+)/);
          const totalScore = ratingMatch ? parseFloat(ratingMatch[1]) : null;
          
          const reviewsEl = element.querySelector('span[role="img"]')?.parentElement?.nextElementSibling;
          const reviewsText = reviewsEl ? reviewsEl.textContent : '';
          const reviewsMatch = reviewsText.match(/\\(([\\d,]+)\\)/);
          const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;
          
          // Category and price
          const detailsContainer = element.querySelector('div.fontBodyMedium');
          let categoryName = '';
          let price = '';
          
          if (detailsContainer) {
            const spans = detailsContainer.querySelectorAll('span');
            if (spans.length > 0) {
              categoryName = spans[0].textContent.trim();
            }
            if (spans.length > 1) {
              price = spans[1].textContent.trim();
            }
          }
          
          // Address
          const addressEls = element.querySelectorAll('div.fontBodyMedium span');
          let address = '';
          for (const el of addressEls) {
            const text = el.textContent.trim();
            if (text.match(/\\d+.*(?:St|Ave|Rd|Dr|Blvd|Street|Avenue|Road|Drive|Boulevard)/i)) {
              address = text;
              break;
            }
          }
          
          // Place URL and ID
          const linkEl = element.querySelector('a[href*=\"/maps/place/\"]');
          const placeUrl = linkEl ? linkEl.getAttribute('href') : '';
          const placeIdMatch = placeUrl.match(/!1s([^!]+)/);
          const placeId = placeIdMatch ? placeIdMatch[1] : '';
          
          if (title) {
            results.push({
              title,
              categoryName,
              price,
              address,
              totalScore,
              reviewsCount,
              placeId,
              url: placeUrl ? `https://www.google.com${placeUrl}` : '',
              scrapedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error extracting place:', err);
        }
      }
      
      return results;
    }, maxResults);
    
    console.log(`Extracted ${places.length} places from search results`);
    
    // If we have places, try to get detailed info for each
    const detailedPlaces = [];
    for (let i = 0; i < Math.min(places.length, 5); i++) {
      try {
        const place = places[i];
        if (place.placeId) {
          const detailUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
          await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const details = await extractPlaceDetails(page);
          detailedPlaces.push({ ...place, ...details });
        } else {
          detailedPlaces.push(place);
        }
      } catch (err) {
        console.error('Error getting place details:', err);
        detailedPlaces.push(places[i]);
      }
    }
    
    // Add remaining places without detailed info
    detailedPlaces.push(...places.slice(detailedPlaces.length));
    
    await page.close();
    return detailedPlaces;
    
  } catch (error) {
    if (page) await page.close();
    console.error('Google Maps scraping error:', error);
    throw new Error(`Failed to scrape Google Maps: ${error.message}`);
  }
}

// Helper function to scroll and load more results
async function autoScroll(page) {
  await page.evaluate(async () => {
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      for (let i = 0; i < 3; i++) {
        feed.scrollTop = feed.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });
}

// Helper function to extract detailed place information
async function extractPlaceDetails(page) {
  return await page.evaluate(() => {
    const details = {};
    
    try {
      // Phone
      const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
      if (phoneBtn) {
        const phoneText = phoneBtn.getAttribute('aria-label');
        const phoneMatch = phoneText?.match(/[\d\s\(\)-]+/);
        details.phone = phoneMatch ? phoneMatch[0].trim() : '';
      }
      
      // Website
      const websiteLink = document.querySelector('a[data-item-id*="authority"]');
      details.website = websiteLink ? websiteLink.getAttribute('href') : '';
      
      // Full address
      const addressBtn = document.querySelector('button[data-item-id*="address"]');
      if (addressBtn) {
        details.address = addressBtn.getAttribute('aria-label')?.replace('Address: ', '') || details.address;
      }
      
      // Opening hours
      const hoursBtn = document.querySelector('button[data-item-id*="oh"]');
      if (hoursBtn) {
        const hoursText = hoursBtn.getAttribute('aria-label');
        details.openingHours = hoursText || '';
      }
      
      // Additional info sections
      const sections = document.querySelectorAll('div[class*="section"]');
      const additionalInfo = {};
      
      sections.forEach(section => {
        const heading = section.querySelector('h2, h3');
        if (heading) {
          const title = heading.textContent.trim();
          const items = [];
          section.querySelectorAll('li, div[role="listitem"]').forEach(item => {
            items.push(item.textContent.trim());
          });
          if (items.length > 0) {
            additionalInfo[title] = items;
          }
        }
      });
      
      if (Object.keys(additionalInfo).length > 0) {
        details.additionalInfo = additionalInfo;
      }
      
    } catch (err) {
      console.error('Error extracting details:', err);
    }
    
    return details;
  });
}

module.exports = googleMapsScraperV2;
