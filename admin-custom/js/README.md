# Circle Seven Admin - ES6 Modules

Modular JavaScript architecture for the custom admin application using native ES6 modules.

## Directory Structure

```
admin-custom/js/
├── core/               # Core utilities and shared functions
│   └── utils.js        # Utility functions (debounce, escapeHtml, etc.)
├── ui/                 # UI components and helpers
│   └── notifications.js # Success/error message system
├── modules/            # Feature modules (future)
│   ├── taxonomy.js     # Categories and tags (planned)
│   ├── posts.js        # Posts CRUD (planned)
│   ├── pages.js        # Pages CRUD (planned)
│   ├── media.js        # Cloudinary integration (planned)
│   ├── trash.js        # Soft delete system (planned)
│   ├── settings.js     # Config editor (planned)
│   └── deployments.js  # GitHub Actions tracking (planned)
├── test.html           # Module testing interface
└── README.md           # This file
```

## Phase 1: Core Utilities (✅ Complete)

### core/utils.js

Shared utility functions used throughout the application.

**Exports:**
- `FETCH_TIMEOUT` - Constant for fetch timeout (30000ms)
- `DEBOUNCE_DELAY` - Constant for debounce delay (300ms)
- `debounce(func, wait)` - Debounce function calls
- `asyncHandler(fn)` - Wrap async functions with error handling
- `fetchWithTimeout(url, options, timeout)` - Fetch with timeout
- `setButtonLoading(button, loading, text)` - Button loading states
- `escapeHtml(text)` - Escape HTML for XSS prevention
- `isValidUrl(string)` - Validate URL strings

**Usage:**
```javascript
import { debounce, escapeHtml } from './core/utils.js';

const debouncedSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 300);

const safe = escapeHtml('<script>alert("XSS")</script>');
```

### ui/notifications.js

User notification system with success and error messages.

**Exports:**
- `initNotifications()` - Initialize notification system (call on DOM ready)
- `showError(message)` - Display error message (auto-dismiss after 5s)
- `showSuccess(message)` - Display success message (auto-dismiss after 5s)
- `hideMessages()` - Hide all notifications

**Usage:**
```javascript
import { initNotifications, showError, showSuccess } from './ui/notifications.js';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
});

// Show messages
showSuccess('Post saved successfully!');
showError('Failed to save post');
```

## Testing

Open `test.html` in a browser to verify all modules work correctly:

```
http://localhost:8888/admin-custom/js/test.html
```

Or with Netlify Dev:
```bash
netlify dev
```

Tests included:
- ✅ Debounce function
- ✅ Notifications (error/success/hide)
- ✅ Button loading states
- ✅ HTML escaping
- ✅ URL validation
- ✅ Async error handling

## Browser Support

ES6 modules require modern browsers:
- ✅ Chrome/Edge 61+
- ✅ Firefox 60+
- ✅ Safari 11+
- ✅ Opera 48+
- ❌ IE11 (not supported)

## Migration Plan

### Phase 1: Core Utilities ✅ (Current)
- Extract shared utilities
- Extract UI notifications
- Create test suite
- Keep `app.js` intact as backup

### Phase 2: First Module (Planned)
- Extract smallest module (Trash or Media)
- Test in isolation
- Verify integration

### Phase 3: Remaining Modules (Planned)
- Extract all remaining modules
- Update `index.html` to use module system
- Remove old `app.js`

### Phase 4: Optimization (Future)
- Add lazy loading
- Code splitting by route
- Consider TypeScript migration

## Benefits

### Current Benefits (Phase 1)
- ✅ **Reusable code** - Import utilities anywhere
- ✅ **Better organization** - Clear file structure
- ✅ **No build step** - Native browser support
- ✅ **Easy testing** - Test modules in isolation

### Future Benefits (Phase 2+)
- ✅ **Smaller files** - Easier to navigate
- ✅ **Faster development** - Work on isolated modules
- ✅ **Better IDE support** - Autocomplete and navigation
- ✅ **Team collaboration** - Multiple devs, different modules

## Best Practices

### Importing
```javascript
// Named imports (preferred)
import { debounce, escapeHtml } from './core/utils.js';

// Import all (use sparingly)
import * as utils from './core/utils.js';
```

### Exporting
```javascript
// Named exports (preferred for utilities)
export function myFunction() { }
export const MY_CONSTANT = 123;

// Default export (use for main module functionality)
export default class MyClass { }
```

### File Organization
- One module per file
- Group related functions together
- Keep files under 500 lines when possible
- Use clear, descriptive names

### Dependencies
- Minimize dependencies between modules
- Document required global variables
- Use initialization functions where needed

## Troubleshooting

### Module Not Found
**Error:** `Failed to load module script: The server responded with a non-JavaScript MIME type`

**Solution:** Ensure your server sends correct MIME type for `.js` files:
- Content-Type: `application/javascript` or `text/javascript`
- Netlify handles this automatically

### CORS Errors
**Error:** `Access to script at '...' from origin '...' has been blocked by CORS policy`

**Solution:**
- Use a local server (Netlify Dev, http-server, etc.)
- Don't open `file://` URLs directly

### Import Path Issues
**Error:** `Failed to resolve module specifier "./utils.js"`

**Solution:**
- Always use relative paths: `./core/utils.js` not `core/utils.js`
- Include `.js` extension: `./utils.js` not `./utils`
- Check path case sensitivity

## Future Enhancements

Consider adding later:
- **Vite** - Fast dev server with HMR
- **TypeScript** - Type safety and better IDE support
- **Testing Framework** - Jest or Vitest for unit tests
- **Code Splitting** - Lazy load modules by route
- **Bundle Analysis** - Optimize module size

## Resources

- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [ES6 Modules in Browsers](https://caniuse.com/es6-module)
- [V8 Module Loading](https://v8.dev/features/modules)

## Contributing

When adding new modules:
1. Follow existing file structure
2. Add comprehensive JSDoc documentation
3. Export all public functions
4. Add tests to `test.html`
5. Update this README

## Status

- **Phase 1**: ✅ Complete
- **Phase 2**: 🚧 Planned
- **Phase 3**: 📋 Future
- **Phase 4**: 💡 Ideas

---

**Version:** 1.0.0 (Phase 1)
**Last Updated:** October 2025
