# Circle Seven Custom Admin

A lightweight, GitHub-powered content management system for Jekyll sites, built specifically for Circle Seven.

## 🎯 Overview

This custom admin provides a WordPress-style interface for managing your Jekyll blog without requiring a database. All content is stored in GitHub, ensuring version control and seamless integration with your existing workflow.

### Key Features

- ✅ **Post Management** - Create, edit, and delete blog posts with markdown editor
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

---

## 📚 Quick Guide

### Posts
- Click **Posts** → **New Post**
- Fill in title, date, image, categories, tags
- Write content in Markdown
- Click **Save Post**

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
