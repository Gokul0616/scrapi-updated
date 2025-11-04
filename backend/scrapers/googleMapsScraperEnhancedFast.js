const browserManager = require('../utils/browserManager');

/**
 * Enhanced Fast Google Maps Scraper
 * Combines speed with comprehensive data extraction
 * - Extracts basic data from search results (fast)
 * - Visits individual pages ONLY for top N results (configurable)
 * - Uses modern selectors and direct URL navigation
 */
async function googleMapsScraperEnhancedFast(input) {
  const { query, location = 'United States', maxResults = 10, detailedResults = 5 } = input;
  
  if (!query) throw new Error('Query is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const searchQuery = `${query} ${location}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;
    const searchUrl = url;
    
    console.log(`🗺️  Navigating to Google Maps: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait for results feed to load
    await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll to load more results
    console.log('📜 Scrolling to load results...');
    await autoScroll(page, 3);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract basic data from search results
    console.log('⚡ Extracting basic data from search results...');
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
            if (text.match(/^\$+$/)) {
              price = text;
            } else if (text && !text.match(/\d+.*(?:St|Ave|Rd|Dr|Blvd)/i) && !price && categoryName === '') {
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
          
          if (placeUrl && !placeUrl.startsWith('http')) {
            placeUrl = `https://www.google.com${placeUrl}`;
          }
          
          let placeId = '';
          if (placeUrl) {
            const placeIdMatch = placeUrl.match(/!1s([^!]+)/);
            placeId = placeIdMatch ? placeIdMatch[1] : '';
          }
          
          results.push({
            title,
            categoryName,
            price,
            address,
            totalScore,
            reviewsCount,
            placeId,
            url: placeUrl,
            rank: i + 1
          });
          
        } catch (err) {
          console.error('Error extracting place:', err.message);
        }
      }
      
      return results;
    }, maxResults);
    
    console.log(`✅ Extracted ${places.length} places from search results`);
    
    // Now get detailed info for top N results
    const detailedCount = Math.min(detailedResults, places.length);
    console.log(`🔍 Getting detailed info for top ${detailedCount} results...`);
    
    for (let i = 0; i < detailedCount; i++) {
      try {
        const place = places[i];
        console.log(`📍 Details for ${i + 1}/${detailedCount}: ${place.title}`);
        
        if (!place.url) continue;
        
        // Navigate to place detail page
        await page.goto(place.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract detailed information
        const details = await page.evaluate(() => {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };
          
          const getAriaLabel = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute('aria-label') : '';
          };
          
          // Website
          let website = '';
          const websiteButton = document.querySelector('button[data-item-id="authority"]');
          if (websiteButton) {
            const link = websiteButton.querySelector('a[href]');
            if (link) website = link.getAttribute('href');
          }
          
          // Phone
          let phone = '';
          const phoneButton = document.querySelector('button[data-item-id="phone:tel:"]');
          if (phoneButton) {
            const phoneDiv = phoneButton.querySelector('div.fontBodyMedium');
            if (phoneDiv) phone = phoneDiv.textContent.trim();
          }
          
          // Address components
          let street = '', city = '', state = '', postalCode = '', countryCode = '';
          const addressButton = document.querySelector('button[data-item-id="address"]');
          if (addressButton) {
            const fullAddress = addressButton.querySelector('div.fontBodyMedium')?.textContent.trim() || '';
            const parts = fullAddress.split(',').map(p => p.trim());
            
            if (parts.length >= 1) street = parts[0];
            if (parts.length >= 2) city = parts[1];
            if (parts.length >= 3) {
              const stateZip = parts[2].split(' ');
              state = stateZip[0] || '';
              postalCode = stateZip[1] || '';
            }
            if (parts.length >= 4) countryCode = parts[3];
          }
          
          // Coordinates from URL
          let lat = null, lng = null;
          const currentUrl = window.location.href;
          const coordMatch1 = currentUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (coordMatch1) {
            lat = parseFloat(coordMatch1[1]);
            lng = parseFloat(coordMatch1[2]);
          }
          
          // Opening hours
          const openingHours = [];
          const hoursButton = document.querySelector('button[data-item-id*="hours"]');
          if (hoursButton) {
            const hoursTable = document.querySelector('table.eK4R0e');
            if (hoursTable) {
              const rows = hoursTable.querySelectorAll('tr');
              rows.forEach(row => {
                const day = row.querySelector('td:first-child')?.textContent.trim();
                const hours = row.querySelector('td:last-child')?.textContent.trim();
                if (day && hours) {
                  openingHours.push({ day, hours });
                }
              });
            }
          }
          
          // Additional info sections
          const additionalInfo = {};
          const sections = document.querySelectorAll('div.iP2t7d');
          sections.forEach(section => {
            const heading = section.querySelector('h2, h3');
            if (heading) {
              const sectionTitle = heading.textContent.trim();
              const items = [];
              
              section.querySelectorAll('li, div[role="img"]').forEach(item => {
                const text = item.getAttribute('aria-label') || item.textContent.trim();
                if (text && text.length > 0 && text.length < 100) {
                  items.push(text);
                }
              });
              
              if (items.length > 0) {
                additionalInfo[sectionTitle] = items;
              }
            }
          });
          
          // Status
          const permanentlyClosed = !!document.querySelector('[aria-label*="Permanently closed"]');
          const temporarilyClosed = !!document.querySelector('[aria-label*="Temporarily closed"]');
          
          return {
            website,
            phone,
            phoneUnformatted: phone.replace(/\D/g, ''),
            street,
            city,
            state,
            postalCode,
            countryCode,
            location: { lat, lng },
            openingHours,
            additionalInfo,
            permanentlyClosed,
            temporarilyClosed
          };
        });
        
        // Merge with basic info
        Object.assign(places[i], details);
        
      } catch (err) {
        console.error(`Error getting details for place ${i + 1}:`, err.message);
      }
    }
    
    // Add metadata to all results
    const finalResults = places.map((place, index) => ({
      ...place,
      scrapedAt: new Date().toISOString(),
      searchString: searchQuery,
      searchPageUrl: searchUrl,
      language: 'en',
      isAdvertisement: false,
      // Mark which ones have detailed data
      hasDetailedData: index < detailedCount
    }));
    
    await page.close();
    
    console.log(`✅ Scraping complete: ${finalResults.length} total, ${detailedCount} with detailed data`);
    
    return finalResults;
    
  } catch (error) {
    if (page) await page.close();
    console.error('Enhanced fast Google Maps scraping error:', error);
    throw new Error(`Failed to scrape Google Maps: ${error.message}`);
  }
}

// Helper function to scroll the feed
async function autoScroll(page, times = 3) {
  await page.evaluate(async (times) => {
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      for (let i = 0; i < times; i++) {
        feed.scrollTop = feed.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  }, times);
}

module.exports = googleMapsScraperEnhancedFast;
