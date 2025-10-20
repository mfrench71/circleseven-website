# Circle Seven Custom Admin

A lightweight, GitHub-powered content management system for Jekyll sites, built specifically for Circle Seven.

## 🎯 Overview

This custom admin provides a WordPress-style interface for managing your Jekyll blog without requiring a database. All content is stored in GitHub, ensuring version control and seamless integration with your existing workflow.

### Key Features

- ✅ **Post Management** - Create, edit, and delete blog posts with markdown editor
- ✅ **Media Library** - Browse, upload, search, and manage Cloudinary images
- ✅ **Taxonomy Management** - Organize categories and tags with drag-and-drop sorting
- ✅ **Settings Editor** - Modify `_config.yml` through an intuitive interface
- ✅ **Trash System** - Soft delete with restore capability
- ✅ **Image Previews** - Cloudinary integration with thumbnail and full-size modal
- ✅ **WordPress-style UX** - Autocomplete taxonomy, collapsible categories, unsaved changes protection
- ✅ **Offline Capable** - Service Worker caching for faster repeat visits
- ✅ **Mobile Responsive** - Works on all devices

---

## 🚀 Getting Started

### Access the Admin

- **Production**: https://circleseven.co.uk/admin-custom/
- **Local**: http://localhost:8888/admin-custom/ (with Netlify Dev)

### Authentication

1. Navigate to `/admin-custom/`
2. Click "Log In"
3. Authenticate with Netlify Identity

### Environment Setup

The Media Library requires the following environment variable in Netlify:

1. Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. Add `CLOUDINARY_API_SECRET` with your Cloudinary API Secret
3. Find your API Secret at: https://console.cloudinary.com/settings/api-keys
4. Trigger a redeploy after adding the variable

---

## 📚 Quick Guide

### Posts
- Click **Posts** → **New Post**
- Fill in title, date, image, categories, tags
- Use **Browse Library** button to select featured images from Cloudinary
- Write content in Markdown
- Click **Save Post**

### Media Library
- Click **Media Library** → Browse all images from Cloudinary
- Use search to find images by filename
- Filter by "All Media", "Images Only", or "Recently Uploaded"
- Click **Upload Image** to add new files
- Hover over images for quick actions (Copy URL, View Full Size)

### Taxonomy
- Click **Taxonomy** → Add/Edit/Delete categories or tags
- Drag to reorder
- Click **Save Changes**

### Settings
- Click **Settings** → Modify site configuration
- Click **Save Settings** (triggers rebuild)

---

## 📁 File Structure

```
/admin-custom/
├── index.html              # Main interface
├── app.js                  # Application logic
├── styles.css              # All styles
├── sw.js                   # Service Worker
├── README.md               # This file
├── OPTIMIZATION-GUIDE.md   # Performance docs
└── FEATURES-ROADMAP.md     # Future features
```

---

## 🔧 Documentation

- **Main Guide**: This README
- **Optimizations**: [OPTIMIZATION-GUIDE.md](./OPTIMIZATION-GUIDE.md)
- **Future Features**: [FEATURES-ROADMAP.md](./FEATURES-ROADMAP.md)

---

**Version**: 1.0.0 | **Status**: Production Ready ✅
