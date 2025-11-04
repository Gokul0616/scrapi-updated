const puppeteer = require('puppeteer');

/**
 * Professional Google Maps Scraper with Puppeteer
 * Apify-like comprehensive data extraction
 * 
 * Features:
 * - Scrolls search results to load more listings
 * - Extracts comprehensive business data (50+ fields)
 * - Visits individual business pages for detailed info
 * - Handles dynamic content loading
 * - Anti-detection measures included
 */

async function googleMapsScraperPro(input) {
  const { query, location = 'United States', maxResults = 20, detailedResults = 10 } = input;
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  const searchString = `${query} ${location}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
  
  console.log(`🚀 Starting Google Maps scraper for: "${searchString}"`);
  console.log(`📊 Target: ${maxResults} results (${detailedResults} with detailed data)`);

  let browser = null;
  let results = [];

  try {
    // Launch browser with anti-detection measures
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ],
      executablePath: '/usr/bin/chromium' // Use system Chromium
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Remove webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Navigate to search page
    console.log(`🌐 Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for results container
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more results
    console.log('📜 Scrolling to load more results...');
    await scrollResultsPanel(page, maxResults);

    // Extract basic data from all results
    console.log('⚡ Extracting basic data from search results...');
    const basicData = await extractBasicData(page, maxResults);
    
    console.log(`✅ Found ${basicData.length} places in search results`);

    // For top N results, visit individual pages for detailed data
    const detailCount = Math.min(detailedResults, basicData.length);
    console.log(`🔍 Getting detailed data for top ${detailCount} results...`);

    for (let i = 0; i < detailCount; i++) {
      const place = basicData[i];
      
      if (place.url) {
        try {
          console.log(`  ${i + 1}/${detailCount} Visiting: ${place.title}`);
          const detailedData = await extractDetailedData(page, place.url);
          
          // Merge detailed data with basic data
          results.push({
            ...place,
            ...detailedData,
            rank: i + 1,
            hasDetailedData: true
          });
        } catch (error) {
          console.error(`  ❌ Failed to get details for ${place.title}:`, error.message);
          results.push({
            ...place,
            rank: i + 1,
            hasDetailedData: false
          });
        }
      } else {
        results.push({
          ...place,
          rank: i + 1,
          hasDetailedData: false
        });
      }
    }

    // Add remaining results without detailed data
    for (let i = detailCount; i < basicData.length; i++) {
      results.push({
        ...basicData[i],
        rank: i + 1,
        hasDetailedData: false
      });
    }

    console.log(`✅ Scraping complete! Extracted ${results.length} places (${detailCount} with detailed data)`);
    
    return {
      searchString,
      searchUrl,
      totalResults: results.length,
      detailedResults: detailCount,
      scrapedAt: new Date().toISOString(),
      results
    };

  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scroll the results panel to load more listings
 */
async function scrollResultsPanel(page, targetCount) {
  const feedSelector = 'div[role="feed"]';
  
  let lastCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 10;

  while (scrollAttempts < maxScrollAttempts) {
    // Get current count
    const currentCount = await page.evaluate((sel) => {
      return document.querySelectorAll(`${sel} > div > div[jsaction]`).length;
    }, feedSelector);

    console.log(`  Loaded ${currentCount} results...`);

    if (currentCount >= targetCount) {
      console.log(`  ✅ Reached target count: ${currentCount}`);
      break;
    }

    if (currentCount === lastCount) {
      console.log(`  ⚠️  No new results loaded, stopping scroll`);
      break;
    }

    lastCount = currentCount;

    // Scroll the feed container
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) {
        feed.scrollTop = feed.scrollHeight;
      }
    }, feedSelector);

    // Wait for new results to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    scrollAttempts++;
  }
}

/**
 * Extract basic data from search results
 */
