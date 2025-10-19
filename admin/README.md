# Decap CMS Admin Setup

This directory contains the Decap CMS (formerly Netlify CMS) configuration for managing your Jekyll blog content.

## Features

### Custom Editor Components

The CMS includes custom components for easy content insertion:

1. **📍 Leaflet Map** - Insert interactive maps with latitude, longitude, and zoom level
2. **🖼️ Image Gallery** - Create responsive image galleries with lightbox support
3. **🎬 Vimeo Video** - Embed Vimeo videos with responsive containers
4. **📺 YouTube Video** - Embed YouTube videos with responsive containers

### Preview Templates

Custom preview templates are configured to show you how your content will look before publishing:
- Blog posts preview with featured images, dates, and categories
- Page previews with styled headers

### Cloudinary Integration (Optional)

Cloudinary provides enhanced image management with automatic optimization, transformations, and CDN delivery.

#### To Enable Cloudinary:

1. **Sign up for Cloudinary**
   - Go to https://cloudinary.com and create a free account
   - Free tier includes 25GB storage and 25GB bandwidth/month

2. **Get your credentials**
   - From your Cloudinary dashboard, note your:
     - Cloud name
     - API Key
     - API Secret (keep this secure!)

3. **Update config.yml**
   - Edit `admin/config.yml`
   - Uncomment the `media_library` section
   - Replace placeholders with your credentials:

   ```yaml
   media_library:
     name: cloudinary
     config:
       cloud_name: your-actual-cloud-name
       api_key: your-actual-api-key
   ```

4. **Deploy changes**
   - Commit and push your changes
   - Netlify will rebuild your site

5. **Using Cloudinary**
   - In the CMS, when you upload images, you'll see a "Media Library" button
   - You can upload directly or select from previously uploaded images
   - Cloudinary automatically optimizes images for web delivery

## Files

- `index.html` - The CMS admin interface entry point
- `config.yml` - CMS configuration (collections, fields, etc.)
- `cms.js` - Custom editor components and preview templates
- `README.md` - This file

## Accessing the CMS

Visit `https://your-site.netlify.app/admin/` and log in with your Netlify Identity credentials.

## Tips

### Using Editor Components

1. Click the **+** button in the markdown editor
2. Select the component you want to insert
3. Fill in the required fields
4. The component will be inserted as HTML in your markdown

### Editing Existing Components

1. Click on an inserted component in the editor
2. The component fields will appear for editing
3. Update the values and they'll automatically update in the content

### Preview Your Content

Use the preview pane on the right to see how your content will look on the live site.

## Support

For issues with:
- **Decap CMS**: https://decapcms.org/docs/
- **Netlify Identity**: https://docs.netlify.com/visitor-access/identity/
- **Cloudinary**: https://cloudinary.com/documentation
