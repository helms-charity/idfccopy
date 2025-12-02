# Breadcrumbs Implementation - Updated

## Overview
Breadcrumb navigation has been successfully implemented following the [AEM Block Collection breadcrumbs documentation](https://www.aem.live/developer/block-collection/breadcrumbs).

**Key Design Decision:** Breadcrumbs are positioned as the **first element in `<main>`**, appearing above the hero block and all other page content, rather than being part of the header block.

## Implementation Details

### Location in DOM Structure
```html
<body>
  <header>
    <!-- Navigation -->
  </header>
  <main>
    <div class="section hero-container">      <!-- ← First section (usually hero) -->
      <div class="hero-wrapper">              <!-- ← Wrapper div -->
        <nav class="breadcrumbs">             <!-- ← Breadcrumbs inside wrapper -->
          <ol>...</ol>
        </nav>
        <!-- Rest of hero/section content -->
      </div>
    </div>
    <div class="section">                     <!-- ← Other sections -->
      ...
    </div>
  </main>
</body>
```

### What Was Added/Modified

#### 1. **JavaScript Functions** (scripts/scripts.js)
- `getDirectTextContent(menuItem)` - Extracts text content from menu items
- `buildBreadcrumbsFromNavTree(nav, currentUrl)` - Builds breadcrumb trail from navigation structure or URL path
  - **Automatically pluralizes "Card" to "Cards"** in intermediate breadcrumb segments for better grammar
  - Strips site name suffixes from page titles (e.g., "| IDFC FIRST BANK")
  - **Does NOT include "Home" as first breadcrumb** - starts with first level after home
- `buildBreadcrumbs()` - Creates the breadcrumb navigation element
- `loadBreadcrumbs(main)` - Loads and injects breadcrumbs into the first wrapper div of the first content section
- Updated `loadLazy()` - Calls `loadBreadcrumbs()` after header is loaded

#### 2. **CSS Styling** (styles/lazy-styles.css)
- Added breadcrumb-specific styles targeting `main .breadcrumbs`
- **Hidden on mobile (< 900px)** - Only displays on desktop viewports
- **Pill-shaped semi-transparent background**: `rgba(232, 232, 232, 0.9)` with `border-radius: 20px`
- **Arrow divider (">")**  between items - created with rotated square using CSS borders
  - Uses `--dark-red-color` (#9c1d26) for arrow color
  - Styled with `::after` pseudo-element on `li:not(:last-child)`
- **All-caps text**: `text-transform: uppercase` with letter-spacing
- Uses site-wide fonts: `--body-font-family-semibold`
- Hover effects on links (color changes to red)
- Current page styling with `aria-current` attribute 
- Position with `z-index: 10` to ensure visibility over hero blocks

#### 3. **Removed from Header** (blocks/header/header.js & header.css)
- Removed all breadcrumb-related code from header block
- Breadcrumbs no longer part of header navigation

## How to Enable Breadcrumbs

Breadcrumbs are **opt-in per page** using page metadata. To enable breadcrumbs on a page:

### Method 1: In Document Authoring
Add a metadata block to your page with:
```
Metadata
breadcrumbs | true
```

### Method 2: In Page Properties (Universal Editor)
Set the `breadcrumbs` metadata field to `true` in the page properties.

## How It Works

1. **Load Sequence**:
   - Page loads → Header loads → Navigation becomes available
   - `loadBreadcrumbs()` is called in `loadLazy()`
   - Breadcrumbs are built from navigation structure
   - Breadcrumbs are inserted as first child of the wrapper div (e.g., `hero-wrapper`) in the first content section
   - This places them inside the hero (or first block) to overlay the background

2. **Navigation Tree Matching**: The breadcrumb logic searches through your navigation structure to find the current page's position in the hierarchy.

3. **Automatic Trail Building**: 
   - If found in nav: Builds the breadcrumb trail by traversing up the navigation tree
   - If NOT found in nav: Constructs breadcrumbs from URL path segments
   - Automatically converts URL segments to readable titles (e.g., "credit-card" → "Credit Cards")

4. **URL-Based Fallback**: If the current page isn't found in the navigation tree, breadcrumbs are intelligently built from the URL path:
   - Path segments are converted to title case
   - "Card" is automatically pluralized to "Cards"
   - Current page uses `og:title` metadata (with site name suffix stripped)

5. **No "Home" Breadcrumb**: The breadcrumb trail starts at the first level after home, not displaying "Home" as the first item

## Example Output

```
CREDIT CARDS > RUPAY CREDIT CARD
```

Where:
- "CREDIT CARDS" (intermediate level) links to `/credit-card/`
- ">" arrow divider separates breadcrumb items
- "RUPAY CREDIT CARD" (current page) is not linked and has `aria-current="page"`
- Text is displayed in all caps with semi-transparent pill background
- **Note**: "Home" is NOT displayed - breadcrumb starts with first level after homepage

## Visual Positioning

The breadcrumbs appear:
- ✅ **Below the header/navigation bar**
- ✅ **Inside the first content section's wrapper div** (e.g., `hero-wrapper` inside `hero-container`)
- ✅ **Overlaying the hero background** with semi-transparent pill design
- ✅ **As the first element within the wrapper div**
- ✅ **With z-index: 10** to ensure visibility over hero content
- ✅ **Only on desktop (≥ 900px)** - Hidden on mobile/tablet

This positioning allows the breadcrumbs to overlay the hero block's background image or color while remaining clearly readable with the semi-transparent pill background. The mobile-hidden approach saves valuable screen real estate on smaller devices.

## Accessibility Features

- Uses semantic `<nav>` element with `aria-label="Breadcrumb"`
- Structured as an ordered list (`<ol>`)
- Current page marked with `aria-current="page"` attribute
- Proper link hierarchy for screen readers
- Keyboard navigable
- Hover states for better UX

## Customization

### Styling
The breadcrumb styles use CSS variables:
- `--body-font-family-semibold`: Font family for breadcrumb text
- `--dark-red-color`: Color for arrow dividers and hover state (#9c1d26)
- `--text-color`: Color for breadcrumb links (#767676)
- `--dark-color`: Color for current page text

You can override these in your `styles.css` or adjust the breadcrumb CSS directly in `lazy-styles.css`.

### Positioning & Spacing
To adjust vertical spacing or positioning:

```css
/* In lazy-styles.css */
main .breadcrumbs {
  margin: 16px 24px; /* Mobile margins */
  padding: 8px 16px; /* Adjust padding */
}

@media (width >= 900px) {
  main .breadcrumbs {
    margin: 10px 40px 0; /* Desktop margins */
    padding: 4px 20px;
  }
  
  main:has(.hero-wrapper) .breadcrumbs {
    margin-left: 60px; /* Extra left margin when inside hero */
  }
}
```

### Mobile Display Breakpoint
To change when breadcrumbs appear/hide:

```css
/* Change 900px to your desired breakpoint */
@media (width >= 900px) {
  main .breadcrumbs {
    display: inline-block;
  }
}
```

## Testing

To test breadcrumbs:

1. Add `breadcrumbs | true` to a page's metadata
2. Ensure the page is linked in your navigation structure (or rely on URL-based fallback)
3. **Desktop testing (≥ 900px)**:
   - Breadcrumbs should appear inside the first wrapper div (e.g., `hero-wrapper`)
   - Should have pill-shaped semi-transparent background
   - Arrow dividers (">") should be red (#9c1d26)
   - Text should be all caps
   - Should NOT show "Home" as first item
4. **Mobile testing (< 900px)**:
   - Breadcrumbs should be completely hidden
   - No breadcrumb element should be visible in the DOM (display: none)
5. Verify the breadcrumb trail matches the navigation hierarchy or URL path
6. Test hover states on links (should turn red)

## Browser DevTools Verification

To verify correct placement:
1. Open browser DevTools (F12) on a **desktop viewport (≥ 900px)**
2. Inspect the `<main>` element
3. Find the first `<div class="section">` (usually `hero-container` or similar)
4. Inside that, find the wrapper div (e.g., `<div class="hero-wrapper">`)
5. Confirm `<nav class="breadcrumbs">` is the **first child inside the wrapper div**
6. Verify it appears before other wrapper content (hero text, images, etc.)
7. On mobile (< 900px), breadcrumbs should have `display: none` in computed styles

## Next Steps

- ✅ Test on various pages to ensure navigation matching works correctly
- ✅ Customize breadcrumb styling to match IDFC brand guidelines
- Add structured data (JSON-LD) for SEO if needed
- Monitor breadcrumb visibility over different hero block styles

## Technical Notes

- Breadcrumbs only show when `breadcrumbs=true` in page metadata
- **Desktop only**: Hidden on viewports < 900px to save mobile screen space
- The breadcrumb trail is built from navigation structure (`nav-sections`) OR URL path
- **URL-based fallback**: If page isn't in nav, breadcrumbs are built from URL segments
  - Example: `/credit-card/rupay-credit-card` → "CREDIT CARDS > RUPAY CREDIT CARD"
- **"Card" → "Cards" pluralization**: Automatically applied for better grammar
- **No "Home" breadcrumb**: Trail starts with first level after homepage
- Breadcrumbs load after header but before page sections for optimal performance
- CSS is loaded as part of `lazy-styles.css` (post-LCP)
- Placed inside wrapper div (e.g., `hero-wrapper`) for proper overlay positioning
- Position in DOM ensures proper semantic document structure

## Files Modified

1. **scripts/scripts.js** - Added breadcrumb logic and loading functions
   - `getDirectTextContent()`, `buildBreadcrumbsFromNavTree()`, `buildBreadcrumbs()`, `loadBreadcrumbs()`
   - No debug/console statements in production code
2. **styles/lazy-styles.css** - Added complete breadcrumb styles
   - Mobile-first approach with desktop overrides
   - Pill background, arrow dividers, all-caps text
3. **blocks/header/header.js** - Removed all breadcrumb code (moved to scripts.js)
4. **blocks/header/header.css** - Removed all breadcrumb styles (moved to lazy-styles.css)

## Design Decisions

### Why Not in Header?
Breadcrumbs were initially implemented in the header block but were moved to `scripts.js` and positioned inside the first content section (hero) for better visual design:
- Allows breadcrumbs to overlay hero backgrounds
- Creates clearer visual hierarchy
- Provides better context awareness (breadcrumbs appear "on" the page content)

### Why Hidden on Mobile?
Mobile screen real estate is precious. Since breadcrumbs are primarily a navigation aid for deep page hierarchies, and mobile users typically rely on the hamburger menu, hiding breadcrumbs on smaller screens provides a cleaner, more focused experience.

### Why No "Home" Breadcrumb?
For shallow site hierarchies (1-2 levels deep), showing "Home" adds unnecessary noise. Users understand they can click the logo to return home. Starting the breadcrumb trail at the first meaningful level provides more valuable context.

### Why ">" Arrow Divider?
The arrow divider provides clearer directional meaning than "/" and is a common UX pattern. The red color (`#9c1d26`) ties into the IDFC brand color scheme while maintaining sufficient contrast for readability.

## Example Page

See it in action: [https://103-breadcrumbs--idfc--aemsites.aem.page/credit-card/rupay-credit-card](https://103-breadcrumbs--idfc--aemsites.aem.page/credit-card/rupay-credit-card)
