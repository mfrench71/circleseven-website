// Custom CMS configuration with editor components and preview templates

// ========================================
// EDITOR COMPONENTS
// ========================================

// Leaflet Map Component
CMS.registerEditorComponent({
  id: "leaflet-map",
  label: "Leaflet Map",
  fields: [
    {
      name: "lat",
      label: "Latitude",
      widget: "string",
      default: "50.3755",
      hint: "Decimal latitude (e.g., 50.3755)"
    },
    {
      name: "lng",
      label: "Longitude",
      widget: "string",
      default: "-4.1427",
      hint: "Decimal longitude (e.g., -4.1427)"
    },
    {
      name: "zoom",
      label: "Zoom Level",
      widget: "select",
      options: ["10", "11", "12", "13", "14", "15", "16", "17", "18"],
      default: "15"
    }
  ],
  pattern: /<div class="leaflet-map" data-lat="([^"]+)" data-lng="([^"]+)" data-zoom="([^"]+)"><\/div>/,
  fromBlock: function(match) {
    return {
      lat: match[1],
      lng: match[2],
      zoom: match[3]
    };
  },
  toBlock: function(obj) {
    return `<div class="leaflet-map" data-lat="${obj.lat}" data-lng="${obj.lng}" data-zoom="${obj.zoom}"></div>`;
  },
  toPreview: function(obj) {
    return `<div style="padding: 20px; background: #e8f5e9; border: 2px dashed #4caf50; border-radius: 4px; text-align: center;">
      <p style="margin: 0; font-weight: bold;">📍 Leaflet Map</p>
      <p style="margin: 5px 0 0; font-size: 0.9em;">Lat: ${obj.lat}, Lng: ${obj.lng}, Zoom: ${obj.zoom}</p>
    </div>`;
  }
});

// Gallery Component
CMS.registerEditorComponent({
  id: "gallery",
  label: "Image Gallery",
  fields: [
    {
      name: "images",
      label: "Gallery Images",
      widget: "list",
      summary: "{{fields.alt}}",
      fields: [
        {
          name: "image",
          label: "Image",
          widget: "image",
          hint: "Upload or select an image"
        },
        {
          name: "alt",
          label: "Alt Text",
          widget: "string",
          required: false,
          hint: "Description of the image for accessibility"
        },
        {
          name: "width",
          label: "Width",
          widget: "string",
          required: false
        },
        {
          name: "height",
          label: "Height",
          widget: "string",
          required: false
        }
      ]
    }
  ],
  pattern: /<div class="gallery">\s*((?:<figure>.*?<\/figure>\s*)+)<\/div>/s,
  fromBlock: function(match) {
    const figuresHtml = match[1];
    const figureRegex = /<figure><a href="([^"]+)"><img src="([^"]+)"(?:\s+width="([^"]+)")?(?:\s+height="([^"]+)")?(?:\s+alt="([^"]*)")?[^>]*><\/a><\/figure>/g;
    const images = [];
    let figureMatch;

    while ((figureMatch = figureRegex.exec(figuresHtml)) !== null) {
      images.push({
        image: figureMatch[1],
        alt: figureMatch[5] || "",
        width: figureMatch[3] || "",
        height: figureMatch[4] || ""
      });
    }

    return { images };
  },
  toBlock: function(obj) {
    if (!obj.images || obj.images.length === 0) {
      return '<div class="gallery"></div>';
    }

    const figures = obj.images.map(img => {
      const widthAttr = img.width ? ` width="${img.width}"` : '';
      const heightAttr = img.height ? ` height="${img.height}"` : '';
      const altAttr = img.alt ? ` alt="${img.alt}"` : ' alt=""';

      return `<figure><a href="${img.image}"><img src="${img.image}"${widthAttr}${heightAttr}${altAttr} loading="lazy"></a></figure>`;
    }).join('\n');

    return `<div class="gallery">\n\n${figures}\n\n</div>`;
  },
  toPreview: function(obj) {
    if (!obj.images || obj.images.length === 0) {
      return '<div style="padding: 20px; background: #e3f2fd; border: 2px dashed #2196f3; border-radius: 4px; text-align: center;"><p style="margin: 0;">🖼️ Empty Gallery</p></div>';
    }

    const imageCount = obj.images.length;
    const previewImages = obj.images.slice(0, 3).map(img =>
      `<img src="${img.image}" style="width: 100px; height: 100px; object-fit: cover; margin: 5px;" alt="${img.alt || ''}" />`
    ).join('');

    return `<div style="padding: 15px; background: #e3f2fd; border: 2px dashed #2196f3; border-radius: 4px;">
      <p style="margin: 0 0 10px; font-weight: bold;">🖼️ Gallery (${imageCount} image${imageCount !== 1 ? 's' : ''})</p>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;">${previewImages}${imageCount > 3 ? '<p style="margin: 5px;">...</p>' : ''}</div>
    </div>`;
  }
});

