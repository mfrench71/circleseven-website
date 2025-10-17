# Circle Seven Website

Portfolio and blog documenting Digital Art and Technology projects, academic work, and creative coding experiments from Plymouth University.

🌐 **Live Site:** [https://mfrench71.github.io/circleseven-website/](https://mfrench71.github.io/circleseven-website/)

## Overview

This site showcases coursework and projects from a BA (Hons) Digital Art & Technology degree at Plymouth University (2015-2019), covering:

- Interactive media and physical computing
- Creative coding and generative art
- Digital photography and motion graphics
- Retro computing and game development
- Web technologies and mobile development

## Technical Stack

- **Platform:** Jekyll 3.9+ static site generator
- **Hosting:** GitHub Pages with GitHub Actions
- **Theme:** Minima (customized)
- **Content:** 79 blog posts across 22 categories
- **CMS:** Decap CMS (formerly Netlify CMS) for content editing

### Key Features

✅ Responsive mega menu navigation
✅ Full-text search with Lunr.js
✅ Category-based organization
✅ Pagination (10 posts per page)
✅ Embedded content support (YouTube, Vimeo, SoundCloud, Leaflet maps, Sketchfab)
✅ Featured images on all listings
✅ Mobile-first responsive design
✅ Lazy-loaded images for performance
✅ SEO optimized with structured data (JSON-LD)
✅ WCAG AA accessibility compliance

## Directory Structure

```
circleseven-website/
├── _config.yml              # Site configuration
├── _includes/               # Reusable components
│   ├── header.html          # Navigation and menu
│   ├── footer.html          # Footer
│   ├── custom-head.html     # Custom CSS/JS includes
│   ├── structured-data.html # JSON-LD schemas
│   └── skip-to-content.html # Accessibility skip link
├── _layouts/
│   ├── default.html         # Base layout
│   ├── post.html            # Blog post layout (theme)
│   ├── page.html            # Static page layout (theme)
│   └── category.html        # Category archive layout
├── _posts/                  # Blog posts (79 markdown files)
├── assets/
│   ├── css/
│   │   ├── menu.css         # Navigation styles
│   │   ├── embeds.css       # Embedded content styles
│   │   ├── post-layouts.css # Post listing styles
│   │   └── variables.css    # CSS custom properties
│   └── js/
│       ├── menu.js          # Mobile menu interactions
│       └── embeds.js        # Embed handling (Leaflet, Sketchfab)
├── category/                # Category landing pages (22 pages)
├── admin/                   # Decap CMS admin interface
├── index.html               # Homepage with pagination
├── categories.md            # All categories overview
├── search.md                # Search page
├── about.md                 # About page
├── 404.html                 # Custom error page
└── robots.txt               # SEO crawler instructions
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

### Adding a New Post

#### Method 1: Using Decap CMS (Recommended)

1. Visit `/admin/` on the live site
2. Authenticate with GitHub
3. Click "New Post"
4. Fill in title, content, categories, and image
5. Save and publish

#### Method 2: Manual Markdown

1. Create a new file in `_posts/` with format: `YYYY-MM-DD-title-slug.md`

2. Add front matter:
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: 2025-01-01 12:00:00 +0000
   categories: ["Category Name"]
   image: /assets/images/featured.jpg
   ---
   ```

3. Write content in Markdown below the front matter

4. Commit and push:
   ```bash
   git add _posts/2025-01-01-your-post.md
   git commit -m "Add new post"
   git push
   ```

### Creating a New Category

1. Create a new file: `category/category-name.md`

2. Add front matter:
   ```yaml
   ---
   layout: category
   title: "Category Display Name"
   category: "category-name"
   permalink: /category/category-name/
   description: "Brief description of this category"
   ---
   ```

3. Category will automatically appear in navigation if it has posts

## Deployment

The site uses GitHub Actions for automated deployment.

### How It Works

1. Push changes to `main` branch
2. GitHub Actions workflow (`.github/workflows/jekyll.yml`) triggers
3. Jekyll builds site with custom plugins
4. Built site deploys to GitHub Pages
5. Site live within 1-2 minutes

### Manual Deployment

If needed, you can trigger a manual deployment:

1. Go to [Actions tab](https://github.com/mfrench71/circleseven-website/actions)
2. Select "Deploy Jekyll site to GitHub Pages"
3. Click "Run workflow"

## Embedded Content

### YouTube/Vimeo Videos

```html
<div class="embed-container">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen loading="lazy"></iframe>
</div>
```

### Leaflet Maps

```html
<div class="leaflet-map" data-lat="50.375" data-lng="-4.143" data-zoom="14"></div>
```

### Sketchfab 3D Models

```html
<iframe src="https://sketchfab.com/models/MODEL_ID/embed" frameborder="0" allowfullscreen loading="lazy"></iframe>
```

### SoundCloud Audio

```html
<iframe src="https://w.soundcloud.com/player/?url=TRACK_URL" frameborder="0" loading="lazy"></iframe>
```

## Customization

### Changing Colors

Edit `assets/css/variables.css`:

```css
:root {
  --color-primary: #2a7ae2;
  --color-text: #111;
  /* ... more variables ... */
}
```

### Modifying Navigation

Edit `_includes/header.html` to:
- Add/remove menu items
- Adjust mega menu categories
- Change menu structure

### Updating Site Info

Edit `_config.yml`:

```yaml
title: Your Site Title
description: Your site description
email: your@email.com
author: Your Name
```

## Performance

The site is optimized for performance:

- ✅ CSS minification (via Sass)
- ✅ Lazy-loaded images
- ✅ Preconnect hints for external resources
- ✅ Deferred JavaScript loading
- ✅ CSS variables for consistent theming
- ✅ Optimized Cloudinary image URLs

**Lighthouse Score:** 95+ on all metrics

## SEO

- ✅ Semantic HTML markup
- ✅ Jekyll SEO Tag plugin
- ✅ Structured data (JSON-LD)
- ✅ XML sitemap
- ✅ RSS feed
- ✅ robots.txt
- ✅ Meta descriptions
- ✅ Open Graph tags

## Accessibility

- ✅ WCAG AA compliant
- ✅ Skip-to-content link
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Color contrast ratios

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome)

## Migration

This site was migrated from WordPress. See documentation:

- `MIGRATION_GUIDE.md` - WordPress to Jekyll migration steps
- `CLOUDINARY_SETUP.md` - Image hosting configuration
- `DNS_SETUP_GUIDE.md` - Custom domain setup
- `SITE_AUDIT_2025.md` - Comprehensive site analysis

## Maintenance Scripts

Located in the root directory:

- `convert_wordpress_markup.py` - Convert WordPress HTML to clean markup
- `add_lazy_loading.py` - Add lazy loading to images
- `remove_inline_css.py` - Extract inline CSS to external file

## Contributing

This is a personal portfolio site, but if you notice issues:

1. Open an issue describing the problem
2. Or submit a pull request with fixes

## License

Content © Matthew French. All rights reserved.

Code (HTML/CSS/JS) available under MIT License.

## Contact

- **Email:** info@circleseven.co.uk
- **GitHub:** [@mfrench71](https://github.com/mfrench71)
- **Website:** [https://mfrench71.github.io/circleseven-website/](https://mfrench71.github.io/circleseven-website/)

---

Built with ❤️ using [Jekyll](https://jekyllrb.com) and [GitHub Pages](https://pages.github.com)
