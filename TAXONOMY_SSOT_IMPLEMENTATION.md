# Taxonomy as Single Source of Truth - Implementation Status

## Overview

This document tracks the implementation of making taxonomy.yml the Single Source of Truth (SSOT) for the menu system, eliminating data duplication between taxonomy and menus.

## Concept

**Before**: Menus duplicated category names and URLs from taxonomy
**After**: Menus reference taxonomy by slug using `category_ref` type

## Implementation Phases

### ✅ Phase 1: Slug Immutability (COMPLETED)
**Status**: Implemented and tested

**What was done**:
- Added slug immutability validation in `netlify/functions/taxonomy.mjs`
- `detectSlugChanges()` function prevents slug modifications
- Returns 400 error if any slug changes detected
- Tests added in `tests/unit/backend/taxonomy.test.js`

**Files modified**:
- `netlify/functions/taxonomy.mjs` (lines 112-153, 245-252)
- `tests/unit/backend/taxonomy.test.js` (slug immutability tests)

---

### ✅ Phase 2: Menu Conversion to category_ref (COMPLETED)
**Status**: Implemented

**What was done**:
- Converted existing menu items in `_data/menus.yml` from type `category` to type `category_ref`
- Each `category_ref` item includes:
  - `category_ref: "slug"` - References taxonomy category by slug
  - `label` - Optional (will be resolved from taxonomy if omitted)
  - `url` - Optional (automatically generated from slug)

**Example**:
```yaml
- id: "digital-art-technology"
  type: "category_ref"
  category_ref: "digital-art-and-technology"
  mega_menu: true
  children: [...]
```

**Files modified**:
- `_data/menus.yml` (all category items converted to category_ref)

---

### ✅ Phase 3: Schema Validation (COMPLETED)
**Status**: Implemented and tested

**What was done**:
- Added `category_ref` to menu item type enum in Zod schema
- Added validation rules:
  - For `category_ref` type: `category_ref` field is required
  - For non-`category_ref` types: `label` field is required
  - `label` is optional for `category_ref` (resolved from taxonomy)
- Recursive validation supports nested menu structures

**Files modified**:
- `netlify/utils/validation-schemas.mjs` (lines 174-192)

**Schema logic**:
```javascript
menuItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['category', 'category_ref', 'page', 'custom', 'heading']),
  label: z.string().optional(),
  category_ref: z.string().optional(),
  // ...
}).refine(
  (data) => data.type !== 'category_ref' || data.category_ref,
  { message: 'category_ref field is required when type is category_ref' }
).refine(
  (data) => data.type === 'category_ref' || data.label,
  { message: 'label is required for non-category_ref menu items' }
);
```

---

### ✅ Phase 4: Jekyll Filter for Category Resolution (COMPLETED)
**Status**: Implemented

**What was done**:
- Created `_plugins/menu_filters.rb` - Jekyll plugin providing Liquid filters
- Filters available in templates:
  - `resolve_menu_item` - Resolves single menu item
  - `resolve_menu` - Recursively resolves entire menu structure
- Resolution logic:
  - Looks up category in taxonomy by `category_ref` slug
  - Resolves `label` from taxonomy `item` field if not provided
  - Generates `url` as `/category/{slug}/`
  - Stores resolved category data in `_resolved_category`
  - Sets `_broken_ref: true` if category not found
  - Falls back to slug-based label for broken refs

**Files created**:
- `_plugins/menu_filters.rb` (90 lines)

**Usage in templates**:
```liquid
{% assign resolved_menu = site.data.menus.header_menu | resolve_menu: site.data.taxonomy %}
{% for item in resolved_menu %}
  <a href="{{ item.url }}">{{ item.label }}</a>
{% endfor %}
```

---

### ✅ Phase 5: Backend Reference Validation (COMPLETED)
**Status**: Implemented

**What was done**:
- Added reference validation to `netlify/functions/menus.mjs` PUT handler
- Fetches taxonomy.yml before saving menus
- Validates all `category_ref` references exist in taxonomy
- Returns 400 error with detailed broken reference list if validation fails
- Prevents saving menus with invalid references

**Functions added**:
- `findCategoryBySlug()` (lines 95-111) - Searches taxonomy tree
- `validateCategoryRefs()` (lines 120-148) - Recursively validates refs

**Validation flow**:
1. Parse request body
2. Fetch taxonomy.yml from GitHub
3. Check all `category_ref` items in header_menu, mobile_menu, footer_menu
4. Collect broken references with paths
5. Return error if any broken refs found
6. Otherwise proceed with save

**Files modified**:
- `netlify/functions/menus.mjs` (lines 37, 95-148, 271-299)

