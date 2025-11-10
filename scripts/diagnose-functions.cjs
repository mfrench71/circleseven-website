#!/usr/bin/env node

/**
 * Netlify Functions Diagnostic Script
 *
 * Checks for common issues that cause 502 errors:
 * - Missing environment variables
 * - GitHub API connectivity
 * - Rate limiting issues
 * - Function syntax errors
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const functionsDir = path.join(__dirname, '../netlify/functions');
const requiredEnvVars = [
  'GITHUB_TOKEN',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_CLOUD_NAME'
];

console.log('🔍 Netlify Functions Diagnostic Tool\n');
console.log('=' .repeat(60));

// 1. Check environment variables
console.log('\n1️⃣  Checking Environment Variables...\n');
const missingVars = [];
const presentVars = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`   ❌ ${varName}: MISSING`);
  } else {
    presentVars.push(varName);
    const masked = value.substring(0, 4) + '***' + value.substring(value.length - 4);
    console.log(`   ✅ ${varName}: ${masked}`);
  }
});

if (missingVars.length > 0) {
  console.log(`\n   ⚠️  Missing ${missingVars.length} required environment variables`);
} else {
  console.log('\n   ✅ All required environment variables present');
}

// 2. Check function files
console.log('\n2️⃣  Checking Function Files...\n');
const functions = fs.readdirSync(functionsDir)
  .filter(file => file.endsWith('.js') || file.endsWith('.cjs'))
  .filter(file => !file.startsWith('_'));

functions.forEach(file => {
  const filePath = path.join(functionsDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for export handler
    if (content.includes('exports.handler') || content.includes('export const handler') || content.includes('export async function handler')) {
      console.log(`   ✅ ${file}: Valid handler export`);
    } else {
      console.log(`   ⚠️  ${file}: No handler export found`);
    }
  } catch (error) {
    console.log(`   ❌ ${file}: Error reading file - ${error.message}`);
  }
});

// 3. Test GitHub API connectivity (if token present)
console.log('\n3️⃣  Testing GitHub API Connectivity...\n');

if (process.env.GITHUB_TOKEN) {
  testGitHubAPI();
} else {
  console.log('   ⚠️  Skipped - GITHUB_TOKEN not set');
}

function testGitHubAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/rate_limit',
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Functions-Diagnostic',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode === 200) {
            console.log('   ✅ GitHub API connection successful');
            console.log(`   📊 Rate Limit: ${parsed.rate.remaining}/${parsed.rate.limit}`);
            console.log(`   ⏰ Reset at: ${new Date(parsed.rate.reset * 1000).toLocaleString()}`);

            if (parsed.rate.remaining < 100) {
              console.log('   ⚠️  WARNING: Low rate limit remaining!');
            }
          } else {
            console.log(`   ❌ GitHub API error: ${res.statusCode}`);
            console.log(`   Message: ${parsed.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.log(`   ❌ Failed to parse response: ${error.message}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Connection error: ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log('   ❌ Request timeout (10s)');
      resolve();
    });

    req.end();
  });
}

// 4. Check for common issues
console.log('\n4️⃣  Common Issue Checks...\n');

// Check if using correct module format
const settingsPath = path.join(functionsDir, 'settings.js');
if (fs.existsSync(settingsPath)) {
  const content = fs.readFileSync(settingsPath, 'utf8');
  if (content.includes('require(') && content.includes('export ')) {
    console.log('   ⚠️  Mixed CommonJS/ES6 modules detected in settings.js');
  } else {
    console.log('   ✅ Module format consistent');
  }
}

// Check for dependencies
console.log('\n5️⃣  Checking Dependencies...\n');
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const hasYaml = packageJson.dependencies?.['js-yaml'] || packageJson.devDependencies?.['js-yaml'];

  if (hasYaml) {
    console.log('   ✅ js-yaml dependency present');
  } else {
    console.log('   ⚠️  js-yaml not found (needed for settings function)');
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary:\n');

if (missingVars.length === 0) {
  console.log('✅ All environment variables configured');
} else {
  console.log(`❌ ${missingVars.length} missing environment variables:`);
  missingVars.forEach(v => console.log(`   - ${v}`));
}

console.log(`\n✅ Found ${functions.length} function files`);

console.log('\n📝 Next Steps:');
console.log('\n1. If environment variables are missing:');
console.log('   - Add them to your .env file for local development');
console.log('   - Add them in Netlify Dashboard > Site Settings > Environment Variables');
console.log('\n2. If GitHub API fails:');
console.log('   - Verify GITHUB_TOKEN has repo and workflow scopes');
console.log('   - Check if token has expired');
console.log('   - Ensure token has access to the repository');
console.log('\n3. Check Netlify Function Logs:');
console.log('   - Netlify Dashboard > Functions > [function-name]');
console.log('   - Look for specific error messages');
console.log('\n4. Test functions locally:');
console.log('   - Run: netlify dev');
console.log('   - Test each endpoint manually');

console.log('\n' + '='.repeat(60) + '\n');
