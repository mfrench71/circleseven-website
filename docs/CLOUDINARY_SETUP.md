# Cloudinary Image Hosting Setup Guide

## Why Cloudinary?

- **Free tier**: 25GB storage, 25GB bandwidth/month (perfect for medium-sized sites)
- **Automatic optimization**: Serves WebP, AVIF formats automatically
- **CDN**: Fast image delivery worldwide
- **Transformations**: Resize, crop, optimize images on-the-fly via URL
- **CMS integration**: Works with Decap CMS

---

## Step-by-Step Setup

### 1. Create Cloudinary Account

1. Visit https://cloudinary.com/users/register_free
2. Sign up using email or GitHub
3. Choose "Developer" as your role
4. Verify your email address
5. Complete the onboarding survey (optional)

### 2. Find Your Cloud Name

1. After logging in, you'll see your Dashboard
2. Your **Cloud name** is displayed prominently
3. Example: `dz1234abc`
4. Save this - you'll need it for image URLs

### 3. Get Your API Credentials

1. In Dashboard, go to Settings (gear icon) → Access Keys
2. You'll see:
   - **Cloud Name**: `dz1234abc`
   - **API Key**: `123456789012345`
   - **API Secret**: `abcdefghijklmnopqrstuvwxyz` (keep secret!)
3. Copy these to a safe place

---

## Upload Your WordPress Images

### Option A: Web Interface (Simple)

1. Go to Media Library in Cloudinary
2. Click "Upload" button
3. Select "Upload from computer"
4. Navigate to your WordPress `/wp-content/uploads/` folder
5. Select all images and upload
6. Wait for upload to complete

**Tip**: Organize by folders:
- Create folder: `blog-images`
- Create folder: `page-images`
- Create folder: `logos`

### Option B: Bulk Upload CLI (Advanced)

Install Cloudinary CLI:
```bash
npm install -g cloudinary-cli
```

Configure with your credentials:
```bash
cloudinary config
# Enter your Cloud Name, API Key, and API Secret
```

Upload entire folder:
```bash
cloudinary upload_dir /path/to/wp-content/uploads/ --folder wordpress-images
```

### Option C: Using Web Browser Upload

1. Drag and drop folders directly into Cloudinary Media Library
2. Most modern browsers support folder upload

---

## Understanding Cloudinary URLs

### Basic URL Structure

```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/FILENAME.jpg
```

Example:
```
https://res.cloudinary.com/dz1234abc/image/upload/v1234567890/hero-image.jpg
```

Components:
- `res.cloudinary.com` - Cloudinary CDN
- `dz1234abc` - Your cloud name
- `image/upload` - Media type and delivery
- `v1234567890` - Version number (optional, for cache busting)
- `hero-image.jpg` - Filename

### URL Transformations

**Resize to width 800px:**
```
https://res.cloudinary.com/dz1234abc/image/upload/w_800/hero-image.jpg
```

**Resize and crop to square:**
```
https://res.cloudinary.com/dz1234abc/image/upload/w_400,h_400,c_fill/hero-image.jpg
```

**Auto quality and format:**
```
https://res.cloudinary.com/dz1234abc/image/upload/q_auto,f_auto/hero-image.jpg
```

**Combine transformations:**
```
https://res.cloudinary.com/dz1234abc/image/upload/w_800,q_auto,f_auto/hero-image.jpg
```

### Recommended Default Transformations

For all images in blog posts, use:
```
/w_1200,c_limit,q_auto,f_auto/
```

This:
- Limits max width to 1200px
- Maintains aspect ratio
- Auto-optimizes quality
- Auto-selects best format (WebP, AVIF)

---

## Get Image URLs

### From Cloudinary Dashboard

1. Go to Media Library
2. Click any image
3. Copy the URL from the "Link" field
4. Or click "Copy URL" button

### For Transformed Images

1. Click image in Media Library
2. Click "Transformations" tab
3. Add transformations (width, height, crop, etc.)
4. Copy the transformed URL

---

## Update Jekyll Content

### In Markdown Files

Replace old WordPress image URLs:

**Old:**
```markdown
![My Image](/wp-content/uploads/2024/01/image.jpg)
```

**New:**
```markdown
![My Image](https://res.cloudinary.com/dz1234abc/image/upload/w_1200,q_auto,f_auto/image.jpg)
```

