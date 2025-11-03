#!/usr/bin/env node

/**
 * Image Link Checker
 * Crawls the site and checks all Cloudinary image URLs for broken links
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const SITE_URL = 'https://circleseven.co.uk';
const MAX_PAGES = 100; // Limit to avoid overwhelming the site

const visitedUrls = new Set();
const checkedImages = new Set();
const brokenImages = [];
const workingImages = [];
const skippedUrls = new Set();

/**
 * Fetch URL content with redirect following
 */
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects === 0) {
          resolve({ url, status: res.statusCode, body: null });
          return;
        }

        const redirectUrl = new URL(res.headers.location, url).toString();
        return fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        resolve({ url, status: res.statusCode, body: null });
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, status: res.statusCode, body: data }));
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check if an image URL is accessible
 */
async function checkImageUrl(imageUrl) {
  if (checkedImages.has(imageUrl)) {
    return null; // Already checked
  }

  checkedImages.add(imageUrl);

  return new Promise((resolve) => {
    https.get(imageUrl, (res) => {
      if (res.statusCode === 200) {
        workingImages.push(imageUrl);
        resolve({ url: imageUrl, status: 'OK', code: res.statusCode });
      } else {
        brokenImages.push({ url: imageUrl, status: res.statusCode });
        resolve({ url: imageUrl, status: 'BROKEN', code: res.statusCode });
      }
    }).on('error', (err) => {
      brokenImages.push({ url: imageUrl, error: err.message });
      resolve({ url: imageUrl, status: 'ERROR', error: err.message });
    });
  });
}

/**
 * Extract image URLs from HTML
 */
function extractImageUrls(html, baseUrl) {
  const cloudinaryPattern = /https:\/\/res\.cloudinary\.com\/circleseven\/image\/upload\/[^"'\s)]+/g;
  const matches = html.match(cloudinaryPattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Extract page URLs from HTML
 */
function extractPageUrls(html, baseUrl) {
  const linkPattern = /href="([^"]+)"/g;
  const urls = [];
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    let url = match[1];

    // Skip anchors, external links, and non-HTML pages
    if (url.startsWith('#') ||
        url.startsWith('http') && !url.startsWith(SITE_URL) ||
        url.includes('.xml') ||
        url.includes('.json') ||
        url.includes('.css') ||
        url.includes('.js') ||
        url.includes('.png') ||
        url.includes('.jpg') ||
        url.includes('.svg') ||
        url.includes('.webp') ||
        url.includes('.webmanifest') ||
        url.includes('/admin/') ||
        url.includes('/assets/')) {
      continue;
    }

    // Convert relative URLs to absolute
    if (url.startsWith('/')) {
      url = SITE_URL + url;
    } else if (!url.startsWith('http')) {
      url = baseUrl + '/' + url;
    }

    // Remove trailing slashes for consistency
    url = url.replace(/\/$/, '');

    urls.push(url);
  }

  return urls;
}

/**
 * Crawl a page and check its images
 */
async function crawlPage(url) {
  if (visitedUrls.has(url) || visitedUrls.size >= MAX_PAGES) {
    return [];
  }

  visitedUrls.add(url);
  console.log(`\nCrawling [${visitedUrls.size}/${MAX_PAGES}]: ${url}`);

  try {
    const { body, status } = await fetchUrl(url);

    if (!body) {
      // Silently skip non-HTML pages
      return [];
    }

    // Extract and check images
    const imageUrls = extractImageUrls(body, url);
    console.log(`  Found ${imageUrls.length} Cloudinary images`);

    // Check each image (limit concurrent checks)
    const imageChecks = [];
    for (const imageUrl of imageUrls) {
      if (!checkedImages.has(imageUrl)) {
        imageChecks.push(checkImageUrl(imageUrl));

        // Throttle to avoid overwhelming the server
        if (imageChecks.length >= 5) {
          const results = await Promise.all(imageChecks);
          imageChecks.length = 0;

          // Log results
          for (const result of results) {
            if (result && result.status === 'BROKEN') {
              console.log(`    ❌ ${result.url.substring(0, 80)}... (${result.code})`);
            }
          }
        }
      }
    }

    // Check remaining images
    if (imageChecks.length > 0) {
      const results = await Promise.all(imageChecks);
      for (const result of results) {
        if (result && result.status === 'BROKEN') {
          console.log(`    ❌ ${result.url.substring(0, 80)}... (${result.code})`);
        }
      }
    }

    // Extract page links for further crawling
    const pageUrls = extractPageUrls(body, url);
    return pageUrls;

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return [];
  }
}

/**
 * Main crawler
 */
async function crawl() {
  console.log('🔍 Cloudinary Image Link Checker');
  console.log('================================\n');
  console.log(`Starting crawl of: ${SITE_URL}`);
  console.log(`Max pages to check: ${MAX_PAGES}\n`);

  const queue = [SITE_URL];

  while (queue.length > 0 && visitedUrls.size < MAX_PAGES) {
    const url = queue.shift();
    const newUrls = await crawlPage(url);

    // Add new URLs to queue
    for (const newUrl of newUrls) {
      if (!visitedUrls.has(newUrl) && !queue.includes(newUrl)) {
        queue.push(newUrl);
      }
    }
  }

  // Print summary
  console.log('\n\n📊 Summary');
  console.log('==========');
  console.log(`Pages crawled: ${visitedUrls.size}`);
  console.log(`Images checked: ${checkedImages.size}`);
  console.log(`Working images: ${workingImages.length}`);
  console.log(`Broken images: ${brokenImages.length}`);

  if (brokenImages.length > 0) {
    console.log('\n\n❌ Broken Images:');
    console.log('================');
    brokenImages.forEach((img, idx) => {
      console.log(`\n${idx + 1}. ${img.url}`);
      if (img.status) {
        console.log(`   Status: ${img.status}`);
      }
      if (img.error) {
        console.log(`   Error: ${img.error}`);
      }
    });
  } else {
    console.log('\n\n✅ All images are working correctly!');
  }

  // Check for images without circle-seven folder
  console.log('\n\n🔍 Checking folder paths...');
  const imagesWithoutFolder = workingImages.filter(url =>
    !url.includes('/circle-seven/') &&
    !url.match(/\/v\d+\//)  // Exclude version-only URLs (might be legacy)
  );

  if (imagesWithoutFolder.length > 0) {
    console.log(`\n⚠️  Found ${imagesWithoutFolder.length} images without /circle-seven/ folder:`);
    imagesWithoutFolder.slice(0, 10).forEach(url => {
      console.log(`   ${url.substring(0, 100)}...`);
    });
    if (imagesWithoutFolder.length > 10) {
      console.log(`   ... and ${imagesWithoutFolder.length - 10} more`);
    }
  } else {
    console.log('✅ All images use the correct folder path!');
  }
}

// Run the crawler
crawl().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
