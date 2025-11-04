const browserManager = require('../utils/browserManager');

/**
 * Comprehensive Google Maps Scraper
 * Extracts 50+ fields including detailed business information, 
 * service options, amenities, opening hours, reviews, and more
 */
async function googleMapsScraperComprehensive(input) {
  const { query, location = 'United States', maxResults = 20 } = input;
  
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
    const placeLinks = await page.evaluate((maxResults) => {
      const links = [];
      const placeElements = document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]');
      
      for (let i = 0; i < Math.min(placeElements.length, maxResults); i++) {
        const href = placeElements[i].getAttribute('href');
        if (href) {
          links.push(href);
        }
      }
      
      return links;
    }, maxResults);
    
    console.log(`✅ Found ${placeLinks.length} places. Extracting detailed data...`);
    
    // Extract detailed data for each place
    const places = [];
    for (let i = 0; i < placeLinks.length; i++) {
      try {
        console.log(`📍 Extracting place ${i + 1}/${placeLinks.length}...`);
        const placeUrl = placeLinks[i].startsWith('http') 
          ? placeLinks[i] 
          : `https://www.google.com${placeLinks[i]}`;
        
        const placeData = await extractPlaceDetails(page, placeUrl, query, location, i + 1);
        if (placeData) {
          places.push(placeData);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
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
 * Extract comprehensive details for a single place
 */
async function extractPlaceDetails(page, placeUrl, searchQuery, searchLocation, rank) {
  try {
    await page.goto(placeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract all data from the page
    const placeData = await page.evaluate((rank) => {
      const data = {
        rank: rank,
        scrapedAt: new Date().toISOString(),
        language: 'en'
      };
      
      // === BASIC INFO ===
      // Title/Name
      const titleEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
      data.title = titleEl ? titleEl.textContent.trim() : '';
      
      // Category
      const categoryEl = document.querySelector('button[jsaction*="category"]');
      data.categoryName = categoryEl ? categoryEl.textContent.trim() : '';
      data.categories = data.categoryName ? [data.categoryName] : [];
      
      // Price Range
      const priceEl = document.querySelector('span[aria-label*="Price"]');
      data.price = priceEl ? priceEl.getAttribute('aria-label').replace('Price: ', '') : '';
      
      // === RATINGS & REVIEWS ===
      const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
      data.totalScore = ratingEl ? parseFloat(ratingEl.textContent.trim()) : null;
      
      const reviewsEl = document.querySelector('div.F7nice button[aria-label*="reviews"]');
      const reviewsText = reviewsEl ? reviewsEl.getAttribute('aria-label') : '';
      const reviewsMatch = reviewsText.match(/([\\d,]+)\\s+reviews?/i);
      data.reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;
      
      // === ADDRESS & LOCATION ===
      const addressButton = document.querySelector('button[data-item-id*="address"]');
      if (addressButton) {
        const addressDiv = addressButton.querySelector('div.fontBodyMedium');
        const fullAddress = addressDiv ? addressDiv.textContent.trim() : '';
        data.address = fullAddress;
        
        // Parse address components
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
          data.countryCode = 'US'; // Default to US
        }
        
        // Neighborhood (if available)
        data.neighborhood = addressParts.length > 3 ? addressParts[1] : data.city;
      }
      
      // Coordinates - multiple extraction methods
      let locationCoords = null;
      
      // Method 1: From URL
      const coordsFromUrl = window.location.href.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
      if (coordsFromUrl) {
        locationCoords = {
          lat: parseFloat(coordsFromUrl[1]),
          lng: parseFloat(coordsFromUrl[2])
        };
      }
      
      // Method 2: From data attributes or meta tags
      if (!locationCoords) {
        const metaCoords = document.querySelector('meta[itemprop="latitude"], meta[property="og:latitude"]');
        const metaCoordsLng = document.querySelector('meta[itemprop="longitude"], meta[property="og:longitude"]');
        if (metaCoords && metaCoordsLng) {
          locationCoords = {
            lat: parseFloat(metaCoords.getAttribute('content')),
            lng: parseFloat(metaCoordsLng.getAttribute('content'))
          };
        }
      }
      
      // Method 3: From share/copy link button
      if (!locationCoords) {
        const shareButton = document.querySelector('button[data-tooltip*="Share"]');
        if (shareButton) {
          const shareUrl = shareButton.getAttribute('data-url') || window.location.href;
          const coordsMatch = shareUrl.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
          if (coordsMatch) {
            locationCoords = {
              lat: parseFloat(coordsMatch[1]),
              lng: parseFloat(coordsMatch[2])
            };
          }
        }
      }
      
      data.location = locationCoords;
      
      // === CONTACT INFO ===
      const phoneButton = document.querySelector('button[data-item-id*="phone"]');
      if (phoneButton) {
        const phoneDiv = phoneButton.querySelector('div.fontBodyMedium');
        data.phone = phoneDiv ? phoneDiv.textContent.trim() : '';
        data.phoneUnformatted = data.phone ? data.phone.replace(/\\D/g, '') : '';
      }
      
      const websiteButton = document.querySelector('a[data-item-id*="authority"]');
      data.website = websiteButton ? websiteButton.getAttribute('href') : null;
      
      // === IDs ===
      data.placeId = window.location.href.match(/!1s([^!]+)/)?.[1] || '';
      data.cid = window.location.href.match(/!4s([^!]+)/)?.[1] || '';
      data.fid = window.location.href.match(/!3s([^!]+)/)?.[1] || '';
      
      // === STATUS ===
      const statusEl = document.querySelector('span.ZDu9vd span');
      const statusText = statusEl ? statusEl.textContent.toLowerCase() : '';
      data.permanentlyClosed = statusText.includes('permanently closed');
      data.temporarilyClosed = statusText.includes('temporarily closed');
      
      // Claim this business
      data.claimThisBusiness = !!document.querySelector('button[aria-label*="Claim"]');
      
      // === OPENING HOURS ===
      data.openingHours = [];
      
      // Try multiple selectors for opening hours
      const hoursButton = document.querySelector('button[data-item-id*="oh"], button[aria-label*="Hours"], button[data-item-id="oloh"]');
      if (hoursButton) {
        // Check if we need to expand
        const isExpanded = hoursButton.getAttribute('aria-expanded');
        
        // Try to extract from visible content first
        const hoursTable = document.querySelector('table.eK4R0e, div[aria-label*="Hours"] table');
        if (hoursTable) {
          const hourRows = hoursTable.querySelectorAll('tr');
          hourRows.forEach(row => {
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
        
        // If no data yet and button exists, extract from button text
        if (data.openingHours.length === 0) {
          const buttonText = hoursButton.textContent || '';
          const hoursMatch = buttonText.match(/(Open|Closed)\\s*⋅?\\s*([^⋅]+)/);
          if (hoursMatch) {
            data.openingHours.push({
              day: 'Current',
              hours: hoursMatch[0].trim()
            });
          }
        }
      }
      
      // Alternative: Check for hours in structured data
      if (data.openingHours.length === 0) {
        const hoursSpans = document.querySelectorAll('div[class*="hours"] span, div[aria-label*="hours"] span');
        const hoursData = [];
        hoursSpans.forEach(span => {
          const text = span.textContent.trim();
          if (text.match(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/i)) {
            hoursData.push(text);
          }
        });
        if (hoursData.length > 0) {
          data.openingHours.push({ raw: hoursData.join(', ') });
        }
      }
      
      // === ADDITIONAL INFO ===
      data.additionalInfo = {};
      
      // Method 1: Extract from info sections (most common structure)
      const infoSections = document.querySelectorAll('div.iP2t7d, div[class*="section"], div[data-section-id]');
      infoSections.forEach(section => {
        const sectionTitle = section.querySelector('h2.iL3Qke, h2[class*="title"], div[class*="section-header"]');
        if (!sectionTitle) return;
        
        const title = sectionTitle.textContent.trim();
        const items = [];
        
        // Extract items with labels and values
        const itemDivs = section.querySelectorAll('div.RZ66Rb, li, div[class*="attribute"]');
        itemDivs.forEach(itemDiv => {
          const label = itemDiv.querySelector('span.ZKCDEc, span[class*="label"]')?.textContent.trim();
          const value = itemDiv.querySelector('span.V0bdIc, span[class*="value"]')?.textContent.trim();
          
          if (label) {
            const item = {};
            item[label] = value === 'Yes' || value === 'Available' ? true : 
                          value === 'No' || value === 'Unavailable' ? false : 
                          value || true;
            items.push(item);
          }
        });
        
        if (items.length > 0) {
          data.additionalInfo[title] = items;
        }
      });
      
      // Method 2: Extract from accessibility/amenities buttons and chips
      const amenityButtons = document.querySelectorAll('button[aria-label*="amenity"], button[class*="amenity"], div[class*="amenities"] button');
      const amenities = [];
      amenityButtons.forEach(btn => {
        const label = btn.getAttribute('aria-label') || btn.textContent.trim();
        if (label) {
          amenities.push(label);
        }
      });
      if (amenities.length > 0) {
        data.additionalInfo['Amenities'] = amenities.map(a => ({ [a]: true }));
      }
      
      // Method 3: Extract from attributes section (newer Google Maps layout)
      const attributesSection = document.querySelector('div[aria-label*="Attributes"], div[class*="attributes"]');
      if (attributesSection) {
        const attributeItems = attributesSection.querySelectorAll('div[role="img"], span[role="img"]');
        const attributes = [];
        attributeItems.forEach(item => {
          const attrLabel = item.getAttribute('aria-label');
          if (attrLabel) {
            const attrObj = {};
            attrObj[attrLabel] = true;
            attributes.push(attrObj);
          }
        });
        if (attributes.length > 0) {
          data.additionalInfo['Attributes'] = attributes;
        }
      }
      
      // Method 4: Extract specific known categories
      const categories = {
        'Service options': ['Dine-in', 'Takeout', 'Delivery', 'Drive-through', 'Curbside pickup'],
        'Accessibility': ['Wheelchair accessible entrance', 'Wheelchair accessible seating', 'Wheelchair accessible restroom'],
        'Offerings': ['Coffee', 'Alcohol', 'Beer', 'Wine', 'Cocktails', 'Happy hour'],
        'Dining options': ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Seating'],
        'Amenities': ['Restroom', 'Wi-Fi', 'Free Wi-Fi', 'Good for kids', 'High chairs'],
        'Atmosphere': ['Casual', 'Cozy', 'Trendy', 'Upscale', 'Romantic'],
        'Payments': ['Credit cards', 'Debit cards', 'NFC mobile payments']
      };
      
      Object.keys(categories).forEach(categoryName => {
        const items = [];
        categories[categoryName].forEach(option => {
          // Check if mentioned in page text
          const pageText = document.body.textContent;
          if (pageText.includes(option)) {
            items.push({ [option]: true });
          }
        });
        if (items.length > 0 && !data.additionalInfo[categoryName]) {
          data.additionalInfo[categoryName] = items;
        }
      });
      
      // === IMAGES ===
      const imageButtons = document.querySelectorAll('button[aria-label*="Photo"]');
      data.imagesCount = imageButtons.length;
      
      const mainImage = document.querySelector('button[aria-label*="Photo"] img');
      data.imageUrl = mainImage ? mainImage.getAttribute('src') : null;
      
      // === REVIEWS TAGS ===
      data.reviewsTags = [];
      const reviewTagEls = document.querySelectorAll('div.lMbq3e button[aria-label]');
      reviewTagEls.forEach(tag => {
        const label = tag.getAttribute('aria-label');
        if (label) {
          data.reviewsTags.push(label);
        }
      });
      
      // === PEOPLE ALSO SEARCH ===
      data.peopleAlsoSearch = [];
      const similarPlaces = document.querySelectorAll('div.rllt__link a');
      similarPlaces.forEach(place => {
        const name = place.textContent.trim();
        if (name) {
          data.peopleAlsoSearch.push(name);
        }
      });
      
      // === URL ===
      data.url = window.location.href;
      
      // === ADVERTISEMENT ===
      data.isAdvertisement = !!document.querySelector('[data-ad-rendered="true"]');
      
      // === PLACE TAGS ===
      data.placesTags = [];
      const tagButtons = document.querySelectorAll('button.hh2c6');
      tagButtons.forEach(tag => {
        const tagText = tag.textContent.trim();
        if (tagText) {
          data.placesTags.push(tagText);
        }
      });
      
      // Image categories
      data.imageCategories = [];
      const imageCategoryEls = document.querySelectorAll('button[aria-label*="images"]');
      imageCategoryEls.forEach(cat => {
        const label = cat.getAttribute('aria-label');
        if (label) {
          const match = label.match(/([\\d,]+)\\s+(\\w+)\\s+images?/i);
          if (match) {
            data.imageCategories.push({
              category: match[2],
              count: parseInt(match[1].replace(/,/g, ''))
            });
          }
        }
      });
      
      // === HOTEL/GAS SPECIFIC ===
      data.hotelAds = [];
      data.gasPrices = [];
      
      // === KGMID (Knowledge Graph ID) ===
      // Extract from meta tags or structured data
      const kgmidMeta = document.querySelector('meta[property="og:url"]');
      if (kgmidMeta) {
        const kgmidMatch = kgmidMeta.getAttribute('content').match(/\/g\/([\w]+)/);
        data.kgmid = kgmidMatch ? `/g/${kgmidMatch[1]}` : null;
      }
      
      // Alternative: Extract from page data
      if (!data.kgmid) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const jsonData = JSON.parse(script.textContent);
            if (jsonData['@id'] && jsonData['@id'].includes('/g/')) {
              data.kgmid = jsonData['@id'];
            }
          } catch (e) {}
        });
      }
      
      return data;
    }, rank);
    
    // Add search metadata
    placeData.searchString = searchQuery;
    placeData.searchPageUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery + ' ' + searchLocation)}`;
    
    return placeData;
    
  } catch (error) {
    console.error('Error extracting place details:', error.message);
    return null;
  }
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

module.exports = googleMapsScraperComprehensive;