**Error response format**:
```json
{
  "error": "Invalid category references found: header_menu[0] (id: foo) -> \"nonexistent-slug\"",
  "brokenReferences": [
    {
      "path": "header_menu[0]",
      "ref": "nonexistent-slug",
      "itemId": "foo"
    }
  ]
}
```

---

### ✅ Phase 6: Auto Cache Clearing (COMPLETED)
**Status**: Implemented

**What was done**:
- Added automatic menu cache invalidation when taxonomy is updated
- When taxonomy.yml is saved, the menu Blob cache is cleared
- Ensures menu items get fresh taxonomy data after category changes
- Non-blocking (cache clear errors don't break taxonomy save)

**Functions added**:
- `clearMenuCache()` in `netlify/functions/taxonomy.mjs` (lines 86-99)

**Files modified**:
- `netlify/functions/taxonomy.mjs` (lines 35, 86-99, 327)

**Logic**:
```javascript
// After successful taxonomy update
await writeTaxonomyToBlob(updatedData);
await clearMenuCache(); // Clear menu cache
return successResponse(...);
```

---

### ✅ Phase 7: Update Admin Menu Builder UI (COMPLETED)
**Status**: Implemented

**What was done**:
1. Added `category_ref` option to "Add Menu Item" form
2. Added category picker dropdown (populated from taxonomy API)
3. Updated form visibility logic based on type selection
4. Updated `updateEditItemForm()` to show/hide category picker
5. Updated `saveEditedMenuItem()` to save category_ref field
6. Updated `updateAddItemForm()` to handle category_ref type
7. Updated `showAddMenuItemModal()` to handle category_ref saves
8. Created taxonomy loading and dropdown population functions
9. Integrated taxonomy loading into page initialization

**Files modified**:
- `admin/appearance/menus/index.html` (lines 157-186)
  - Added "Category (from Taxonomy)" as first option in type dropdown
  - Added category picker dropdown with ID `new-item-category-ref`
  - Added help text for category_ref type
  - Added label help text field

- `admin/js/modules/menus.js`
  - `showAddMenuItemModal()` (lines 478-562): Handle category_ref saves
  - `clearAddItemForm()` (lines 567-579): Clear category picker
  - `updateAddItemForm()` (lines 584-618): Show/hide category picker for add form
  - `editMenuItem()` (lines 719-835): Added category_ref to edit modal HTML and dropdown population
  - `updateEditItemForm()` (lines 840-876): Show/hide category picker for edit form
  - `saveEditedMenuItem()` (lines 881-977): Save category_ref field
  - `loadTaxonomy()` (lines 126-138): Fetch taxonomy from API
  - `populateCategoryDropdown()` (lines 148-166): Recursively populate dropdown with indentation
  - `initializeCategoryDropdowns()` (lines 171-183): Initialize dropdowns on page load
  - `loadMenus()` (line 243): Call initializeCategoryDropdowns()

**UI implemented**:
```html
<!-- Add form -->
<select id="new-item-type">
  <option value="category_ref">Category (from Taxonomy)</option>
  <option value="category">Category (Manual)</option>
  <!-- ... -->
</select>

<div id="add-item-category-ref-group">
  <label>Select Category</label>
  <select id="new-item-category-ref">
    <option value="">-- Select a category --</option>
    <!-- Populated dynamically from taxonomy API -->
  </select>
  <small>Category name and URL will be automatically loaded from taxonomy</small>
</div>

<!-- Edit modal has matching structure -->
  </select>
</div>
```

---

### ✅ Phase 8: WordPress-Style Menu Management (COMPLETED)
**Status**: Implemented

**What was done**:
1. Removed "Category (Manual)" type from UI - enforces taxonomy SSOT
2. Added page picker functionality following WordPress patterns
3. Added defensive null guards for test compatibility

**Page Picker Implementation:**
- Created `loadPages()` function - fetches from /pages API
- Created `populatePageDropdown()` - populates dropdown with pages
- Created `onPageSelected()` - auto-fills label when page selected
- Added `pagesCache` global variable for caching page data

**UI Changes:**
- Added page picker dropdown to add form (index.html line 177-184)
- Added page picker dropdown to edit modal (menus.js line 930-937)
- Removed "Category (Manual)" option from type dropdowns
- Type dropdown options: category_ref, page, custom, heading

**Form Logic Updates:**
- `updateAddItemForm()` (menus.js:840-901)
  - Added pageRefGroup handling
  - Shows page picker when page type selected
  - Lazy-loads pages on first selection
  - Added null guards for all DOM elements

- `updateEditItemForm()` (menus.js:1071-1108)
  - Added pageRefGroup handling
  - Shows page picker when page type selected
  - Added null guards for all DOM elements

- `clearAddItemForm()` (menus.js:814-834)
  - Clears page picker dropdown value

**Save/Edit Logic Updates:**
- `showAddMenuItemModal()` (menus.js:728-755)
  - Added page type handling
  - Validates page selection required
  - Validates label required
  - Parses JSON from dropdown to extract URL

- `saveEditedMenuItem()` (menus.js:1165-1213)
  - Added page type handling
  - Same validation as add form
  - Parses JSON to get URL for edited items

- `editMenuItem()` (menus.js:1049-1054)
  - Lazy-loads pages when modal opens
  - Populates page dropdown
  - Pre-selects current page by URL

**WordPress Pattern Alignment:**
- Manual selection only (no auto-populate of categories/pages)
- Dropdown shows all available items
- Label auto-fills but remains editable
- No enable/disable toggles
- Same workflow for add and edit

**Files modified**:
- `admin/appearance/menus/index.html` (removed manual category, added page picker HTML)
- `admin/js/modules/menus.js` (page picker functions, form logic, null guards)

**Null Guards Added:**
All DOM element access in form functions now has null checks to ensure
compatibility with test environment where page picker elements may not exist.

---

### ⏸️ Phase 9: Update Tests (PENDING)
**Status**: Not started

**What needs to be done**:
1. Update existing menu tests to handle category_ref type
2. Add tests for category reference validation
3. Add tests for broken reference handling
4. Add tests for Jekyll filter resolution
5. Add tests for cache clearing integration

**Files to create/modify**:
- `tests/unit/backend/menus.test.js`
  - Add tests for category_ref validation
  - Test broken reference error responses
  - Test mixed menu with both category and category_ref types

- `tests/unit/backend/taxonomy.test.js`
  - Add test: "should clear menu cache when taxonomy is updated"

- NEW: `tests/unit/plugins/menu_filters.test.rb` (Ruby tests)
  - Test resolve_menu_item with valid category_ref
  - Test resolve_menu_item with broken category_ref
  - Test resolve_menu recursively
  - Test nested children resolution

**Test cases needed**:
```javascript
// Menu validation tests
describe('PUT /menus with category_ref', () => {
  it('should accept valid category_ref items', async () => {
    // Test saving menu with valid category_ref
  });

  it('should reject menu with invalid category_ref', async () => {
    // Test validation error for broken reference
  });

  it('should provide detailed error for broken refs', async () => {
    // Test error response format
  });
});

// Cache integration tests
describe('Taxonomy-Menu cache integration', () => {
  it('should clear menu cache when taxonomy is updated', async () => {
    // Test that PUT /taxonomy clears menu cache
  });
});
```

---

## Current Status Summary

**Completed**: Phases 1-8 (WordPress-style implementation complete)
- ✅ Slug immutability enforced
- ✅ Menus converted to use category_ref
- ✅ Schema validation for category_ref
- ✅ Jekyll filters for runtime resolution
- ✅ Backend validation prevents broken references
- ✅ Auto cache clearing on taxonomy changes
- ✅ Admin UI with category picker fully implemented
- ✅ Page picker with WordPress-style workflow
- ✅ Manual category type removed from UI
- ✅ Defensive null guards for test compatibility

**Pending**: Phase 9 (Testing)
- ⏸️ Update tests to expect taxonomy and pages API calls
- ⏸️ Comprehensive test coverage for page picker

## Next Steps

1. **Phase 9**: Update and expand tests
   - Update existing tests to expect taxonomy/pages API calls
   - Add tests for page picker functionality
   - Backend validation tests
   - Cache integration tests
   - Jekyll filter tests (Ruby)
   - End-to-end workflow tests

## Benefits Achieved

1. **Single Source of Truth**: Category data lives only in taxonomy.yml
2. **Data Consistency**: Menus automatically reflect taxonomy changes
3. **Slug Stability**: Category URLs won't break due to slug changes
4. **Validation**: Backend prevents invalid category references
5. **Cache Invalidation**: Menu cache automatically cleared on taxonomy updates
6. **User-Friendly UI**: Admins can pick categories from dropdown
7. **Complete Workflow**: Full category reference system implemented
8. **WordPress-Style Page Picker**: Manual page selection with auto-fill labels
9. **Type Safety**: Removed confusing manual category type option
10. **Lazy Loading**: Taxonomy and pages only loaded when needed
11. **Simplified Workflow**: Clear separation between taxonomy-managed categories and static pages

## Benefits Pending (After Phase 9)

1. **Test Coverage**: Comprehensive tests updated for new API calls

---

## Technical Architecture

### Data Flow

```
1. Admin UI (admin/js/modules/menus.js)
   ↓ User selects category from dropdown
   ↓
2. API Request to PUT /menus
   ↓
3. Zod Schema Validation (validation-schemas.mjs)
   ↓ Validates category_ref field present
   ↓
4. Reference Validation (menus.mjs)
   ↓ Fetches taxonomy.yml
   ↓ Validates all category_ref values exist
   ↓
5. GitHub API
   ↓ Saves menus.yml
   ↓
6. Blob Cache Update
   ↓ Caches menu data
   ↓
7. Jekyll Build (triggered by Netlify)
   ↓
8. Jekyll Filter (menu_filters.rb)
   ↓ Resolves category_ref to taxonomy data
   ↓
9. Rendered Site
   ✅ Menu displays with taxonomy-sourced labels and URLs
```

### Reference Resolution

**Build Time** (Jekyll):
```ruby
# menu_filters.rb
def resolve_menu_item(menu_item, taxonomy)
  if menu_item['type'] == 'category_ref'
    category = find_category_by_slug(taxonomy, menu_item['category_ref'])
    return {
      ...menu_item,
      label: category['item'],
      url: "/category/#{menu_item['category_ref']}/",
      _resolved_category: category
    }
  end
end
```

**Save Time** (Backend):
```javascript
// menus.mjs
validateCategoryRefs(menuItems, taxonomy) {
  menuItems.forEach(item => {
    if (item.type === 'category_ref') {
      if (!findCategoryBySlug(taxonomy, item.category_ref)) {
        brokenRefs.push({ path, ref, itemId });
      }
    }
  });
  return brokenRefs;
}
```

---

## Files Changed

### Created
- `_plugins/menu_filters.rb` (90 lines)
- `TAXONOMY_SSOT_IMPLEMENTATION.md` (this file)

### Modified
- `_data/menus.yml` - Converted category to category_ref
- `netlify/functions/menus.mjs` - Added reference validation
- `netlify/functions/taxonomy.mjs` - Added slug immutability, menu cache clearing
- `netlify/utils/validation-schemas.mjs` - Added category_ref schema

### To Modify (Phase 7-8)
- `admin/js/modules/menus.js` - Add category picker UI
- `tests/unit/backend/menus.test.js` - Add validation tests
- `tests/unit/backend/taxonomy.test.js` - Add cache clearing test
- Create: `tests/unit/plugins/menu_filters.test.rb` - Add filter tests

---

## Migration Path for Future Categories

When adding new categories:

1. Add to `_data/taxonomy.yml`:
   ```yaml
   categories:
     - item: New Category
       slug: new-category  # Slug is immutable after creation!
       children: []
   ```

2. Reference in `_data/menus.yml`:
   ```yaml
   - id: "new-category-menu"
     type: "category_ref"
     category_ref: "new-category"  # References slug
     # label is optional - will use "New Category" from taxonomy
   ```

3. No need to update menu label if category name changes
   - Just update `item` field in taxonomy
   - Menus will automatically show updated name

---

## Known Limitations

1. **Old Category Type**: The `category` type still exists in schema for backwards compatibility
   - Should be deprecated in future
   - All new items should use `category_ref`

2. **No Auto-Migration**: Existing `category` items in menus aren't automatically converted
   - Manual conversion recommended
   - Can be done via admin UI or direct YAML edit

3. **No Cascade Delete**: Deleting a category doesn't remove menu references
   - Menu validation will catch broken references
   - Admin UI should warn before category deletion

---

## Testing Checklist

### Backend Tests
- [ ] category_ref validation accepts valid refs
- [ ] category_ref validation rejects invalid refs
- [ ] Broken reference error includes all broken items
- [ ] Nested menu items validated recursively
- [ ] Taxonomy update clears menu cache
- [ ] Menu save validates against current taxonomy

### Jekyll Filter Tests
- [ ] resolve_menu_item works with valid category_ref
- [ ] resolve_menu_item handles broken refs gracefully
- [ ] resolve_menu processes nested children
- [ ] Resolved items include _resolved_category data
- [ ] Broken refs set _broken_ref flag

### Integration Tests
- [ ] End-to-end: Create category → Add to menu → Build site
- [ ] Category name change reflects in menu
- [ ] Slug change is blocked (error thrown)
- [ ] Cache invalidation propagates correctly

---

## Documentation Updates Needed

- [ ] Update admin user guide with category_ref usage
- [ ] Document category picker in menu builder
- [ ] Update API docs with category_ref validation
- [ ] Add migration guide for existing sites
- [ ] Document slug immutability policy

---

*Last Updated: Session on 2025-11-28*
*Status: Phases 1-7 Complete | Phase 8 Pending*
