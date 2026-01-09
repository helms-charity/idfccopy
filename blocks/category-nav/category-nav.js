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
  unifiedNavBuilt = false;
}

/**
 * Build a card from a category nav item row
 */
function buildCardFromRow(row) {
  const cells = Array.from(row.children);
  if (cells.length === 0) return null;

  const card = document.createElement('div');
  card.classList.add('category-nav-card');

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
  tagsContainer.classList.add('category-nav-tags');

  // Add tags if they exist
  const tags = [];
  if (tag1) tags.push({ text: tag1, colorClass: tag1BgColor });
  if (tag2) tags.push({ text: tag2, colorClass: tag2BgColor });
  if (tag3) tags.push({ text: tag3, colorClass: tag3BgColor });

  if (tags.length > 0) {
    tags.forEach((tag, index) => {
      const tagSpan = document.createElement('span');
      tagSpan.classList.add('category-nav-tag');
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
  titleDiv.classList.add('category-nav-card-title');
  titleDiv.textContent = title;

  const iconSpan = document.createElement('span');
  iconSpan.classList.add('category-nav-card-icon');
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
  dropdown.classList.add('category-nav-dropdown');
  dropdown.setAttribute('data-category', categoryData.id);

  // Header box
  const hdBx = document.createElement('div');
  hdBx.classList.add('category-nav-dropdown-header');

  // Left side: Eyebrow title
  if (categoryData.eyebrowTitle) {
    const eyebrowText = document.createElement('p');
    eyebrowText.classList.add('category-nav-eyebrow-title');
    eyebrowText.textContent = categoryData.eyebrowTitle;
    hdBx.appendChild(eyebrowText);
  }

  // Right side: Link
  if (categoryData.linkText && categoryData.linkUrl) {
    const linkElement = document.createElement('a');
    linkElement.classList.add('category-nav-explore-link');
    linkElement.href = categoryData.linkUrl;
    linkElement.textContent = categoryData.linkText;
    hdBx.appendChild(linkElement);
  }

  dropdown.appendChild(hdBx);

  // Build card list
  const menuCardList = document.createElement('div');
  menuCardList.classList.add('category-nav-cards-container');

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
    li.classList.add('category-nav-item');
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
 * Build mobile navigation from all category data
 * Creates separate expandable list items for each category
 * DISABLED - Mobile navigation is now handled by fragment-based nav in header.js
 */
// function buildMobileNavigation(categoriesData) {
//   // Return an array of category nav items instead of a single wrapper
//   const categoryNavItems = [];

//   categoriesData.forEach((category) => {
//     // Skip categories with no items
//     if (!category.items || category.items.length === 0) {
//       return;
//     }

//     // Create a nav-drop item for this category
//     const categoryNavItem = document.createElement('li');
//     categoryNavItem.classList.add('nav-drop', 'mobile-category-nav-item');
//     categoryNavItem.setAttribute('data-category', category.id);
//     categoryNavItem.setAttribute('aria-expanded', 'false');

//     // Category title as the clickable header
//     const categoryTitle = document.createElement('p');
//     const categoryLink = document.createElement('a');
//     categoryLink.textContent = category.title;
//     categoryLink.href = `#${category.id}`;
//     categoryTitle.appendChild(categoryLink);
//     categoryNavItem.appendChild(categoryTitle);

//     // Container for cards
//     const cardsUl = document.createElement('ul');
//     cardsUl.classList.add('mobile-category-cards-list');

//     // Add all cards for this category
//     category.items.forEach((card) => {
//       const cardLi = document.createElement('li');
//       cardLi.classList.add('mobile-category-card-item');

//       // Clone the card to reuse the same structure
//       const cardClone = card.cloneNode(true);
//       cardClone.classList.add('mobile-card');

//       // Add click handler to close menu when card is clicked
//       const cardLink = cardClone.querySelector('a');
//       if (cardLink) {
//         cardLink.addEventListener('click', () => {
//           const nav = document.getElementById('nav');
//           if (nav) {
//             nav.setAttribute('aria-expanded', 'false');
//             document.body.style.overflowY = '';
//           }
//         });
//       }

//       cardLi.appendChild(cardClone);
//       cardsUl.appendChild(cardLi);
//     });

//     categoryNavItem.appendChild(cardsUl);

//     // Add click handler for expand/collapse
//     const isDesktop = window.matchMedia('(min-width: 900px)');
//     categoryNavItem.addEventListener('click', (e) => {
//       // Only handle on mobile
//       if (isDesktop.matches) return;

//       // Don't toggle if clicking on a card link
//       if (e.target.closest('.category-nav-card-link')) return;

//       const subUl = categoryNavItem.querySelector('ul');
//       if (subUl) {
//         const { scrollHeight } = subUl;
//         categoryNavItem.style.setProperty('--scroll-height', `${scrollHeight}px`);
//         const expanded = categoryNavItem.getAttribute('aria-expanded') === 'true';
//         categoryNavItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');
//       }
//     });

//     categoryNavItems.push(categoryNavItem);
//   });

//   return categoryNavItems;
// }

/**
 * Smart positioning for dropdown menus to prevent overflow
 * Positions each dropdown to stay within viewport with padding
 * Accounts for responsive dropdown widths based on viewport size
 */
function positionDropdowns() {
  const navItems = document.querySelectorAll('.category-nav-item');
  const viewportWidth = window.innerWidth;
  const padding = 40; // Extra padding from right edge

  // Determine dropdown width based on viewport (matches CSS media queries)
  let dropdownWidth = 860; // Default width for >= 1200px
  if (viewportWidth >= 900 && viewportWidth < 1200) {
    dropdownWidth = 720; // Medium screens
  }

  navItems.forEach((item) => {
    const dropdown = item.querySelector('.category-nav-dropdown');
    if (!dropdown) return;

    // Get the position of the nav item
    const itemRect = item.getBoundingClientRect();

    // Calculate if dropdown would overflow
    const dropdownRightEdge = itemRect.left + dropdownWidth;
    const overflow = dropdownRightEdge - (viewportWidth - padding);

    // Reset any previous positioning
    dropdown.style.left = '';
    dropdown.style.right = '';

    if (overflow > 0) {
      // Dropdown would overflow, shift it left
      const shift = overflow;
      dropdown.style.left = `-${shift}px`;
    } else {
      // Dropdown fits, align to left edge of trigger
      dropdown.style.left = '0';
    }
  });
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
    return;
  }

  // Only build the unified nav once, from the first block that loads
  if (unifiedNavBuilt) {
    // Hide subsequent blocks
    block.style.display = 'none';
    return;
  }

  unifiedNavBuilt = true;

  // Find ALL category-nav blocks on the page
  const allCategoryNavBlocks = document.querySelectorAll('.category-nav.block');

  if (allCategoryNavBlocks.length === 0) {
    block.style.display = 'none';
    return;
  }

  // Parse data from all blocks and add section IDs
  const categoriesData = [];
  allCategoryNavBlocks.forEach((navBlock) => {
    const categoryData = parseCategoryNavBlock(navBlock);
    if (categoryData.items.length > 0) {
      categoriesData.push(categoryData);

      // Add ID to the section for anchor navigation
      const section = navBlock.closest('.section');
      if (section && !section.id) {
        section.id = categoryData.id;
        section.setAttribute('data-category-id', categoryData.id);
      }
    }
  });

  if (categoriesData.length === 0) {
    block.style.display = 'none';
    return;
  }

  // Build the unified navigation
  const unifiedNav = buildUnifiedNavigation(categoriesData);

  // Find the wrapper that was created by scripts.js
  let categoryNavWrapper = document.querySelector('.category-nav-wrapper[data-nav-placeholder="true"]');

  if (!categoryNavWrapper) {
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
  }

  // Build and inject mobile navigation - DISABLED
  // Mobile navigation is now handled by fragment-based nav in header.js
  // const mobileNavItems = buildMobileNavigation(categoriesData);
  // const navSectionsUl = document.querySelector(
  //   'header nav .nav-sections .default-content-wrapper > ul'
  // );
  // if (navSectionsUl && mobileNavItems && mobileNavItems.length > 0) {
  //   // Insert after the "Explore Personal Banking" item (second li)
  //   const secondLi = navSectionsUl.children[1];
  //   const insertionPoint = secondLi ? secondLi.nextSibling : null;

  //   // Insert all category nav items
  //   mobileNavItems.forEach((categoryNavItem) => {
  //     if (insertionPoint) {
  //       navSectionsUl.insertBefore(categoryNavItem, insertionPoint);
  //     } else {
  //       // Fallback: append to the end
  //       navSectionsUl.appendChild(categoryNavItem);
  //     }
  //   });
  // }

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

  // Position dropdowns intelligently after a short delay to ensure DOM is fully rendered
  setTimeout(() => {
    positionDropdowns();
  }, 100);

  // Reposition dropdowns on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      positionDropdowns();
    }, 150);
  });

  // Also reposition on mouseenter for extra accuracy
  const navItems = document.querySelectorAll('.category-nav-item');
  navItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      positionDropdowns();
    });
  });
}