### Find and Replace

Use your code editor to find and replace:

**Find:**
```
/wp-content/uploads/
```

**Replace:**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_1200,q_auto,f_auto/
```

**Tip**: Do this in batches and test to ensure URLs are correct.

---

## Integrate with Decap CMS

### Update CMS Configuration

Edit `/admin/config.yml`:

```yaml
media_library:
  name: cloudinary
  config:
    cloud_name: YOUR_CLOUD_NAME
    api_key: YOUR_API_KEY
```

### How It Works

1. When editing in Decap CMS
2. Click "Add Image" in the editor
3. Cloudinary media library opens
4. Upload or select existing images
5. Image URL automatically inserted into your content

### Security Note

Your **API Secret** should never be exposed in the frontend config. The above setup is safe because:
- CMS only needs Cloud Name and API Key
- API Secret stays secure
- Only signed uploads need the secret

---

## Optimize Your Images Before Upload

While Cloudinary handles optimization, uploading smaller files saves bandwidth:

### Using ImageOptim (Mac)
1. Download from https://imageoptim.com
2. Drag images to compress
3. Upload to Cloudinary

### Using TinyPNG
1. Visit https://tinypng.com
2. Upload up to 20 images at once
3. Download compressed versions
4. Upload to Cloudinary

### Using CLI Tools
```bash
# Install imagemin-cli
npm install -g imagemin-cli imagemin-mozjpeg imagemin-pngquant

