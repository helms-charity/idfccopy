/**
 * Category Navigation - Collects all category-nav blocks and builds unified navigation
 */

// Track if we've already built the unified nav
let unifiedNavBuilt = false;

/**
 * Reset the unified nav flag - used by editor-support.js when reloading
 * @returns {void}
 */
export function resetUnifiedNavFlag() {
  // eslint-disable-next-line no-console
  console.log('[Category Nav Block] Resetting unified nav flag for rebuild');
  unifiedNavBuilt = false;
}

/**
 * Build a card from a category nav item row
 */
function buildCardFromRow(row) {
  const cells = Array.from(row.children);
  if (cells.length === 0) return null;

  const card = document.createElement('div');
  card.classList.add('gradientCard', 'category-nav-card');

  // Extract data from cells
  // Order matches _category-nav.json model:
  // title, link, card-bg, tag1, tag1-bg, tag2, tag2-bg, tag3, tag3-bg
  const title = cells[0]?.textContent?.trim() || '';
  const link = cells[1]?.querySelector('a')?.href || cells[1]?.textContent?.trim() || '#';
  const cardBgColor = cells[2]?.textContent?.trim() || '';
  const tag1 = cells[3]?.textContent?.trim() || '';
  const tag1BgColor = cells[4]?.textContent?.trim() || '';
  const tag2 = cells[5]?.textContent?.trim() || '';
  const tag2BgColor = cells[6]?.textContent?.trim() || '';
  const tag3 = cells[7]?.textContent?.trim() || '';
  const tag3BgColor = cells[8]?.textContent?.trim() || '';

  // Skip rows without a title - they're likely headers or empty rows
  if (!title) {
    return null;
  }

  // Add data attributes for easier targeting
  card.setAttribute('data-card-title', title);
  if (cardBgColor) card.setAttribute('data-card-gradient', cardBgColor);

  // Add card background color
  if (cardBgColor) {
    card.classList.add(cardBgColor);
  } else {
    card.classList.add('default-tan-gradient');
  }

  const cardLink = document.createElement('a');
  cardLink.href = link;
  cardLink.classList.add('category-nav-card-link');
  cardLink.setAttribute('data-gtm-desk-l3cards-click', '');

  // Tags container
  const tagsContainer = document.createElement('div');
  tagsContainer.classList.add('tags', 'category-nav-tags');

  // Add tags if they exist
  const tags = [];
  if (tag1) tags.push({ text: tag1, colorClass: tag1BgColor });
  if (tag2) tags.push({ text: tag2, colorClass: tag2BgColor });
  if (tag3) tags.push({ text: tag3, colorClass: tag3BgColor });

  if (tags.length > 0) {
    tags.forEach((tag, index) => {
      const tagSpan = document.createElement('span');
      tagSpan.classList.add('tag', 'category-nav-tag');
      // Only add color class if it exists and doesn't contain spaces
      if (tag.colorClass && tag.colorClass.trim() && !tag.colorClass.includes(' ')) {
        tagSpan.classList.add(tag.colorClass);
      }
      tagSpan.textContent = tag.text;
      tagSpan.setAttribute('data-tag-index', index + 1);
      tagsContainer.appendChild(tagSpan);
    });
  } else {
    tagsContainer.style.display = 'none';
  }

  cardLink.appendChild(tagsContainer);

  // Card title
  const titleDiv = document.createElement('div');
  titleDiv.classList.add('title', 'category-nav-card-title');
  titleDiv.textContent = title;

  const iconSpan = document.createElement('span');
  iconSpan.classList.add('icon-Right', 'category-nav-card-icon');
  titleDiv.appendChild(iconSpan);

  cardLink.appendChild(titleDiv);
  card.appendChild(cardLink);

  return card;
}

/**
 * Parse a single category-nav block to extract its data
 */
