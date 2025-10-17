# Circle Seven WordPress to GitHub Pages Migration Guide

## Phase 1: Export WordPress Content

### Step 1: Export Your WordPress Data

**Option A: Using Jekyll Exporter Plugin (Recommended)**
1. Log into WordPress admin at `www.circleseven.co.uk/wp-admin`
2. Go to Plugins → Add New
3. Search for "Jekyll Exporter"
4. Install and activate the plugin
5. Go to Tools → Export to Jekyll
6. Download the generated ZIP file
7. Extract the ZIP - you'll find:
   - `_posts/` folder with all blog posts
   - `_pages/` folder with all pages
   - `wp-content/` folder with media files

**Option B: Using WordPress XML Export**
1. In WordPress admin, go to Tools → Export
2. Select "All content" and click Download Export File
3. Save the XML file
4. Use an online converter or tool like `wordpress-to-jekyll-exporter` to convert

### Step 2: Download Media Library

If you didn't use the Jekyll Exporter plugin:

1. Access your Krystal hosting control panel
2. Use File Manager or FTP to download the entire `/wp-content/uploads/` folder
3. This contains all your images, PDFs, and other media files

### Step 3: Backup Your Database (Safety)

1. In Krystal hosting control panel, go to phpMyAdmin
2. Select your WordPress database
3. Click "Export"
4. Choose "Quick" export method
5. Download the SQL file and store it safely

### Step 4: Document Your Site Structure

1. List all pages and their URLs
2. Note any custom post types or taxonomies
3. Document any plugins you're using for special functionality
4. Screenshot your site structure for reference

---

## Phase 2: Set Up GitHub Repository

### Step 1: Create GitHub Account (if needed)
1. Go to https://github.com
2. Sign up for a free account

### Step 2: Create Repository
1. Click the "+" icon → "New repository"
2. Name it: `circleseven-website` (or your preferred name)
3. Set to "Public" (required for free GitHub Pages)
4. Check "Add a README file"
5. Click "Create repository"

### Step 3: Upload Your Site Files
1. On your computer, navigate to the `circleseven-website` folder
2. Initialize git and push to GitHub:

```bash
cd circleseven-website
git init
git add .
git commit -m "Initial site setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/circleseven-website.git
git push -u origin main
```

### Step 4: Enable GitHub Pages
1. In your GitHub repository, go to Settings → Pages
2. Under "Source", select "Deploy from a branch"
3. Select branch: `main`
4. Select folder: `/ (root)`
5. Click Save
6. Your site will be available at `https://YOUR_USERNAME.github.io/circleseven-website/`

---

## Phase 3: Import WordPress Content

### Step 1: Add Blog Posts
1. Copy all files from your WordPress export `_posts/` folder
2. Paste them into your new site's `_posts/` folder
3. Check the format of each post - it should look like:

```markdown
---
layout: post
title: "Your Post Title"
date: 2024-01-15 10:00:00 +0000
categories: news
---

Your post content here...
```

### Step 2: Add Pages
1. Copy files from WordPress export `_pages/` folder
2. Paste into your new site's `_pages/` folder
3. Ensure each page has proper front matter:

```markdown
---
layout: page
title: About Us
permalink: /about/
---

Your page content here...
```

### Step 3: Test Locally (Optional but Recommended)

Install Jekyll locally to preview:

```bash
# Install Ruby (if not already installed)
# On Mac, Ruby comes pre-installed

# Install Bundler
gem install bundler

# Navigate to your site folder
cd circleseven-website

# Install dependencies
bundle install

# Serve the site locally
bundle exec jekyll serve

# Open http://localhost:4000 in your browser
```

### Step 4: Commit and Push Changes

```bash
git add .
git commit -m "Add WordPress content migration"
git push
```

Wait 2-3 minutes for GitHub Pages to rebuild. Check your site at the GitHub Pages URL.

---

## Phase 4: Set Up Cloudinary for Images

### Step 1: Create Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up for free account (25GB storage, 25GB bandwidth/month)
3. Verify your email
4. Note your "Cloud Name" from the dashboard

### Step 2: Upload WordPress Media
1. In Cloudinary dashboard, click "Media Library"
2. Click "Upload" → "Upload from computer"
3. Select all images from your WordPress `/wp-content/uploads/` folder
4. Organize into folders if desired (by year, type, etc.)

### Step 3: Get Image URLs
1. Click any uploaded image in Cloudinary
2. Copy the URL - it will look like: `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/filename.jpg`
3. Use this format for all images in your content

### Step 4: Update Image References
1. Open each blog post and page
2. Find old WordPress image URLs (e.g., `/wp-content/uploads/2024/01/image.jpg`)
3. Replace with Cloudinary URLs
4. Or use find-and-replace in your code editor

