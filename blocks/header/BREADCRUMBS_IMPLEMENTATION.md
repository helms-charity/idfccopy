# Breadcrumbs Implementation

## Overview
Breadcrumb navigation has been successfully added to the header block following the [AEM Block Collection breadcrumbs documentation](https://www.aem.live/developer/block-collection/breadcrumbs).

## What Was Added

### 1. **JavaScript Functions** (blocks/header/header.js)
- `getDirectTextContent(menuItem)` - Extracts text content from menu items
- `buildBreadcrumbsFromNavTree(nav, currentUrl)` - Builds breadcrumb trail from navigation structure
- `buildBreadcrumbs()` - Creates the breadcrumb navigation element
- Added import for `fetchPlaceholders` from aem.js

### 2. **CSS Styling** (blocks/header/header.css)
- Added breadcrumb-specific styles at the end of the file
- Responsive layout with different padding for mobile/desktop
- Styled breadcrumb separator (/) between items
- Current page styling with `aria-current` attribute

## How to Enable Breadcrumbs

Breadcrumbs are **opt-in per page** using page metadata. To enable breadcrumbs on a page:

### Method 1: In Document Authoring
Add a metadata block to your page with:
```
Metadata
breadcrumbs | true
```

### Method 2: In Page Properties
Set the `breadcrumbs` metadata field to `true` in the page properties.

## How It Works

1. **Navigation Tree Matching**: The breadcrumb logic searches through your navigation structure to find the current page's position in the hierarchy.

2. **Automatic Trail Building**: It builds the breadcrumb trail by traversing up the navigation tree from the current page to the home page.

3. **Fallback**: If the current page isn't found in the navigation, it uses the page's `og:title` metadata.

4. **Home Label**: The "Home" label can be customized using placeholders:
   - Add a placeholder with key `breadcrumbsHomeLabel` to customize the home link text

## Example Output

```
Home / Personal / Loans / Personal Loans
```

Where:
- "Home" links to the homepage
- Intermediate items link to their respective pages
- The last item (current page) is not linked and has `aria-current="page"`

## Accessibility Features

- Uses semantic `<nav>` element with `aria-label="Breadcrumb"`
- Structured as an ordered list (`<ol>`)
- Current page marked with `aria-current="page"` attribute
- Proper link hierarchy for screen readers

## Customization

### Styling
The breadcrumb styles use CSS variables where available:
- `--breadcrumbs-height`: Height of breadcrumb container (default: 40px)
- `--body-font-size-xs`: Font size (default: 12px)
- `--dark-color`: Color for breadcrumb links (default: #666)
- `--text-color`: Color for current page (default: #000)

You can override these in your styles.css or adjust the breadcrumb CSS directly in header.css.

### Home Label
Customize the "Home" text by adding to your placeholders:
```
breadcrumbsHomeLabel | Home
```

Change "Home" to any text you prefer (e.g., "Homepage", "Start", etc.)

## Testing

To test breadcrumbs:

1. Add `breadcrumbs | true` to a page's metadata
2. Ensure the page is linked in your navigation structure
3. View the page - breadcrumbs should appear below the main navigation
4. Verify the breadcrumb trail matches the navigation hierarchy

## Next Steps

- Test on various pages to ensure navigation matching works correctly
- Customize breadcrumb styling to match IDFC brand guidelines
- Add any additional breadcrumb-specific CSS adjustments needed
- Consider adding structured data (JSON-LD) for SEO if needed

## Notes

- Breadcrumbs only show when `breadcrumbs=true` in page metadata
- The breadcrumb trail is built from your navigation structure
- If a page isn't in the nav, it will show: Home / [Page Title]
- Styling follows AEM Block Collection defaults and can be customized

