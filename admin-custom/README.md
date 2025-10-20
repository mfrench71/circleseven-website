# Custom Taxonomy Manager

Modern, custom-built admin interface for managing categories and tags.

## Features

- ✨ Clean, modern UI with Tailwind CSS
- 🔐 Netlify Identity authentication (same as Decap CMS)
- 🎯 Drag-and-drop reordering
- ✏️ Inline editing
- 🗑️ Quick delete with confirmation
- 📱 Fully responsive design
- 🚀 No build step required

## Access

Visit: [https://circleseven.co.uk/admin-custom](https://circleseven.co.uk/admin-custom)

## How It Works

### Architecture

```
┌──────────────┐
│   Browser    │
│ (admin-custom)│
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Netlify Identity │ ◄── Authentication
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Netlify Functions    │ ◄── API
│ /taxonomy (GET/PUT)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ _data/taxonomy.yml   │ ◄── Data storage
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│   Git Commit (Manual)│
└──────────────────────┘
```

### Files

- `index.html` - Main UI (Tailwind CSS, Sortable.js)
- `app.js` - Application logic (vanilla JS)
- `../netlify/functions/taxonomy.js` - API endpoint

## Usage

1. **Log in** with Netlify Identity credentials
2. **Add items** using the input fields and "Add" buttons
3. **Reorder** by dragging items up/down
4. **Edit** by clicking the pencil icon
5. **Delete** by clicking the trash icon
6. **Save** when done (saves to `_data/taxonomy.yml`)
7. **Commit** changes using Git
8. **Sync** to CMS by running: `npm run sync-taxonomy`

## After Saving

The taxonomy manager updates the YAML file but doesn't automatically commit to Git. You'll need to:

```bash
# 1. Sync to CMS config (updates admin/config.yml checkboxes)
npm run sync-taxonomy

# 2. Commit changes
git add _data/taxonomy.yml admin/config.yml
git commit -m "Update taxonomy"
git push
```

## Development

Local testing:
```bash
# Install dependencies
npm install

# Start Jekyll with Netlify Dev (for functions)
netlify dev
```

## Rollback

To revert to Decap CMS:
```bash
git reset --hard backup-before-custom-admin
```

## Future Enhancements

Potential additions:
- Auto-commit functionality
- Bulk import/export
- Search/filter
- Usage statistics (which categories/tags are used most)
- Direct integration with post editor
- Automatic sync-taxonomy execution