**Tip**: For optimized images, Cloudinary automatically serves the best format:
```markdown
![Alt text](https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/c_scale,w_800/v1234567890/filename.jpg)
```
The `c_scale,w_800` automatically resizes to 800px width.

### Step 5: Configure CMS for Cloudinary (Optional)

Edit `/admin/config.yml` and uncomment the Cloudinary section:

```yaml
media_library:
  name: cloudinary
  config:
    cloud_name: YOUR_CLOUD_NAME
    api_key: YOUR_API_KEY
```

Get your API key from Cloudinary Dashboard → Settings → Access Keys

---

## Phase 5: Set Up Decap CMS

### Step 1: Enable Git Gateway
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your `circleseven-website` repository
4. Deploy settings:
   - Branch: `main`
   - Build command: `jekyll build`
   - Publish directory: `_site`
5. Click "Deploy site"

### Step 2: Enable Netlify Identity
1. In your Netlify site dashboard, go to Settings → Identity
2. Click "Enable Identity"
3. Under Registration preferences, select "Invite only"
4. Under Services → Git Gateway, click "Enable Git Gateway"

### Step 3: Create Your CMS User
1. Go to Identity tab
2. Click "Invite users"
3. Enter your email address
4. Check your email and accept the invitation
5. Set your password

### Step 4: Access the CMS
1. Go to `https://YOUR_NETLIFY_URL/admin/`
2. Or after DNS setup: `https://www.circleseven.co.uk/admin/`
3. Log in with your email and password
4. You can now create and edit posts and pages visually!

---

## Phase 6: Configure Domain & DNS

### Step 1: Add Custom Domain to GitHub Pages
1. In GitHub repository, go to Settings → Pages
2. Under "Custom domain", enter: `www.circleseven.co.uk`
3. Click Save
4. Check "Enforce HTTPS" (may take a few minutes to enable)

### Step 2: Update DNS at 123Reg
1. Log into your 123Reg account
2. Go to "Domain names" → select `circleseven.co.uk`
3. Click "Manage DNS"

**For GitHub Pages:**

Add these records:

| Type  | Name | Value | TTL |
|-------|------|-------|-----|
| A     | @    | 185.199.108.153 | 3600 |
| A     | @    | 185.199.109.153 | 3600 |
| A     | @    | 185.199.110.153 | 3600 |
| A     | @    | 185.199.111.153 | 3600 |
| CNAME | www  | YOUR_USERNAME.github.io | 3600 |

Replace `YOUR_USERNAME` with your GitHub username.

4. Save the DNS changes
5. Wait 24-48 hours for full DNS propagation (often faster)

### Step 3: Verify Domain
1. In GitHub, go back to Settings → Pages
2. You should see "DNS check successful" next to your custom domain
3. GitHub will automatically provision an SSL certificate

---

## Phase 7: Set Up Email Forwarding

### Step 1: Move Domain DNS to Cloudflare (Recommended)

**Why Cloudflare**: Free email forwarding, better security, free SSL, CDN

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up for free account
3. Click "Add a Site"
4. Enter `circleseven.co.uk`
5. Choose Free plan
6. Cloudflare will scan your existing DNS records

### Step 2: Update Nameservers at 123Reg
1. Cloudflare will show you two nameservers (e.g., `carter.ns.cloudflare.com` and `june.ns.cloudflare.com`)
2. Copy these
3. Log into 123Reg
4. Go to your domain → Manage DNS
5. Change nameservers to Cloudflare's nameservers
6. Save changes
7. Return to Cloudflare and click "Done, check nameservers"

**Note**: This can take 24 hours to propagate but often completes in 1-2 hours.

### Step 3: Set Up Email Routing in Cloudflare
1. Once Cloudflare is active, go to your domain dashboard
2. Click "Email" → "Email Routing"
3. Click "Get started"
4. Cloudflare will automatically create the necessary DNS records (MX, SPF, DKIM)

### Step 4: Create Email Forwards
1. Under "Destination addresses", add your personal email (e.g., `your.personal@gmail.com`)
2. Verify it (check your email for verification link)
3. Under "Routing rules", click "Create address"
4. Create forwards for all your @circleseven.co.uk addresses:
   - `info@circleseven.co.uk` → `your.personal@gmail.com`
   - `hello@circleseven.co.uk` → `your.personal@gmail.com`
   - Add as many as you need

### Step 5: Update GitHub Pages DNS in Cloudflare
1. In Cloudflare DNS, ensure these records exist:
   - Type A, Name @, Content: 185.199.108.153 (and the other 3 IPs)
   - Type CNAME, Name www, Content: YOUR_USERNAME.github.io
2. Ensure "Proxy status" (orange cloud) is ON for these records