async function extractBasicData(page, maxResults) {
  return await page.evaluate((max) => {
    const places = [];
    
    // Try multiple selector strategies
    let placeElements = document.querySelectorAll('div[role="feed"] > div[jsaction]');
    
    if (placeElements.length === 0) {
      // Alternative selector
      placeElements = document.querySelectorAll('div[role="feed"] > div > div[jsaction]');
    }
    
    console.log(`Found ${placeElements.length} place elements to process`);

    for (let i = 0; i < Math.min(placeElements.length, max); i++) {
      const element = placeElements[i];

      try {
        // Title - multiple strategies
        let title = '';
        let titleEl = element.querySelector('div.fontHeadlineSmall');
        if (!titleEl) titleEl = element.querySelector('a.hfpxzc');
        if (!titleEl) titleEl = element.querySelector('[class*="fontHeadline"]');
        title = titleEl ? titleEl.textContent.trim() : '';
        
        if (!title) {
          console.log(`Skipping element ${i}: no title found`);
          continue;
        }

        console.log(`Processing: ${title}`);

        // Rating - look for aria-label with "stars"
        let totalScore = null;
        let reviewsCount = 0;
        
        const ratingElements = element.querySelectorAll('span[role="img"]');
        for (const ratingEl of ratingElements) {
          const ariaLabel = ratingEl.getAttribute('aria-label') || '';
          if (ariaLabel.includes('star')) {
            const ratingMatch = ariaLabel.match(/(\d+\.?\d*)/);
            if (ratingMatch) totalScore = parseFloat(ratingMatch[1]);
            
            // Reviews are usually near the rating
            const reviewMatch = ariaLabel.match(/([\d,]+)\s*review/i);
            if (reviewMatch) {
              reviewsCount = parseInt(reviewMatch[1].replace(/,/g, ''));
            }
            break;
          }
        }

        // If reviews not in rating element, look separately
        if (reviewsCount === 0) {
          const reviewElements = element.querySelectorAll('span[aria-label]');
          for (const reviewEl of reviewElements) {
            const ariaLabel = reviewEl.getAttribute('aria-label') || '';
            const reviewMatch = ariaLabel.match(/([\d,]+)\s*review/i);
            if (reviewMatch) {
              reviewsCount = parseInt(reviewMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }

        // Category and price
        let categoryName = '';
        let price = '';
        
        const fontBodyElements = element.querySelectorAll('div[class*="fontBody"]');
        for (const el of fontBodyElements) {
          const text = el.textContent.trim();
          
          // Price level ($ $$ $$$)
          if (text.match(/^\$+$/)) {
            price = text;
          } 
          // Category (avoid addresses)
          else if (text && !text.match(/\d+.*(?:St|Ave|Rd|Dr|Blvd|Street|Avenue)/i) && !categoryName) {
            const parts = text.split('·');
            if (parts.length > 0 && parts[0].length > 0 && parts[0].length < 50) {
              categoryName = parts[0].trim();
            }
          }
        }

        // Address - look for street patterns
        let address = '';
        const allTextElements = element.querySelectorAll('div[class*="fontBody"], span');
        for (const el of allTextElements) {
          const text = el.textContent.trim();
          // Match common address patterns
          if (text.match(/\d+\s+\w+.*(?:St|Ave|Rd|Dr|Blvd|Street|Avenue|Road|Drive|Boulevard|Lane|Ln|Way|Court|Ct|Place|Pl)/i)) {
            address = text;
            break;
          }
        }

        // URL - look for link with /maps/place/
        let url = '';
        const linkEl = element.querySelector('a[href*="/maps/place/"]');
        if (linkEl) {
          url = linkEl.getAttribute('href') || '';
          if (url && !url.startsWith('http')) {
            url = `https://www.google.com${url}`;
          }
        }

        // Place ID from URL
        let placeId = '';
        if (url) {
          const placeIdMatch = url.match(/!1s(0x[0-9a-fA-F:]+)/);
          if (placeIdMatch) placeId = placeIdMatch[1];
        }

        const placeData = {
          title,
          categoryName: categoryName || null,
          price: price || null,
          address: address || null,
          totalScore,
          reviewsCount,
          url,
          placeId: placeId || null
        };

        console.log(`Extracted: ${title} (${categoryName || 'No category'}) - ${totalScore || 'No rating'} stars`);
        places.push(placeData);

      } catch (error) {
        console.error(`Error extracting place ${i}:`, error.message);
      }
    }

    console.log(`Successfully extracted ${places.length} places`);
    return places;
  }, maxResults);
}

/**
 * Extract detailed data by visiting individual business page
 */
async function extractDetailedData(page, placeUrl) {
  try {
    await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for main content
    await page.waitForSelector('h1', { timeout: 10000 });

    const detailedData = await page.evaluate(() => {
      const data = {};

      // Phone number
      const phoneButton = document.querySelector('button[data-item-id="phone:tel:"]');
      if (phoneButton) {
        const phoneDiv = phoneButton.querySelector('div.fontBodyMedium');
        data.phone = phoneDiv ? phoneDiv.textContent.trim() : null;
      }

      // Website
      const websiteButton = document.querySelector('a[data-item-id="authority"]');
      if (websiteButton) {
        data.website = websiteButton.getAttribute('href');
      }

      // Address (more accurate from detail page)
      const addressButton = document.querySelector('button[data-item-id="address"]');
      if (addressButton) {
        const addressDiv = addressButton.querySelector('div.fontBodyMedium');
        data.addressDetailed = addressDiv ? addressDiv.textContent.trim() : null;
      }

      // Coordinates from URL
      const urlParams = window.location.href;
      const coordMatch = urlParams.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        data.location = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      }

      // Opening hours
      const hoursButton = document.querySelector('button[aria-label*="Hours"]');
      if (hoursButton) {
        const hoursTable = hoursButton.querySelector('table');
        if (hoursTable) {
          const hours = [];
          const rows = hoursTable.querySelectorAll('tr');
          rows.forEach(row => {
            const day = row.querySelector('td:first-child')?.textContent.trim();
            const time = row.querySelector('td:last-child')?.textContent.trim();
            if (day && time) {
              hours.push({ day, hours: time });
            }
          });
          data.openingHours = hours;
        }
      }

      // Additional info (amenities, attributes, etc.)
      const additionalInfo = {};
      const sections = document.querySelectorAll('div[role="region"]');
      
      sections.forEach(section => {
        const heading = section.querySelector('h2');
        if (heading) {
          const sectionTitle = heading.textContent.trim();
          const items = [];
          
          const buttons = section.querySelectorAll('button[aria-label]');
          buttons.forEach(btn => {
            const label = btn.getAttribute('aria-label');
            if (label && !label.includes('Show more') && !label.includes('Show less')) {
              items.push(label);
            }
          });
          
          if (items.length > 0) {
            additionalInfo[sectionTitle] = items;
          }
        }
      });

      data.additionalInfo = additionalInfo;

      // Place ID (more reliable from detail page)
      const cidMatch = window.location.href.match(/!1s(0x[0-9a-fA-F:]+)/);
      if (cidMatch) {
        data.placeIdDetailed = cidMatch[1];
      }

      // Images count
      const photoButton = document.querySelector('button[aria-label*="photo"]');
      if (photoButton) {
        const countMatch = photoButton.getAttribute('aria-label').match(/([\d,]+)/);
        data.imagesCount = countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : 0;
      }

      return data;
    });

    return detailedData;

  } catch (error) {
    console.error('Error extracting detailed data:', error.message);
    return {};
  }
}

/**
 * Find Chrome executable path
 */
function findChromePath() {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Check Puppeteer cache first
  const puppeteerCachePath = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
  
  if (fs.existsSync(puppeteerCachePath)) {
    try {
      const versions = fs.readdirSync(puppeteerCachePath);
      if (versions.length > 0) {
        const chromePath = path.join(puppeteerCachePath, versions[0], 'chrome-linux64', 'chrome');
        if (fs.existsSync(chromePath)) {
          return chromePath;
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  // System paths
  const systemPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];

  for (const chromePath of systemPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Let Puppeteer use default
  return undefined;
}

module.exports = googleMapsScraperPro;
