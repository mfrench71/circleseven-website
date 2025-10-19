# Circle Seven Website

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)](https://app.netlify.com/sites/your-site-name/deploys)
[![Hosted on Cloudflare](https://img.shields.io/badge/DNS-Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Images on Cloudinary](https://img.shields.io/badge/Images-Cloudinary-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Jekyll](https://img.shields.io/badge/Jekyll-3.9+-CC0000?logo=jekyll&logoColor=white)](https://jekyllrb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Portfolio and blog documenting Digital Art and Technology projects, academic work, and creative coding experiments from Plymouth University.

🌐 **Live Site:** [https://circleseven.co.uk](https://circleseven.co.uk)

## Overview

This site showcases coursework and projects from a BA (Hons) Digital Art & Technology degree at Plymouth University (2015-2019), covering:

- Interactive media and physical computing
- Creative coding and generative art
- Digital photography and motion graphics
- Retro computing and game development
- Web technologies and mobile development

## Infrastructure

Modern, performant static site built on free, enterprise-grade services:

| Service | Purpose | Tier |
|---------|---------|------|
| **[Netlify](https://netlify.com)** | Hosting & CDN | Free (100GB/month) |
| **[Cloudflare](https://cloudflare.com)** | DNS & Email Routing | Free |
| **[Cloudinary](https://cloudinary.com)** | Image CDN & Optimization | Free (25GB storage) |
| **[GitHub](https://github.com)** | Source Control & CI/CD | Free |
| **[Decap CMS](https://decapcms.org)** | Content Management | Free |

### Architecture Flow

```
┌─────────────┐
│   Visitor   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Cloudflare    │ ◄── DNS & Email Routing
│   (DNS/CDN)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Netlify      │ ◄── Site Hosting
│  (Static Host)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ GitHub │ │Cloudinary│ ◄── Images
│(Source)│ │  (CDN)   │
└────────┘ └──────────┘
```

## Technical Stack

- **Generator:** Jekyll 3.9+ static site generator
- **Hosting:** Netlify with automated deployments
- **DNS:** Cloudflare (circleseven.co.uk)
- **Email:** Cloudflare Email Routing → Gmail
- **Images:** Cloudinary CDN with automatic optimization
- **CMS:** Decap CMS for visual content editing
- **Theme:** Minima (heavily customized)
- **Content:** 79 blog posts across 22 categories

### Key Features

✅ Responsive mega menu navigation
✅ Full-text search with Lunr.js
✅ Category-based organization
✅ Pagination (10 posts per page)
✅ Embedded content support (YouTube, Vimeo, SoundCloud, Leaflet maps, Sketchfab)
✅ Featured images with lazy loading
✅ Mobile-first responsive design
✅ SEO optimized with structured data (JSON-LD)
✅ WCAG AA accessibility compliance
✅ Custom editor components for maps, galleries, videos

## Directory Structure

```
circleseven-website/
├── _config.yml              # Site configuration
├── _includes/               # Reusable components
│   ├── header.html          # Navigation and menu
│   ├── footer.html          # Footer
│   ├── head.html            # Custom head with Netlify Identity
│   ├── structured-data.html # JSON-LD schemas
│   └── skip-to-content.html # Accessibility skip link
├── _layouts/
│   ├── default.html         # Base layout
│   ├── post.html            # Blog post layout
│   ├── page.html            # Static page layout
│   ├── category.html        # Category archive layout
│   └── tag.html             # Tag archive layout
├── _posts/                  # Blog posts (79 markdown files)
├── assets/
│   ├── css/
│   │   ├── variables.css    # CSS custom properties (teal theme)
│   │   ├── layout.css       # Main layout styles
│   │   ├── menu.css         # Navigation styles
│   │   ├── cards.css        # Post card components
│   │   ├── embeds.css       # Embedded content styles
│   │   ├── gallery.css      # Image gallery styles
│   │   └── tags.css         # Tag cloud styles
│   └── js/
│       ├── menu.js          # Mobile menu interactions
│       ├── embeds.js        # Embed handling (Leaflet, Sketchfab)
│       ├── lightbox.js      # GLightbox integration
│       └── lazy-cards.js    # Lazy loading for post cards
├── category/                # Category landing pages (22 pages)
├── tag/                     # Tag landing pages
├── admin/                   # Decap CMS admin interface
│   ├── index.html           # CMS entry point
│   ├── config.yml           # CMS configuration
│   ├── cms.js               # Custom editor components
│   └── README.md            # CMS documentation
├── docs/                    # Documentation
│   └── EMAIL_MIGRATION_CLOUDFLARE.md
├── index.html               # Homepage with pagination
├── categories.md            # All categories overview
├── tags.md                  # Tag cloud page
├── search.md                # Search page
├── about.md                 # About page
├── contact.md               # Contact page
├── 404.html                 # Custom error page
├── robots.txt               # SEO crawler instructions
└── netlify.toml             # Netlify build configuration
```

## Development Setup

### Prerequisites

- Ruby 2.7+ (check with `ruby -v`)
- Bundler (`gem install bundler`)
- Git

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mfrench71/circleseven-website.git
   cd circleseven-website
   ```

2. **Install dependencies:**
   ```bash
   bundle install
   ```

3. **Run local server:**
   ```bash
   bundle exec jekyll serve --baseurl ""
   ```

4. **View site:**
   - Open [http://localhost:4000](http://localhost:4000) in your browser
   - Site auto-rebuilds on file changes

### Useful Commands

```bash
# Serve with drafts
bundle exec jekyll serve --drafts

# Serve with future-dated posts
bundle exec jekyll serve --future

# Build for production
bundle exec jekyll build

# Clean build artifacts
bundle exec jekyll clean
```

## Content Management

### Using Decap CMS (Recommended)

1. Visit [https://circleseven.co.uk/admin/](https://circleseven.co.uk/admin/)
2. Authenticate with Netlify Identity
3. Create/edit posts visually with rich editor
4. Use custom components:
   - 📍 **Leaflet Map** - Insert interactive maps
   - 🖼️ **Image Gallery** - Create lightbox galleries
   - 🎬 **Vimeo/YouTube** - Embed videos
5. Publish changes (auto-deploys to Netlify)

### Custom Editor Components

The CMS includes specialized components for rich content:

- **Leaflet Maps:** Insert maps with lat/lng/zoom controls
- **Galleries:** Multi-image galleries with alt text and dimensions
- **Video Embeds:** Vimeo and YouTube with responsive containers
- **Preview Templates:** Live preview styled to match production site

### Manual Markdown Editing

1. Create file: `_posts/YYYY-MM-DD-title-slug.md`

2. Add front matter:
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: 2025-01-01 12:00:00 +0000
   categories: ["Category Name"]
   tags: ["tag1", "tag2"]
   image: https://res.cloudinary.com/circleseven/image/upload/featured.jpg
   ---
   ```

3. Write content in Markdown

4. Commit and push:
   ```bash
   git add _posts/2025-01-01-your-post.md
   git commit -m "Add new post"
   git push
   ```

## Deployment

### Automated (Default)

1. Push to `main` branch on GitHub
2. Netlify detects changes
3. Builds site with Jekyll
4. Deploys to CDN globally
5. Live in 2-3 minutes

### Build Configuration

`netlify.toml`:
```toml
[build]
  command = "bundle exec jekyll build"
  publish = "_site"

[build.environment]
  RUBY_VERSION = "3.1.0"
  JEKYLL_ENV = "production"
```

## Email Configuration

Email sent to `@circleseven.co.uk` is handled by Cloudflare Email Routing:

- **Incoming:** Cloudflare MX records → forwards to Gmail
- **Authentication:** SPF, DKIM, DMARC configured
- **Catch-all:** Any address @circleseven.co.uk forwards
- **Sending:** Use Gmail's "Send as" feature or SMTP service

See `docs/EMAIL_MIGRATION_CLOUDFLARE.md` for setup details.

## Embedded Content

### YouTube/Vimeo Videos

```html
<figure>
<div class="embed-container">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
</div>
</figure>
```

### Leaflet Maps

```html
<div class="leaflet-map" data-lat="50.375" data-lng="-4.143" data-zoom="14"></div>
```

### Image Galleries

```html
<div class="gallery">
  <figure><a href="full-size.jpg"><img src="thumb.jpg" alt="Description" loading="lazy"></a></figure>
  <figure><a href="full-size2.jpg"><img src="thumb2.jpg" alt="Description" loading="lazy"></a></figure>
</div>
```

## Performance

Optimized for speed and efficiency:

- ✅ **CSS minification** (Sass compression)
- ✅ **Lazy-loaded images** (native loading="lazy")
- ✅ **Cloudinary CDN** (automatic WebP/AVIF)
- ✅ **Preconnect hints** for external resources
- ✅ **Deferred JavaScript** loading
- ✅ **Netlify CDN** (global edge network)
- ✅ **Gzip/Brotli** compression

**Lighthouse Scores:** 95+ on all metrics

## SEO

Comprehensive SEO optimization:

- ✅ Semantic HTML5 markup
- ✅ Jekyll SEO Tag plugin
- ✅ Structured data (JSON-LD schemas)
- ✅ XML sitemap (auto-generated)
- ✅ RSS feed
- ✅ robots.txt
- ✅ Meta descriptions
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Canonical URLs

## Accessibility

WCAG AA compliant features:

- ✅ Skip-to-content link
- ✅ Semantic HTML landmarks
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Color contrast ratios (4.5:1+)
- ✅ Alt text on all images
- ✅ Responsive text sizing

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Cost Breakdown

### Current (2025)
- **Hosting:** $0 (Netlify free tier)
- **DNS:** $0 (Cloudflare)
- **Email:** $0 (Cloudflare Email Routing)
- **Images:** $0 (Cloudinary free tier)
- **CMS:** $0 (Decap CMS)
- **Domain:** ~£10/year (123-reg)
- **Total:** ~£10/year

### Previous (WordPress)
- **Hosting:** ~£60-130/year (Krystal)
- **Domain:** ~£10/year
- **Total:** ~£70-140/year

**Annual Savings:** ~£60-130

## Documentation

- `admin/README.md` - Decap CMS setup and usage
- `docs/EMAIL_MIGRATION_CLOUDFLARE.md` - Email configuration guide

## Contributing

This is a personal portfolio site, but if you notice issues:

1. Open an issue describing the problem
2. Or submit a pull request with fixes

## License

**Content:** © Matthew French. All rights reserved.

**Code:** (HTML/CSS/JS/Jekyll templates) available under [MIT License](https://opensource.org/licenses/MIT).

## Contact

- **Website:** [https://circleseven.co.uk](https://circleseven.co.uk)
- **Email:** mail@circleseven.co.uk
- **GitHub:** [@mfrench71](https://github.com/mfrench71)

---

Built with [Jekyll](https://jekyllrb.com) • Hosted on [Netlify](https://netlify.com) • DNS by [Cloudflare](https://cloudflare.com)
