const browserManager = require('../utils/browserManager');

/**
 * Enhanced Google Maps Scraper - Apify-style comprehensive data extraction
 * Extracts 50+ fields including detailed additionalInfo, accessibility, amenities,
 * service options, and social media links from business websites
 */
async function googleMapsScraperEnhanced(input) {
  const { query, location = 'United States', maxResults = 5 } = input;
  
  if (!query) throw new Error('Query is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const searchQuery = `${query} ${location}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;
    
    console.log(`🗺️  Navigating to Google Maps: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    
    // Wait for results feed to load
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll to load more results
    console.log('📜 Scrolling to load more results...');
    await autoScroll(page, 5);
    
    // Get place links from search results
    // IMPORTANT: We need to click on each result to get the full detail page URL
    const placeLinks = await page.evaluate((maxResults) => {
      const links = [];
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return links;
      
      // Find all clickable place elements in the feed
      const placeElements = feed.querySelectorAll('a[href*="/maps/place/"]');
      
      for (let i = 0; i < Math.min(placeElements.length, maxResults); i++) {
        const element = placeElements[i];
        const href = element.getAttribute('href');
        
        if (href && href.includes('/maps/place/')) {
          // Convert relative URLs to absolute
          const absoluteUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
          
          // Only add if it's a proper place URL (not just search)
          if (absoluteUrl.includes('/maps/place/') && !absoluteUrl.includes('/search/')) {
            links.push(absoluteUrl);
          }
        }
      }
      
      return links;
    }, maxResults);
    
    console.log(`✅ Found ${placeLinks.length} place links`);
    
    console.log(`✅ Found ${placeLinks.length} places. Extracting comprehensive data...`);
    
    // Extract detailed data for each place
    const places = [];
    for (let i = 0; i < placeLinks.length; i++) {
      try {
        console.log(`📍 Extracting place ${i + 1}/${placeLinks.length}...`);
        const placeUrl = placeLinks[i];
        
        console.log(`   URL: ${placeUrl}`);
        
        const placeData = await extractComprehensivePlaceDetails(page, placeUrl, query, location, i + 1);
        if (placeData) {
          places.push(placeData);
          console.log(`   ✅ Successfully extracted: ${placeData.title || 'Unknown'}`);
        } else {
          console.log(`   ⚠️  No data extracted for this place`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      } catch (err) {
        console.error(`❌ Error extracting place ${i + 1}:`, err.message);
      }
    }
    
    await page.close();
    console.log(`✅ Successfully extracted ${places.length} places with comprehensive data`);
    return places;
    
  } catch (error) {
    if (page) await page.close();
    console.error('❌ Google Maps scraping error:', error);
    throw new Error(`Failed to scrape Google Maps: ${error.message}`);
  }
}

/**
 * Extract comprehensive details for a single place (Apify-style)
 */
async function extractComprehensivePlaceDetails(page, placeUrl, searchQuery, searchLocation, rank) {
  try {
    console.log(`   🌐 Navigating to: ${placeUrl}`);
    await page.goto(placeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the page to fully load - look for business name heading
    await page.waitForSelector('h1', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify we're on a business detail page by checking for h1
    const hasBusinessName = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent.trim().length > 0;
    });
    
    if (!hasBusinessName) {
      console.log('   ⚠️  Not a valid business detail page (no h1 found)');
      return null;
    }
    
    console.log('   ✅ Valid business detail page detected');
    
    // Scroll down to load all sections
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('div[role="main"]') || document.body;
      scrollContainer.scrollTo(0, scrollContainer.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Try to click "More" buttons to expand sections
    await expandAllSections(page);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract all data from the page using aria-labels (2025 stable selectors)
    const placeData = await page.evaluate((rank) => {
      const data = {
        rank: rank,
        scrapedAt: new Date().toISOString(),
        language: 'en'
      };
      
      // Helper function to get text content safely
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };
      
      // Helper function to get attribute safely
      const getAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };
      
      // Helper function to extract from aria-label (2025 format: "Label: value")
      const getAriaLabel = (partialLabel) => {
        const el = document.querySelector(`[aria-label*="${partialLabel}:"]`);
        if (!el) return null;
        const label = el.getAttribute('aria-label');
        // Split by the label and colon, take the part after
        const parts = label.split(partialLabel + ':');
        return parts.length > 1 ? parts[1].trim() : null;
      };
      
      // === BASIC INFO ===
      // Title extraction - 2025 method: h1 is the primary heading for business name
      const h1Element = document.querySelector('h1');
      data.title = h1Element ? h1Element.textContent.trim() : '';
      
      // Debug: Log what h1 we found
      console.log('[DEBUG] Title from h1:', data.title);
      
      // Validate title - it should not be a generic word like "Hours", "Menu", etc.
      const genericTitles = ['hours', 'menu', 'about', 'reviews', 'photos', 'overview'];
      if (data.title && genericTitles.includes(data.title.toLowerCase())) {
        console.log('[DEBUG] Found generic title, searching for alternative...');
        // Try to find title from meta tags or other sources
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
          data.title = metaTitle.getAttribute('content').trim();
          console.log('[DEBUG] Title from meta tag:', data.title);
        }
      }
      
      // Category - try multiple approaches
      const categoryButton = document.querySelector('button[jsaction*="category"]');
      data.categoryName = categoryButton ? categoryButton.textContent.trim() : '';
      
      // If no category found, try aria-label approach
      if (!data.categoryName) {
        const catEl = document.querySelector('[aria-label*="Type:"], [aria-label*="Category:"]');
        if (catEl) {
          const catLabel = catEl.getAttribute('aria-label');
          data.categoryName = catLabel.replace(/^(Type|Category):\s*/i, '').trim();
        }
      }
      
      data.categories = data.categoryName ? [data.categoryName] : [];
      
      // Price Range - use aria-label
      let priceText = getAriaLabel('Price');
      if (!priceText) {
        const priceEl = document.querySelector('span[aria-label*="Price"], span[aria-label*="price"]');
        if (priceEl) {
          priceText = priceEl.getAttribute('aria-label').replace(/Price:?\\s*/i, '');
        }
      }
      data.price = priceText || '';
      
      // === RATINGS & REVIEWS ===
      // Extract rating from aria-label (e.g., "4.8 stars")
      const starsEl = document.querySelector('[aria-label*="stars"]');
      if (starsEl) {
        const starsLabel = starsEl.getAttribute('aria-label');
        const starsMatch = starsLabel.match(/([\d.]+)\s*stars?/i);
        data.totalScore = starsMatch ? parseFloat(starsMatch[1]) : null;
      } else {
        // Fallback to old method
        const ratingText = getText('div.F7nice span[aria-hidden="true"]') || getText('span[aria-hidden="true"]');
        data.totalScore = ratingText ? parseFloat(ratingText) : null;
      }
      
      // Extract reviews count from aria-label
      const reviewsEl = document.querySelector('[aria-label*="reviews"]');
      if (reviewsEl) {
        const reviewsLabel = reviewsEl.getAttribute('aria-label');
        const reviewsMatch = reviewsLabel.match(/([\\d,]+)\\s+reviews?/i);
        data.reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;
      } else {
        data.reviewsCount = 0;
      }
      
      // === ADDRESS & LOCATION ===
      // Enhanced address extraction with multiple methods
      let fullAddress = null;
      
      // Method 1: Look for button with address data attribute
      const addressButton = document.querySelector('button[data-item-id="address"]');
      if (addressButton) {
        // Get the text from the div inside the button
        const addressDiv = addressButton.querySelector('div[class*="fontBodyMedium"]');
        if (addressDiv) {
          fullAddress = addressDiv.textContent.trim();
          console.log('[DEBUG] Address from button[data-item-id="address"]:', fullAddress);
        }
      }
      
      // Method 2: Use aria-label if button method failed
      if (!fullAddress) {
        const addressWithLabel = document.querySelector('[aria-label*="Address:"]');
        if (addressWithLabel) {
          const ariaLabel = addressWithLabel.getAttribute('aria-label');
          fullAddress = ariaLabel.split('Address:')[1]?.trim();
          console.log('[DEBUG] Address from aria-label:', fullAddress);
        }
      }
      
      // Method 3: Look for specific class patterns used in 2025
      if (!fullAddress) {
        const addressElements = document.querySelectorAll('[class*="address"], [data-tooltip*="address"]');
        for (const el of addressElements) {
          const text = el.textContent.trim();
          // Check if it looks like an address (has numbers and street indicators)
          if (text && text.length > 10 && /\d+/.test(text) && (text.includes(',') || text.includes('St') || text.includes('Ave') || text.includes('Rd'))) {
            fullAddress = text;
            console.log('[DEBUG] Address from class pattern:', fullAddress);
            break;
          }
        }
      }
      
      data.address = fullAddress || '';
      
      // Parse address components
      if (fullAddress) {
        const addressParts = fullAddress.split(',').map(p => p.trim());
        if (addressParts.length >= 3) {
          data.street = addressParts[0] || '';
          data.city = addressParts[1] || '';
          const stateZip = addressParts[2] || '';
          const stateZipMatch = stateZip.match(/([A-Z]{2})\\s*(\\d{5})/);
          if (stateZipMatch) {
            data.state = stateZipMatch[1];
            data.postalCode = stateZipMatch[2];
          }
          data.countryCode = 'US';
        }
        
        data.neighborhood = addressParts.length > 3 ? addressParts[1] : data.city;
      }
      
      // Coordinates - Enhanced extraction with better methods
      let coords = null;
      
      // Method 1: From URL - most reliable
      const urlStr = window.location.href;
      console.log('[DEBUG] Extracting coordinates from URL:', urlStr);
      
      // Pattern: @lat,lng,zoom or !3d-lat!4dlng
      const coordPattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const coordPattern2 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
      
      const match1 = urlStr.match(coordPattern1);
      const match2 = urlStr.match(coordPattern2);
      
      if (match1) {
        coords = { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
        console.log('[DEBUG] Coordinates from pattern 1:', coords);
      } else if (match2) {
        coords = { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
        console.log('[DEBUG] Coordinates from pattern 2:', coords);
      }
      
      // Method 2: Extract from any script tags or data attributes
      if (!coords) {
        console.log('[DEBUG] Trying to find coordinates in page data...');
        
        // Look for coordinate data in various places
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent;
          if (content && content.includes('coordinates')) {
            const coordMatch = content.match(/["']?coordinates["']?\s*:\s*\[?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
            if (coordMatch) {
              coords = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
              console.log('[DEBUG] Coordinates from script:', coords);
              break;
            }
          }
        }
      }
      
      // Method 3: Look for data-* attributes
      if (!coords) {
        const allElements = document.querySelectorAll('[data-lat], [data-latitude]');
        for (const el of allElements) {
          const lat = el.getAttribute('data-lat') || el.getAttribute('data-latitude');
          const lng = el.getAttribute('data-lng') || el.getAttribute('data-longitude') || el.getAttribute('data-lon');
          if (lat && lng) {
            coords = { lat: parseFloat(lat), lng: parseFloat(lng) };
            console.log('[DEBUG] Coordinates from data attributes:', coords);
            break;
          }
        }
      }
      
      data.location = coords;
      
      // === CONTACT INFO ===
      // Phone - Enhanced extraction with multiple methods
      let phoneText = null;
      
      // Method 1: Look for button with phone data attribute (most reliable)
      const phoneButton = document.querySelector('button[data-item-id="phone"]');
      if (phoneButton) {
        const phoneDiv = phoneButton.querySelector('div[class*="fontBodyMedium"]');
        if (phoneDiv) {
          phoneText = phoneDiv.textContent.trim();
          console.log('[DEBUG] Phone from button[data-item-id="phone"]:', phoneText);
        }
      }
      
      // Method 2: Look for aria-label with phone
      if (!phoneText) {
        const phoneWithLabel = document.querySelector('[aria-label*="Phone:"]');
        if (phoneWithLabel) {
          const ariaLabel = phoneWithLabel.getAttribute('aria-label');
          phoneText = ariaLabel.split('Phone:')[1]?.trim();
          console.log('[DEBUG] Phone from aria-label:', phoneText);
        }
      }
      
      // Method 3: Look for tel: links
      if (!phoneText) {
        const telLink = document.querySelector('a[href^="tel:"]');
        if (telLink) {
          phoneText = telLink.textContent.trim();
          console.log('[DEBUG] Phone from tel link:', phoneText);
        }
      }
      
      if (phoneText) {
        data.phone = phoneText;
        data.phoneUnformatted = phoneText.replace(/\\D/g, '');
        // For formatted phone with +1, keep it
        if (phoneText.match(/^\\+1/)) {
          data.phoneUnformatted = '+' + phoneText.replace(/\\D/g, '');
        }
      } else {
        data.phone = null;
        data.phoneUnformatted = null;
      }
      
      // Website - Enhanced extraction with multiple methods
      let websiteUrl = null;
      
      // Method 1: Look for button with website/authority data attribute (most reliable)
      const websiteButton = document.querySelector('button[data-item-id="authority"]');
      if (websiteButton) {
        const websiteLink = websiteButton.querySelector('a[href]');
        if (websiteLink) {
          websiteUrl = websiteLink.getAttribute('href');
          console.log('[DEBUG] Website from button[data-item-id="authority"]:', websiteUrl);
        }
      }
      
      // Method 2: Look for link with specific data tooltip
      if (!websiteUrl) {
        const websiteLinkTooltip = document.querySelector('a[data-tooltip="Open website"], a[aria-label*="Website"]');
        if (websiteLinkTooltip) {
          websiteUrl = websiteLinkTooltip.getAttribute('href');
          console.log('[DEBUG] Website from data-tooltip:', websiteUrl);
        }
      }
      
      // Method 3: Look for aria-label with website
      if (!websiteUrl) {
        const websiteWithLabel = document.querySelector('[aria-label*="Website:"]');
        if (websiteWithLabel) {
          const ariaLabel = websiteWithLabel.getAttribute('aria-label');
          websiteUrl = ariaLabel.split('Website:')[1]?.trim();
          console.log('[DEBUG] Website from aria-label:', websiteUrl);
        }
      }
      
      // Method 4: Look for any external link that looks like a business website
      if (!websiteUrl) {
        const allLinks = document.querySelectorAll('a[href^="http"]');
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          // Skip Google domains and social media
          if (href && !href.includes('google.com') && !href.includes('facebook.com') && 
              !href.includes('instagram.com') && !href.includes('twitter.com') && 
              !href.includes('youtube.com')) {
            websiteUrl = href;
            console.log('[DEBUG] Website from external link:', websiteUrl);
            break;
          }
        }
      }
      
      data.website = websiteUrl || null;
      
      // === IDs ===
      data.placeId = urlStr.match(/!1s([^!]+)/)?.[1] || '';
      data.cid = urlStr.match(/0x[a-f0-9]+:0x[a-f0-9]+/i)?.[0] || '';
      data.fid = urlStr.match(/!3s([^!]+)/)?.[1] || '';
      
      // === STATUS ===
      const statusSpan = document.querySelector('span.ZDu9vd span, div.fontBodyMedium span[role="img"]');
      const statusText = statusSpan ? statusSpan.textContent.toLowerCase() : '';
      data.permanentlyClosed = statusText.includes('permanently closed') || statusText.includes('closed permanently');
      data.temporarilyClosed = statusText.includes('temporarily closed');
      
      // Claim this business
      data.claimThisBusiness = !!document.querySelector('button[aria-label*="Claim"], button[aria-label*="Own this business"]');
      
      // === OPENING HOURS - Enhanced extraction ===
      data.openingHours = [];
      
      // Check for expanded hours table
      const hoursTable = document.querySelector('table[aria-label*="Hours"], table.eK4R0e');
      if (hoursTable) {
        const rows = hoursTable.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const day = cells[0].textContent.trim();
            const hours = cells[1].textContent.trim();
            if (day && hours) {
              data.openingHours.push({ day, hours });
            }
          }
        });
      }
      
      // Fallback: Get current hours from button
      if (data.openingHours.length === 0) {
        const hoursButton = document.querySelector('button[data-item-id="oh"], button[aria-label*="hours"]');
        if (hoursButton) {
          const hoursText = hoursButton.textContent.trim();
          const match = hoursText.match(/(Open|Closed)[^⋅]*⋅([^⋅]+)/);
          if (match) {
            data.openingHours.push({
              day: 'Today',
              hours: match[0].trim()
            });
          }
        }
      }
      
      // === ADDITIONAL INFO - Comprehensive extraction (2025 method) ===
      data.additionalInfo = {};
      
      // Strategy 1: Extract ALL aria-label attributes from the page
      // This is the most reliable method for 2025 as Google Maps uses aria-labels extensively
      const allAriaElements = document.querySelectorAll('[aria-label]');
      
      // Define categories and their keywords for classification
      const categoryKeywords = {
        'Service options': ['delivery', 'takeout', 'dine-in', 'drive-through', 'curbside pickup', 'no-contact delivery', 'onsite services'],
        'Accessibility': ['wheelchair', 'accessible entrance', 'accessible seating', 'accessible restroom', 'accessible parking'],
        'Offerings': ['alcohol', 'beer', 'wine', 'cocktails', 'coffee', 'tea', 'comfort food', 'happy hour', 'late-night food', 'quick bite', 'small plates', 'healthy options', 'vegetarian', 'vegan'],
        'Dining options': ['breakfast', 'lunch', 'dinner', 'brunch', 'catering', 'counter service', 'dessert', 'seating'],
        'Amenities': ['wi-fi', 'wifi', 'restroom', 'bar onsite', 'good for working', 'gender-neutral restroom', 'high chairs'],
        'Atmosphere': ['casual', 'cozy', 'romantic', 'trendy', 'upscale', 'historic', 'intimate'],
        'Crowd': ['family-friendly', 'groups', 'lgbtq+', 'transgender safespace', 'kids', 'tourists'],
        'Payments': ['credit card', 'debit card', 'nfc mobile payments', 'mobile payments', 'cash only'],
        'Planning': ['reservations', 'accepts reservations', 'walk-ins welcome', 'usually a wait'],
        'Highlights': ['fast service', 'great coffee', 'great dessert', 'great cocktails', 'live music', 'sports'],
        'Popular for': ['breakfast', 'lunch', 'dinner', 'solo dining', 'groups'],
        'Parking': ['free parking lot', 'paid parking lot', 'free street parking', 'paid street parking', 'parking', 'valet parking'],
        'Pets': ['dogs allowed', 'pets allowed'],
        'Children': ['good for kids', 'kids menu', 'high chairs', 'kids\' menu'],
        'From the business': ['identifies as', 'owned', 'operated', 'women-owned', 'latino-owned', 'black-owned']
      };
      
      // Extract and categorize attributes
      allAriaElements.forEach(el => {
        const ariaLabel = el.getAttribute('aria-label');
        if (!ariaLabel || ariaLabel.length < 3) return;
        
        const lowerLabel = ariaLabel.toLowerCase();
        
        // Skip navigation and common UI elements
        if (lowerLabel.includes('menu') && !lowerLabel.includes('kids') && !lowerLabel.includes('braille')) return;
        if (lowerLabel.includes('button') || lowerLabel.includes('collapse') || lowerLabel.includes('expand')) return;
        if (lowerLabel.includes('photo') || lowerLabel.includes('image') || lowerLabel.includes('close')) return;
        
        // Try to categorize
        let matched = false;
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
          for (const keyword of keywords) {
            if (lowerLabel.includes(keyword)) {
              if (!data.additionalInfo[category]) {
                data.additionalInfo[category] = [];
              }
              
              // Clean up the label text
              let cleanLabel = ariaLabel.trim();
              // Remove "has " prefix if present
              cleanLabel = cleanLabel.replace(/^has\s+/i, '');
              
              // Create attribute object
              const attrObj = {};
              attrObj[cleanLabel] = true;
              
              // Avoid duplicates
              const exists = data.additionalInfo[category].some(item => 
                Object.keys(item)[0] === cleanLabel
              );
              
              if (!exists) {
                data.additionalInfo[category].push(attrObj);
              }
              
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      });
      
      // Strategy 2: Look for specific About section with structured data
      const aboutButtons = document.querySelectorAll('button[aria-label*=":"]');
      aboutButtons.forEach(btn => {
        const label = btn.getAttribute('aria-label');
        if (!label || !label.includes(':')) return;
        
        // Parse "Category: Value" format
        const parts = label.split(':').map(p => p.trim());
        if (parts.length >= 2) {
          const category = parts[0];
          const value = parts.slice(1).join(':').trim();
          
          // Map to our standard categories or create new one
          let targetCategory = category;
          if (category.toLowerCase().includes('service')) targetCategory = 'Service options';
          else if (category.toLowerCase().includes('accessibility')) targetCategory = 'Accessibility';
          else if (category.toLowerCase().includes('amenity') || category.toLowerCase().includes('amenities')) targetCategory = 'Amenities';
          else if (category.toLowerCase().includes('payment')) targetCategory = 'Payments';
          
          if (!data.additionalInfo[targetCategory]) {
            data.additionalInfo[targetCategory] = [];
          }
          
          const attrObj = {};
          attrObj[value] = true;
          data.additionalInfo[targetCategory].push(attrObj);
        }
      });
      
      // Strategy 3: Extract checkmarks and icons indicating yes/no attributes
      const checkmarkElements = document.querySelectorAll('[aria-label*="Yes"], [aria-label*="No"], [aria-label*="Available"]');
      checkmarkElements.forEach(el => {
        const parent = el.closest('[role="region"], [role="listitem"], div.rogA2c, div[class*="FeatureButton"]');
        if (!parent) return;
        
        const textContent = parent.textContent.trim();
        const ariaLabel = el.getAttribute('aria-label');
        const isAvailable = ariaLabel && (ariaLabel.toLowerCase().includes('yes') || ariaLabel.toLowerCase().includes('available'));
        
        if (textContent && textContent.length > 3 && textContent.length < 100) {
          // Try to categorize this attribute
          const lowerText = textContent.toLowerCase();
          
          for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
              if (lowerText.includes(keyword)) {
                if (!data.additionalInfo[category]) {
                  data.additionalInfo[category] = [];
                }
                
                const attrObj = {};
                attrObj[textContent] = isAvailable;
                
                const exists = data.additionalInfo[category].some(item => 
                  Object.keys(item)[0] === textContent
                );
                
                if (!exists) {
                  data.additionalInfo[category].push(attrObj);
                }
                break;
              }
            }
          }
        }
      });
      
      // === IMAGES ===
      const photoButtons = document.querySelectorAll('button[aria-label*="Photo"], button[aria-label*="photo"]');
      data.imagesCount = photoButtons.length;
      
      const mainImage = document.querySelector('button[aria-label*="Photo"] img, img[alt*="Photo"]');
      data.imageUrl = mainImage ? mainImage.getAttribute('src') : null;
      
      // Image categories
      data.imageCategories = [];
      const imageCatButtons = document.querySelectorAll('button[aria-label*="photos"]');
      imageCatButtons.forEach(btn => {
        const label = btn.getAttribute('aria-label');
        const match = label.match(/([\\d,]+)\\s+(\\w+)\\s+photos?/i);
        if (match) {
          data.imageCategories.push({
            category: match[2],
            count: parseInt(match[1].replace(/,/g, ''))
          });
        }
      });
      
      // === REVIEWS TAGS ===
      data.reviewsTags = [];
      const reviewTagButtons = document.querySelectorAll('button[aria-label*="mention"], div.lMbq3e button');
      reviewTagButtons.forEach(btn => {
        const label = btn.getAttribute('aria-label') || btn.textContent.trim();
        if (label && !label.includes('Sort')) {
          data.reviewsTags.push(label);
        }
      });
      
      // === PEOPLE ALSO SEARCH ===
      data.peopleAlsoSearch = [];
      const similarLinks = document.querySelectorAll('a[aria-label*="similar"]');
      similarLinks.forEach(link => {
        const name = link.textContent.trim();
        if (name) {
          data.peopleAlsoSearch.push(name);
        }
      });
      
      // === PLACE TAGS ===
      data.placesTags = [];
      const tagButtons = document.querySelectorAll('button.hh2c6, button[aria-label*="tag"]');
      tagButtons.forEach(btn => {
        const tag = btn.textContent.trim();
        if (tag && tag.length > 0 && tag.length < 50) {
          data.placesTags.push(tag);
        }
      });
      
      // === URL ===
      data.url = window.location.href;
      
      // === ADVERTISEMENT ===
      data.isAdvertisement = !!document.querySelector('[data-ad="true"], [data-ad-rendered="true"]');
      
      // === KGMID ===
      data.kgmid = null;
      const kgmidMatch = window.location.href.match(/\/g\/([\w]+)/);
      if (kgmidMatch) {
        data.kgmid = `/g/${kgmidMatch[1]}`;
      }
      
      // === HOTEL/GAS SPECIFIC ===
      data.hotelAds = [];
      data.gasPrices = [];
      
      return data;
    }, rank);
    
    // Add search metadata
    placeData.searchString = searchQuery;
    placeData.searchPageUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery + ' ' + searchLocation)}`;
    
    // === EXTRACT SOCIAL MEDIA LINKS FROM WEBSITE ===
    if (placeData.website) {
      console.log(`🔗 Extracting social media links from: ${placeData.website}`);
      placeData.socialMedia = await extractSocialMediaLinks(page, placeData.website);
    } else {
      placeData.socialMedia = {};
    }
    
    return placeData;
    
  } catch (error) {
    console.error('Error extracting place details:', error.message);
    return null;
  }
}

/**
 * Click buttons to expand hidden sections
 */
async function expandAllSections(page) {
  try {
    // Try to click "More" or expand buttons
    const expandButtons = await page.$$('button[aria-label*="More"], button[aria-label*="more"], button.w8nwRe');
    for (const button of expandButtons) {
      try {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        // Button might not be clickable, continue
      }
    }
    
    // Try to expand hours
    const hoursButton = await page.$('button[data-item-id="oh"], button[aria-label*="hours"]');
    if (hoursButton) {
      try {
        const isExpanded = await page.evaluate(el => el.getAttribute('aria-expanded'), hoursButton);
        if (isExpanded === 'false') {
          await hoursButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {}
    }
    
    // Try to click About tab if exists
    const aboutTab = await page.$('button[aria-label="About"]');
    if (aboutTab) {
      try {
        await aboutTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {}
    }
  } catch (error) {
    // Silently fail - some buttons might not exist
  }
}

/**
 * Extract social media links from business website
 */
async function extractSocialMediaLinks(page, websiteUrl) {
  const socialMedia = {
    facebook: null,
    instagram: null,
    twitter: null,
    linkedin: null,
    youtube: null,
    tiktok: null
  };
  
  try {
    // Navigate to the website
    await page.goto(websiteUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract all social media links
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      return allLinks.map(link => link.href);
    });
    
    // Parse and categorize links
    links.forEach(link => {
      const lowerLink = link.toLowerCase();
      
      if (lowerLink.includes('facebook.com/') && !socialMedia.facebook) {
        socialMedia.facebook = link;
      } else if (lowerLink.includes('instagram.com/') && !socialMedia.instagram) {
        socialMedia.instagram = link;
      } else if ((lowerLink.includes('twitter.com/') || lowerLink.includes('x.com/')) && !socialMedia.twitter) {
        socialMedia.twitter = link;
      } else if (lowerLink.includes('linkedin.com/') && !socialMedia.linkedin) {
        socialMedia.linkedin = link;
      } else if (lowerLink.includes('youtube.com/') && !socialMedia.youtube) {
        socialMedia.youtube = link;
      } else if (lowerLink.includes('tiktok.com/') && !socialMedia.tiktok) {
        socialMedia.tiktok = link;
      }
    });
    
    console.log(`✅ Found social media links:`, Object.keys(socialMedia).filter(k => socialMedia[k]));
    
  } catch (error) {
    console.log(`⚠️  Could not extract social media from website: ${error.message}`);
  }
  
  return socialMedia;
}

/**
 * Auto-scroll the results feed to load more places
 */
async function autoScroll(page, scrolls = 5) {
  await page.evaluate(async (scrolls) => {
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      for (let i = 0; i < scrolls; i++) {
        feed.scrollTop = feed.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }, scrolls);
}

module.exports = googleMapsScraperEnhanced;
