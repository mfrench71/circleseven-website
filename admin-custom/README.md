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

## Setup

### Required: GitHub Token

The taxonomy manager needs a GitHub personal access token to commit changes:

1. **Create GitHub Token:**
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name: "Netlify Admin"
   - Select scope: `repo` (Full control of private repositories)
   - Click "Generate token" and copy it

2. **Add to Netlify:**
   - Go to Netlify dashboard > Your site > Site settings > Environment variables
   - Click "Add a variable"
   - Key: `GITHUB_TOKEN`
   - Value: (paste your GitHub token)
   - Click "Save"
   - Redeploy the site for changes to take effect

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

The taxonomy manager automatically:
1. ✅ Commits changes to GitHub (via GitHub API)
2. ✅ GitHub Action runs sync script automatically
3. ✅ Commits updated CMS config automatically
4. ✅ Triggers Netlify rebuild automatically

**Everything is fully automated!** Just click Save and wait 1-2 minutes for:
- Custom admin commits taxonomy changes
- GitHub Action syncs to CMS config
- Netlify rebuilds the site

No manual steps required.

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