### Step 6: Test Email Forwarding
1. Send a test email to `info@circleseven.co.uk`
2. Check it arrives at your personal email
3. When replying, it will come from your personal email (not ideal but free)

**For Professional Sending**: Consider:
- **Google Workspace** ($6/user/month) - full Gmail with custom domain
- **Microsoft 365** ($6/user/month) - Outlook with custom domain
- **Zoho Mail** (Free for 1 domain, 5 users) - decent free option

---

## Phase 8: Final Checks & Launch

### Pre-Launch Checklist

- [ ] All pages migrated and displaying correctly
- [ ] All blog posts migrated with correct dates
- [ ] Images loading from Cloudinary
- [ ] Internal links working (update any old WordPress URLs)
- [ ] Contact forms working (may need to add Formspree or Netlify Forms)
- [ ] SSL certificate active (https://www.circleseven.co.uk)
- [ ] Decap CMS accessible and working
- [ ] Email forwarding tested and working
- [ ] 404 page exists (create `/404.html`)
- [ ] Sitemap generated (`/sitemap.xml`)
- [ ] Google Analytics updated (if used)
- [ ] Google Search Console updated with new sitemap

### Step 1: Set Up Redirects (if needed)

Create a `_redirects` file in your repository root:

```
# Redirect old WordPress URLs to new structure
/blog/2024/01/old-post-name/  /2024/01/01/old-post-name/  301
```

### Step 2: Update External Links
- Update social media profiles with new site
- Update email signatures
- Update any directory listings

### Step 3: Monitor Traffic
- Check Google Search Console for crawl errors
- Monitor Cloudinary usage (stay within free tier)
- Check GitHub Pages usage (100GB bandwidth/month limit)

### Step 4: Cancel Old Hosting
**IMPORTANT**: Don't cancel Krystal hosting until:
- Site has been live on GitHub Pages for at least 1 week
- You've verified everything works
- You've confirmed email forwarding is working
- You've backed up everything from Krystal

---

## Ongoing Maintenance

### Editing Content
- Go to `https://www.circleseven.co.uk/admin/`
- Log in to Decap CMS
- Create/edit posts and pages visually
- Changes automatically commit to GitHub and deploy

### Adding Images
- Upload to Cloudinary Media Library
- Copy the URL
- Use in your posts via the CMS or markdown

### Updating Site Design
- Edit files in your local `circleseven-website` folder
- Push changes to GitHub
- Site rebuilds automatically in 2-3 minutes

### Backup Strategy
- All content is backed up in GitHub automatically
- Images backed up in Cloudinary
- Export Cloudinary media periodically as additional backup
- Download your GitHub repository regularly

---

## Troubleshooting

### Site Not Building
1. Check GitHub Actions tab in your repository
2. Look for build errors
3. Common issues:
   - Invalid YAML in front matter
   - Missing required fields
   - Incorrect file naming

### Images Not Loading
1. Check Cloudinary URLs are correct
2. Verify Cloudinary account is active
3. Check bandwidth limits

### CMS Not Working
1. Verify Netlify Identity is enabled
2. Check Git Gateway is active
3. Clear browser cache and try again
4. Check `/admin/config.yml` syntax

### Email Not Forwarding
1. Verify DNS records in Cloudflare
2. Check Email Routing is enabled
3. Ensure destination email is verified
4. Check spam folder

### Domain Not Resolving
1. Check DNS propagation: https://dnschecker.org
2. Verify nameservers at 123Reg point to Cloudflare
3. Wait 24-48 hours for full propagation
4. Check GitHub Pages custom domain setting

---

## Support & Resources

### Documentation
- Jekyll: https://jekyllrb.com/docs/
- GitHub Pages: https://docs.github.com/en/pages
- Decap CMS: https://decapcms.org/docs/
- Cloudinary: https://cloudinary.com/documentation
- Cloudflare Email: https://developers.cloudflare.com/email-routing/

### Getting Help
- Jekyll Talk Forum: https://talk.jekyllrb.com/
- GitHub Community: https://github.community/
- Stack Overflow: Use tags `jekyll`, `github-pages`, `decap-cms`

---

## Cost Comparison

### Old Setup (WordPress on Krystal)
- Hosting: ~£5-10/month
- Domain: ~£10/year (at 123Reg)
- **Total**: ~£60-130/year

### New Setup (GitHub Pages)
- GitHub Pages: **Free**
- Cloudinary: **Free** (25GB)
- Cloudflare Email: **Free**
- Netlify (for CMS): **Free**
- Domain: ~£10/year (at 123Reg)
- **Total**: ~£10/year

**Savings**: ~£50-120/year

---

Good luck with your migration! Take it step by step and don't hesitate to test thoroughly before cancelling your old hosting.
