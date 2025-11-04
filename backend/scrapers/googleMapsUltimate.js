/**
 * ULTIMATE GOOGLE MAPS + INTERNET ENRICHER
 * 40+ fields | Parallel | Stealth | Website Enrichment | Social Media
 * Based on professional scraping architecture
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const CONCURRENCY = 4; // Parallel browser tabs for enrichment

/**
 * Main scraper function
 */
async function googleMapsUltimate(input) {
  const { 
    query, 
    location = 'United States', 
    maxResults = 20 
  } = input;
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  const searchQuery = location ? `${query} ${location}` : query;
  console.log(`🚀 Starting Ultimate Google Maps Scraper: "${searchQuery}"`);
  console.log(`📊 Target: ${maxResults} results with full enrichment`);

  const results = await ultimateScrape(searchQuery, maxResults);
  
  return [{
    searchString: searchQuery,
    searchUrl: `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
    totalResults: results.results.length,
    detailedResults: results.results.filter(r => r.hasDetailedData).length,
    scrapedAt: results.scrapedAt,
    results: results.results
  }];
}

/**
 * Ultimate Scraper with parallel enrichment
 */
async function ultimateScrape(query, max) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ],
    // Let puppeteer use bundled Chromium
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await setupPage(page);

  // Step 1: Search and collect place URLs
  const placeUrls = await searchAndCollect(page, query, max);
  console.log(`✅ Found ${placeUrls.length} places. Starting enrichment...`);

  // Step 2: Parallel enrichment
  const enriched = [];
  for (let i = 0; i < placeUrls.length; i += CONCURRENCY) {
    const batch = placeUrls.slice(i, i + CONCURRENCY);
    const promises = batch.map((url, idx) => 
      enrichUltimate(browser, url, query, i + idx + 1)
    );
    const batchResults = await Promise.all(promises);
    enriched.push(...batchResults.filter(r => r));
    console.log(`📊 Progress: ${enriched.length}/${placeUrls.length}`);
    await delay(1200);
  }

  await browser.close();

  return {
    query,
    total: enriched.length,
    scrapedAt: new Date().toISOString(),
    results: enriched
  };
}

/**
 * Search and collect place URLs
 */
async function searchAndCollect(page, query, max) {
  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const urls = new Set();
    let lastCount = 0;
    let attempts = 0;
    const maxAttempts = 50;

    while (urls.size < max && attempts < maxAttempts) {
      // Scroll the results panel
      await page.evaluate(() => {
        const panel = document.querySelector('[role="feed"]');
        if (panel) panel.scrollTop = panel.scrollHeight;
      });
      
      await delay(1800);

      // Extract place URLs
      const links = await page.$$eval('a[href*="maps/place"]', els =>
        els.map(el => el.href).filter(h => h.includes('/maps/place/'))
      );

      links.forEach(l => urls.add(l));
      
      // Check if we're still loading new results
      if (urls.size === lastCount) {
        attempts++;
      } else {
        attempts = 0;
        lastCount = urls.size;
      }

      console.log(`📍 Loaded ${urls.size} places...`);
      
      if (urls.size >= max) break;
    }

    return Array.from(urls).slice(0, max);
  } catch (error) {
    console.error('Search collection error:', error.message);
    return [];
  }
}

/**
 * Ultimate enrichment for each place
 */
async function enrichUltimate(browser, url, query, rank) {
  const page = await browser.newPage();
  await setupPage(page);
  
  const data = { 
    placeUrl: url, 
    searchQuery: query, 
    searchRank: rank,
    hasDetailedData: false
  };

  try {
    // === 1. GOOGLE MAPS EXTRACTION ===
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
    await delay(2000); // Let dynamic content load
    
    Object.assign(data, await extractGoogleMapsUltimate(page));
    data.hasDetailedData = true;

    // === 2. WEBSITE ENRICHMENT ===
    if (data.website && data.website.startsWith('http')) {
      try {
        const websiteData = await enrichWebsite(browser, data.website);
        Object.assign(data, websiteData);
      } catch (err) {
        console.log(`⚠️ Website enrichment failed for ${data.website}`);
      }
    }

    // === 3. AI SUMMARY ===
    data.aiSummary = generateAISummary(data);

    // === 4. DATA VALIDATION ===
    data.emailValid = data.emails?.length > 0;
    data.phoneType = classifyPhone(data.phone);
    data.hasWebsite = !!data.website;
    data.hasSocialMedia = data.social ? Object.values(data.social).some(v => v) : false;

  } catch (err) {
    console.error(`❌ Failed ${url}:`, err.message);
    data.error = err.message;
  } finally {
    await page.close();
  }

  return data;
}

/**
 * Extract comprehensive data from Google Maps
 */
async function extractGoogleMapsUltimate(page) {
  return await page.evaluate(() => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];

    const get = (sel) => $(sel)?.innerText?.trim() || null;
    const attr = (sel, a) => $(sel)?.getAttribute(a) || null;

    // === BASIC INFO ===
    const name = get('h1') || get('[data-item-id="title"]');
    const rating = parseFloat(get('[jsaction*="review"] > span[aria-hidden="true"]')?.split(' ')[0]) || null;
    const reviews = parseInt(get('[jsaction*="review"]')?.match(/\(([\d,]+)\)/)?.[1]?.replace(/,/g, '')) || null;

    // === ADDRESS ===
    const fullAddress = get('button[data-item-id="address"] .Io6YTe') || null;
    const addrParts = fullAddress?.split(', ') || [];
    const street = addrParts[0] || null;
    const city = addrParts[1] || null;
    const stateZip = addrParts[2]?.split(' ') || [];
    const state = stateZip[0] || null;
    const zip = stateZip[1] || null;
    const country = addrParts[3] || null;

    // === CONTACT ===
    const phone = get('button[data-item-id*="phone"] .Io6YTe') || null;
    const website = attr('a[data-item-id="authority"]', 'href') || null;

    // === BUSINESS INFO ===
    const price = get('span[aria-label*="Price"]') || null;
    const verified = !!$('img[alt*="Verified"]') || !!$('[aria-label*="Verified"]');
    
    const categories = $$('button[jsaction="pane.rating.category"]')
      .map(b => b.innerText.trim())
      .filter(Boolean);

    const mainCategory = categories[0] || null;

    // === OPENING HOURS ===
    const hours = {};
    $$('table[aria-label*="Hours"] tr').forEach(tr => {
      const day = tr.querySelector('th')?.innerText?.toLowerCase();
      const time = tr.querySelector('td')?.innerText;
      if (day && time) hours[day] = time;
    });

    // Alternative hours selector
    if (Object.keys(hours).length === 0) {
      $$('[jsaction*="openhours"] tr').forEach(tr => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const day = cells[0]?.innerText?.toLowerCase();
          const time = cells[1]?.innerText;
          if (day && time) hours[day] = time;
        }
      });
    }

    // === LIVE STATUS ===
    const liveStatus = get('span[aria-label*="Open now"]') || 
                       get('span[aria-label*="Closes soon"]') || 
                       get('span[aria-label*="Closed"]') || null;

    // === SERVICES & AMENITIES ===
    const services = [];
    $$('[role="region"] div[role="listitem"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 2) services.push(text);
    });

    // === PHOTOS ===
    const photos = $$('button[jsaction*="pane.image"] img')
      .map(img => img.src)
      .filter(s => s.startsWith('http') && !s.includes('gstatic'))
      .slice(0, 10);

    const photoCount = parseInt(get('[aria-label*="photos"]')?.match(/\d+/)?.[0]) || photos.length;

    // === MENU & RESERVATIONS ===
    const menuBtn = $('a[href*="menu"]') || $('button[data-item-id="menu"]');
    const reservationBtn = $('a[href*="resy.com"], a[href*="opentable.com"]');

    // === OWNER RESPONSES ===
    const ownerResponses = $$('[jsaction="pane.review.owner"]')
      .map(el => el.innerText.trim())
      .slice(0, 3);

    // === POPULAR TIMES ===
    const popularTimes = {};
    const timesBars = $$('[jsaction*="populartimes"] [role="img"]');
    if (timesBars.length > 0) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      timesBars.forEach((bar, i) => {
        const dayIdx = Math.floor(i / 24);
        const hour = i % 24;
        const day = days[dayIdx];
        if (!popularTimes[day]) popularTimes[day] = [];
        const busy = parseInt(bar.style.height) || 0;
        popularTimes[day].push({ hour, busy });
      });
    }

    // === GEOLOCATION ===
    const lat = location.href.match(/!3d(-?\d+\.\d+)/)?.[1];
    const lng = location.href.match(/!4d(-?\d+\.\d+)/)?.[1];

    // === IDs ===
    const placeId = location.href.match(/(ChIJ[A-Za-z0-9_-]+)/)?.[1] || null;
    const cid = location.href.match(/!4s0x[0-9a-f]+:0x[0-9a-f]+/)?.[0]?.split(':')[1] || null;

    // === ADDITIONAL INFO ===
    const additionalInfo = {};
    $$('[role="region"] button').forEach(btn => {
      const label = btn.getAttribute('aria-label');
      if (label) {
        const [key, value] = label.split(':').map(s => s.trim());
        if (key && value) additionalInfo[key] = value;
      }
    });

    // === ACCESSIBILITY ===
    const accessibility = $$('[aria-label*="Wheelchair"], [aria-label*="accessible"]')
      .map(el => el.getAttribute('aria-label'))
      .filter(Boolean);

    // === BOOKING/ORDER OPTIONS ===
    const bookingOptions = $$('a[href*="order"], a[href*="book"], button[aria-label*="Order"]')
      .map(el => ({
        text: el.innerText || el.getAttribute('aria-label'),
        url: el.href
      }))
      .filter(o => o.text);

    return {
      // Basic
      name,
      rating,
      reviewsCount: reviews,
      mainCategory,
      categories,
      priceLevel: price,
      verified,
      
      // Address
      fullAddress,
      street,
      city,
      state,
      zip,
      country,
      
      // Contact
      phone,
      website,
      
      // Hours & Status
      openingHours: hours,
      liveStatus,
      
      // Engagement
      photoCount,
      photos,
      ownerResponses,
      popularTimes: Object.keys(popularTimes).length > 0 ? popularTimes : null,
      
      // Services
      services,
      additionalInfo,
      accessibility,
      
      // Actions
      menuUrl: menuBtn?.href || null,
      reservationUrl: reservationBtn?.href || null,
      bookingOptions,
      
      // Location
      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
      
      // IDs
      placeId,
      cid
    };
  });
}

/**
 * Website enrichment - extract emails, social media, structured data
 */
async function enrichWebsite(browser, url) {
  const page = await browser.newPage();
  await setupPage(page);
  const data = {};

  try {
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 25000 
    });

    // === EMAILS ===
    data.emails = await page.evaluate(() => {
      const text = document.body.innerText;
      const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(regex) || [];
      return [...new Set(matches)].filter(e => 
        !e.includes('example.com') && 
        !e.includes('wix.com') &&
        !e.includes('sentry.io')
      ).slice(0, 5);
    });

    // === SOCIAL LINKS ===
    data.social = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const platforms = {
        facebook: /facebook\.com\/(?!sharer)/i,
        instagram: /instagram\.com/i,
        twitter: /twitter\.com|x\.com/i,
        linkedin: /linkedin\.com/i,
        tiktok: /tiktok\.com/i,
        youtube: /youtube\.com/i,
        pinterest: /pinterest\.com/i,
        yelp: /yelp\.com/i
      };
      const found = {};
      for (const [platform, regex] of Object.entries(platforms)) {
        const link = links.find(a => regex.test(a.href));
        found[platform] = link?.href || null;
      }
      return found;
    });

    // === STRUCTURED DATA (JSON-LD) ===
    data.structuredData = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const data = [];
      scripts.forEach(script => {
        try {
          const parsed = JSON.parse(script.innerText);
          data.push(parsed);
        } catch (e) { /* ignore */ }
      });
      return data.length > 0 ? data : null;
    });

    // === ABOUT/DESCRIPTION ===
    data.about = await page.evaluate(() => {
      const selectors = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        '.about-section',
        '#about',
        '.description'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.content || el.innerText;
          if (text && text.length > 20) return text.trim().slice(0, 500);
        }
      }
      return null;
    });

    // === FOUNDER/OWNER ===
    data.founder = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const patterns = [
        /(founded by|owner|ceo|founder)[:\s]+([a-z\s]{2,30})/i,
        /(meet|about)\s+([a-z\s]{2,30}),?\s+(founder|owner|ceo)/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[2].trim();
      }
      return null;
    });

    // === YEAR FOUNDED ===
    data.yearFounded = await page.evaluate(() => {
      const text = document.body.innerText;
      const patterns = [
        /©\s*(\d{4})/,
        /established\s+(\d{4})/i,
        /since\s+(\d{4})/i,
        /founded\s+in\s+(\d{4})/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const year = parseInt(match[1]);
          if (year >= 1800 && year <= new Date().getFullYear()) {
            return year;
          }
        }
      }
      return null;
    });

  } catch (err) {
    console.log(`Website enrichment error: ${err.message}`);
  } finally {
    await page.close();
  }

  return data;
}

/**
 * Generate AI-powered summary
 */
function generateAISummary(data) {
  const parts = [];
  
  if (data.name) parts.push(data.name);
  if (data.mainCategory) parts.push(data.mainCategory);
  if (data.rating && data.reviewsCount) {
    parts.push(`${data.rating}⭐ (${data.reviewsCount} reviews)`);
  }
  if (data.priceLevel) parts.push(data.priceLevel);
  if (data.city && data.state) parts.push(`${data.city}, ${data.state}`);
  if (data.verified) parts.push('✓ Verified');
  if (data.emails && data.emails.length > 0) parts.push('📧 Email available');
  if (data.social) {
    const socialCount = Object.values(data.social).filter(v => v).length;
    if (socialCount > 0) parts.push(`${socialCount} social profiles`);
  }
  if (data.liveStatus) parts.push(data.liveStatus);
  
  return parts.join(' • ');
}

/**
 * Classify phone type
 */
function classifyPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return 'US landline';
  if (clean.length === 11 && clean.startsWith('1')) return 'US number';
  return 'unknown';
}

/**
 * Setup page with stealth settings
 */
async function setupPage(page) {
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });
}

/**
 * Delay utility
 */
function delay(ms) { 
  return new Promise(resolve => setTimeout(resolve, ms)); 
}

module.exports = googleMapsUltimate;