function parseCategoryNavBlock(block) {
  // Get the category name from the section's first text element
  const section = block.closest('.section');
  const textElements = section?.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
  let categoryName = 'Category';

  // Find the first text element that's not inside the category-nav block
  // eslint-disable-next-line no-restricted-syntax
  for (const el of textElements || []) {
    if (!block.contains(el)) {
      categoryName = el.textContent.trim();
      break;
    }
  }

  // Extract eyebrow-title, link, and linkText from block structure
  const rows = Array.from(block.children);
  let eyebrowTitle = '';
  let linkText = '';
  let linkUrl = '';

  // Debug: log first few rows to understand structure
  // eslint-disable-next-line no-console
  console.log('[Category Nav] Block rows:', rows.length);
  rows.slice(0, 4).forEach((row, idx) => {
    const cells = Array.from(row.children);
    // eslint-disable-next-line no-console
    console.log(`[Category Nav] Row ${idx} cells:`, cells.length, cells.map((c) => c.textContent?.trim()));
  });

  // Category-level fields are in separate rows with 1 cell each at the top
  // Row 0: eyebrow-title (1 cell, plain text)
  // Row 1: explore-link (1 cell, URL - can be plain text or <a> tag)
  // Row 2: explore-link-description (1 cell, plain text)
  // Remaining rows: card items (9 cells each)
  let metadataRowCount = 0;

  // Row 0: eyebrow-title
  if (rows.length > 0 && rows[0].children.length === 1) {
    eyebrowTitle = rows[0].children[0]?.textContent?.trim() || '';
    metadataRowCount = 1;
  }

  // Row 1: explore-link (URL)
  if (rows.length > 1 && rows[1].children.length === 1) {
    const linkCell = rows[1].children[0];
    const linkAnchor = linkCell?.querySelector('a');
    if (linkAnchor) {
      linkUrl = linkAnchor.href || '';
    } else {
      linkUrl = linkCell?.textContent?.trim() || '';
    }
    metadataRowCount = 2;
  }

  // Row 2: explore-link-description (display text)
  if (rows.length > 2 && rows[2].children.length === 1) {
    linkText = rows[2].children[0]?.textContent?.trim() || '';
    metadataRowCount = 3;
  }

  // Get all the category nav items (rows in the block table)
  // Skip metadata rows and start from the first card item (9-cell rows)
  const items = [];
  rows.slice(metadataRowCount).forEach((row) => {
    const card = buildCardFromRow(row);
    if (card) {
      items.push(card);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[Category Nav] Parsed category "${categoryName}":`, {
    eyebrowTitle,
    linkText,
    linkUrl,
    itemCount: items.length,
  });

  return {
    title: categoryName,
    id: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, ''),
    eyebrowTitle,
    linkText,
    linkUrl,
    items,
  };
}

/**
 * Build dropdown content
 */
function buildDropdown(categoryData) {
  if (!categoryData.items || categoryData.items.length === 0) return null;

  const dropdown = document.createElement('div');
  dropdown.classList.add('dropdown-content', 'animated', 'fadeIn', 'menu-cardList-cnt', 'category-nav-dropdown');
  dropdown.setAttribute('data-category', categoryData.id);

  // Header box
  const hdBx = document.createElement('div');
  hdBx.classList.add('hd-bx', 'category-nav-dropdown-header');

  // Left side: Eyebrow title
  if (categoryData.eyebrowTitle) {
    const eyebrowText = document.createElement('p');
    eyebrowText.classList.add('hd-bx-eyebrow', 'category-nav-eyebrow-title');
    eyebrowText.textContent = categoryData.eyebrowTitle;
    hdBx.appendChild(eyebrowText);
  }

  // Right side: Link
  if (categoryData.linkText && categoryData.linkUrl) {
    const linkElement = document.createElement('a');
    linkElement.classList.add('hd-bx-link', 'category-nav-explore-link');
    linkElement.href = categoryData.linkUrl;
    linkElement.textContent = categoryData.linkText;
    hdBx.appendChild(linkElement);
  }

  dropdown.appendChild(hdBx);

  // Build card list
  const menuCardList = document.createElement('div');
  menuCardList.classList.add('menu-cardList', 'MT15', 'category-nav-cards-container');

  categoryData.items.forEach((card) => {
    menuCardList.appendChild(card);
  });

  dropdown.appendChild(menuCardList);
  return dropdown;
}

/**
 * Build the unified navigation bar from all category data
 */
function buildUnifiedNavigation(categoriesData) {
  const topNav = document.createElement('div');
  topNav.classList.add('top-nav', 'bg-light-white', 'category-nav-bar');

  const tabsPane = document.createElement('div');
  tabsPane.classList.add('tabs-pane-js', 'category-nav-tabs-pane');

  const tabPane = document.createElement('div');
  tabPane.classList.add('tab-pane', 'top-second-nav-js', 'active', 'category-nav-tab-pane');

  const navList = document.createElement('ul');
  navList.classList.add('top-nav-left', 'category-nav-list');

  categoriesData.forEach((category) => {
    const li = document.createElement('li');
    li.classList.add('drop-down', 'all-drop-down', 'category-nav-item');
    li.setAttribute('data-header-gtm', category.title);
    li.setAttribute('data-category', category.id);

    const link = document.createElement('a');
    link.classList.add('category-nav-link');
    link.textContent = category.title;
    link.href = `#${category.id}`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(category.id);
      if (target) {
        const yOffset = -200;
        const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
    li.appendChild(link);

    // Build dropdown
    const dropdown = buildDropdown(category);
    if (dropdown) {
      li.appendChild(dropdown);
    }

    navList.appendChild(li);
  });

  tabPane.appendChild(navList);
  tabsPane.appendChild(tabPane);
  topNav.appendChild(tabsPane);

  return topNav;
}

/**
 * Check if we're viewing a framework page (either in Universal Editor or directly)
 * Framework pages are template/fragment pages and should display their raw content
 * @returns {boolean} True if viewing a framework page
 */
function isEditingFrameworkPage() {
  // Check if current path is in the framework folder
  // The path could be /framework/* or /content/idfc-edge/framework/*
  const isFrameworkPath = window.location.pathname.includes('/framework/');

  if (isFrameworkPath) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav] Skipping framework page:', window.location.pathname);
  }

  return isFrameworkPath;
}