# Optimize folder
imagemin wp-content/uploads/* --out-dir=optimized-uploads
```

---

## Cloudinary Best Practices

### 1. Use Consistent Transformations

Create a standard transformation for blog images:

```
w_1200,c_limit,q_auto,f_auto
```

Apply it to all images for consistency.

### 2. Use Folders

Organize by:
- `/blog-posts/` - Blog post images
- `/pages/` - Page images
- `/logos/` - Brand assets
- `/user-uploads/` - User-generated content

### 3. Enable Automatic Backup

1. In Settings → Storage
2. Enable "Backup" (paid feature, but worth it)
3. Or manually export periodically

### 4. Monitor Usage

1. Check Dashboard for storage usage
2. Check bandwidth usage monthly
3. Free tier: 25GB storage, 25GB/month bandwidth
4. Set up usage alerts in Settings

### 5. Named Transformations

Create reusable transformations:

1. Go to Settings → Transformations
2. Click "Add transformation"
3. Name it: `blog_post_image`
4. Set parameters: `w_1200,c_limit,q_auto,f_auto`
5. Use in URLs: `/t_blog_post_image/image.jpg`

---

## Jekyll Integration Examples

### Simple Image Include

Create `_includes/cloudinary-image.html`:

```liquid
{% assign cloud_name = "YOUR_CLOUD_NAME" %}
{% assign transformation = "w_1200,c_limit,q_auto,f_auto" %}

<img
  src="https://res.cloudinary.com/{{ cloud_name }}/image/upload/{{ transformation }}/{{ include.src }}"
  alt="{{ include.alt }}"
  loading="lazy"
>
```

Use in posts:
```liquid
{% include cloudinary-image.html src="my-image.jpg" alt="Description" %}
```

### Responsive Images

Create `_includes/responsive-image.html`:

```liquid
{% assign cloud_name = "YOUR_CLOUD_NAME" %}
{% assign base_url = "https://res.cloudinary.com/" | append: cloud_name | append: "/image/upload" %}

<img
  src="{{ base_url }}/w_1200,q_auto,f_auto/{{ include.src }}"
  srcset="{{ base_url }}/w_400,q_auto,f_auto/{{ include.src }} 400w,
          {{ base_url }}/w_800,q_auto,f_auto/{{ include.src }} 800w,
          {{ base_url }}/w_1200,q_auto,f_auto/{{ include.src }} 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  alt="{{ include.alt }}"
  loading="lazy"
>
```

Use in posts:
```liquid
{% include responsive-image.html src="my-image.jpg" alt="Description" %}
```

---

## Migration Script

Create `migrate-images.sh` to help automate URL replacement:

```bash
#!/bin/bash

# Configuration
CLOUD_NAME="YOUR_CLOUD_NAME"
TRANSFORMATION="w_1200,c_limit,q_auto,f_auto"
OLD_PATH="/wp-content/uploads/"
NEW_BASE="https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${TRANSFORMATION}/"

# Find all markdown files and replace
find _posts _pages -name "*.md" -type f -exec sed -i '' "s|${OLD_PATH}|${NEW_BASE}|g" {} +

echo "Image URLs updated!"
```

Make executable and run:
```bash
chmod +x migrate-images.sh
./migrate-images.sh
```

**Note**: Test on a copy first!

---

## Testing Your Setup

### 1. Test Image Loading

Create a test post in `_posts/2025-01-01-image-test.md`:

```markdown
---
layout: post
title: "Image Test"
date: 2025-01-01
---

## Test Image

![Test](https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_800,q_auto,f_auto/test-image.jpg)
```

Build and check if image loads.

### 2. Test Transformations

Try different URLs:
```
/w_400,h_400,c_fill/test-image.jpg  (square crop)
/w_800,q_auto,f_auto/test-image.jpg  (responsive width)
/e_grayscale/test-image.jpg  (grayscale effect)
```

### 3. Test CMS Upload

1. Go to `/admin/`
2. Create new post
3. Upload image via Cloudinary widget
4. Verify URL is inserted correctly

---

## Troubleshooting

### Images Not Loading

**Problem**: 404 errors on image URLs

**Solutions**:
1. Check cloud name is correct
2. Verify image was uploaded to Cloudinary
3. Check image filename matches URL
4. Ensure public_id is correct (no spaces, special chars)

### Images Too Large

**Problem**: Slow page load times

**Solutions**:
1. Add `q_auto,f_auto` to all URLs
2. Use `w_1200` or `w_800` to limit width
3. Enable lazy loading: `loading="lazy"` in img tags

### CMS Upload Not Working

**Problem**: Can't upload via Decap CMS

**Solutions**:
1. Verify API Key in `/admin/config.yml`
2. Check browser console for errors
3. Ensure Cloudinary account is active
4. Try clearing browser cache

### Bandwidth Limit Exceeded

**Problem**: Images stop loading mid-month

**Solutions**:
1. Check usage in Cloudinary dashboard
2. Optimize image sizes (use smaller widths)
3. Enable better caching headers
4. Consider upgrading plan if needed ($89/month for 75GB)

---

## Free Tier Limits

- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25 credits/month (1 credit = 1000 transformations)
- **Admin users**: 1
- **Support**: Community only

### What If You Exceed Limits?

**Storage (25GB)**:
- Delete unused images
- Compress images before upload
- Move some assets to GitHub (logos, icons)

**Bandwidth (25GB/month)**:
- Optimize images more aggressively
- Use smaller sizes
- Enable browser caching
- Consider paid plan ($89/month for 75GB)

---

## Cost Comparison

### Cloudinary Free Tier
- Cost: **$0/month**
- Storage: 25GB
- Bandwidth: 25GB/month
- Good for: Most small-medium sites

### Cloudinary Plus Plan
- Cost: **$89/month**
- Storage: 110GB
- Bandwidth: 110GB/month
- Features: Priority support, advanced analytics

### Alternative: AWS S3 + CloudFront
- Storage: ~$0.60/month for 25GB
- Bandwidth: ~$2.00/month for 25GB
- More complex setup
- No built-in transformations

**Verdict**: Cloudinary free tier is best for most sites.

---

## Backup Strategy

### Export Your Images

Use Cloudinary API to download all images:

```bash
# Install cloudinary CLI
npm install -g cloudinary-cli

# Login
cloudinary config

# Download all images
cloudinary download_folder --all --output ./cloudinary-backup/
```

### Regular Backups

Create a monthly backup cron job:

```bash
# Add to crontab: Run on 1st of each month
0 0 1 * * cd /path/to/backup && cloudinary download_folder --all --output ./cloudinary-backup-$(date +\%Y-\%m)/
```

---

## Support & Resources

- **Documentation**: https://cloudinary.com/documentation
- **API Reference**: https://cloudinary.com/documentation/image_transformations
- **Community**: https://community.cloudinary.com
- **Status**: https://status.cloudinary.com

---

Your images are now hosted on a global CDN with automatic optimization!