// Vimeo Embed Component
CMS.registerEditorComponent({
  id: "vimeo",
  label: "Vimeo Video",
  fields: [
    {
      name: "id",
      label: "Vimeo Video ID",
      widget: "string",
      hint: "The numeric ID from the Vimeo URL (e.g., 318999571)"
    }
  ],
  pattern: /<figure>\s*<div class="embed-container">\s*<iframe src="https:\/\/player\.vimeo\.com\/video\/([^"]+)"[^>]*><\/iframe>\s*<\/div>\s*<\/figure>/,
  fromBlock: function(match) {
    return {
      id: match[1]
    };
  },
  toBlock: function(obj) {
    return `<figure>
<div class="embed-container">
<iframe src="https://player.vimeo.com/video/${obj.id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>`;
  },
  toPreview: function(obj) {
    return `<div style="padding: 20px; background: #f3e5f5; border: 2px dashed #9c27b0; border-radius: 4px; text-align: center;">
      <p style="margin: 0; font-weight: bold;">🎬 Vimeo Video</p>
      <p style="margin: 5px 0 0; font-size: 0.9em;">Video ID: ${obj.id}</p>
      <iframe src="https://player.vimeo.com/video/${obj.id}" width="100%" height="300" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="margin-top: 10px;"></iframe>
    </div>`;
  }
});

// YouTube Embed Component
CMS.registerEditorComponent({
  id: "youtube",
  label: "YouTube Video",
  fields: [
    {
      name: "id",
      label: "YouTube Video ID",
      widget: "string",
      hint: "The video ID from the YouTube URL (e.g., dQw4w9WgXcQ)"
    }
  ],
  pattern: /<figure>\s*<div class="embed-container">\s*<iframe src="https:\/\/www\.youtube\.com\/embed\/([^"?]+)[^"]*"[^>]*><\/iframe>\s*<\/div>\s*<\/figure>/,
  fromBlock: function(match) {
    return {
      id: match[1]
    };
  },
  toBlock: function(obj) {
    return `<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/${obj.id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>`;
  },
  toPreview: function(obj) {
    return `<div style="padding: 20px; background: #ffebee; border: 2px dashed #f44336; border-radius: 4px; text-align: center;">
      <p style="margin: 0; font-weight: bold;">📺 YouTube Video</p>
      <p style="margin: 5px 0 0; font-size: 0.9em;">Video ID: ${obj.id}</p>
      <iframe src="https://www.youtube.com/embed/${obj.id}" width="100%" height="300" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="margin-top: 10px;"></iframe>
    </div>`;
  }
});

// ========================================
// PREVIEW TEMPLATES
// ========================================

const PostPreview = createClass({
  render: function() {
    const entry = this.props.entry;
    const image = entry.getIn(['data', 'image']);
    const title = entry.getIn(['data', 'title']);
    const body = this.props.widgetFor('body');
    const categories = entry.getIn(['data', 'categories']);
    const date = entry.getIn(['data', 'date']);

    return h('div', {className: 'post-preview'},
      h('article', {},
        h('header', {style: {marginBottom: '2rem', borderBottom: '2px solid #00897b', paddingBottom: '1rem'}},
          h('h1', {style: {
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            color: '#00897b',
            fontWeight: 'bold'
          }}, title),
          date && h('p', {style: {
            color: '#666',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}, new Date(date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })),
          categories && h('p', {style: {
            color: '#00897b',
            fontSize: '0.85rem',
            fontWeight: '500',
            margin: '0.5rem 0'
          }}, Array.isArray(categories) ? categories.join(', ') : categories)
        ),
        image && h('img', {
          src: image,
          alt: title,
          style: {
            width: '100%',
            height: 'auto',
            marginBottom: '2rem',
            borderRadius: '4px'
          }
        }),
        h('div', {
          className: 'post-content',
          style: {
            fontSize: '1.1rem',
            lineHeight: '1.8',
            color: '#333'
          }
        }, body)
      )
    );
  }
});

const PagePreview = createClass({
  render: function() {
    const entry = this.props.entry;
    const title = entry.getIn(['data', 'title']);
    const body = this.props.widgetFor('body');

    return h('div', {className: 'page-preview'},
      h('article', {},
        h('header', {style: {marginBottom: '2rem', borderBottom: '2px solid #00897b', paddingBottom: '1rem'}},
          h('h1', {style: {
            fontSize: '2.5rem',
            color: '#00897b',
            fontWeight: 'bold'
          }}, title)
        ),
        h('div', {
          className: 'page-content',
          style: {
            fontSize: '1.1rem',
            lineHeight: '1.8',
            color: '#333'
          }
        }, body)
      )
    );
  }
});

// Register preview templates
CMS.registerPreviewTemplate('blog', PostPreview);
CMS.registerPreviewTemplate('pages', PagePreview);

// Add preview styles
CMS.registerPreviewStyle('/assets/css/variables.css');
CMS.registerPreviewStyle('/assets/css/layout.css');
CMS.registerPreviewStyle('/assets/css/cards.css');
CMS.registerPreviewStyle('/assets/css/post-layouts.css');
CMS.registerPreviewStyle('/assets/css/gallery.css');
CMS.registerPreviewStyle('/assets/css/embeds.css');

console.log('✅ Decap CMS custom components and preview templates loaded');