export default function decorate(block) {
  // Skip decoration when viewing framework pages
  // Framework pages are templates/fragments and should display their raw content
  if (isEditingFrameworkPage()) {
    return;
  }

  // Skip decoration if this block is in a fragment being loaded
  // It will be decorated explicitly after injection into the page
  if (block.hasAttribute('data-fragment-block')) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] Skipping decoration - block is in fragment');
    return;
  }

  // Only build the unified nav once, from the first block that loads
  if (unifiedNavBuilt) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] Skipping - unified nav already built');
    // Hide subsequent blocks
    block.style.display = 'none';
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[Category Nav Block] Starting decoration - first block loading');
  unifiedNavBuilt = true;

  // Find ALL category-nav blocks on the page
  const allCategoryNavBlocks = document.querySelectorAll('.category-nav.block');

  // eslint-disable-next-line no-console
  console.log(`[Category Nav Block] Found ${allCategoryNavBlocks.length} block(s) on page`);

  if (allCategoryNavBlocks.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] No blocks found, aborting');
    block.style.display = 'none';
    return;
  }

  // Parse data from all blocks and add section IDs
  const categoriesData = [];
  allCategoryNavBlocks.forEach((navBlock, index) => {
    const categoryData = parseCategoryNavBlock(navBlock);
    // eslint-disable-next-line no-console
    console.log(`[Category Nav Block] Block ${index + 1}: "${categoryData.title}" with ${categoryData.items.length} items`);
    if (categoryData.items.length > 0) {
      categoriesData.push(categoryData);

      // Add ID to the section for anchor navigation
      const section = navBlock.closest('.section');
      if (section && !section.id) {
        section.id = categoryData.id;
        section.setAttribute('data-category-id', categoryData.id);
        // eslint-disable-next-line no-console
        console.log(`[Category Nav Block] Added ID "${categoryData.id}" to section`);
      }
    }
  });

  if (categoriesData.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] No valid categories with items found');
    block.style.display = 'none';
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[Category Nav Block] Building unified navigation with ${categoriesData.length} categories`);

  // Build the unified navigation
  const unifiedNav = buildUnifiedNavigation(categoriesData);

  // Find the wrapper that was created by scripts.js
  let categoryNavWrapper = document.querySelector('.category-nav-wrapper[data-nav-placeholder="true"]');

  if (!categoryNavWrapper) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] No placeholder wrapper found, creating one');
    // If no placeholder wrapper exists, create one
    categoryNavWrapper = document.createElement('div');
    categoryNavWrapper.classList.add('category-nav-wrapper');
    const main = document.querySelector('main');
    if (main) {
      main.insertBefore(categoryNavWrapper, main.firstChild);
    } else {
      // eslint-disable-next-line no-console
      console.error('[Category Nav Block] Could not find main element to insert wrapper');
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] Found placeholder wrapper, populating it');
  }

  // Populate the wrapper with the unified navigation
  categoryNavWrapper.innerHTML = '';
  categoryNavWrapper.appendChild(unifiedNav);
  categoryNavWrapper.removeAttribute('data-nav-placeholder');

  // Move to header
  const navWrapper = document.querySelector('header.header-wrapper .nav-wrapper');
  if (navWrapper && !navWrapper.contains(categoryNavWrapper)) {
    navWrapper.appendChild(categoryNavWrapper);
    categoryNavWrapper.classList.add('header-category-nav');
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] Moved navigation to header');
  } else if (!navWrapper) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Block] Header nav-wrapper not found, keeping navigation in main');
  }

  // Hide all the individual category-nav blocks in the main content
  allCategoryNavBlocks.forEach((navBlock) => {
    navBlock.style.display = 'none';
    // Also hide the parent section if it only contains the nav block
    const section = navBlock.closest('.section');
    if (section) {
      const visibleContent = Array.from(section.children).filter(
        (child) => child !== navBlock && !child.classList.contains('section-metadata') && child.textContent.trim() !== '',
      );
      if (visibleContent.length === 0) {
        section.style.display = 'none';
      }
    }
  });

  // eslint-disable-next-line no-console
  console.log('[Category Nav Block] Decoration complete - navigation is ready');
}
