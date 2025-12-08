/**
 * 80-icons.js - Icon decoration for header navigation
 * This module adds icons to the "what are you looking for", "what's special about us",
 * and "login" navigation items using DAM-hosted SVG images.
 */

// DAM paths for header icons
const ICON_PATHS = {
  search: '/content/dam/idfcfirstbank/images/sr-revamp/icons/search-icon.svg',
  special: '/content/dam/idfcfirstbank/images/homepage-redesign/special-icon.svg',
  login: '/content/dam/idfcfirstbank/images/homepage-redesign/login_header_icon.svg',
};

/**
 * Creates an icon image element with the specified DAM path
 * @param {string} iconKey - The key from ICON_PATHS (search, special, login)
 * @param {string} alt - Alt text for the icon
 * @returns {HTMLImageElement} The created image element
 */
function createIconImage(iconKey, alt = '') {
  const img = document.createElement('img');
  img.src = ICON_PATHS[iconKey];
  img.alt = alt;
  img.loading = 'lazy';
  img.classList.add('nav-icon');
  img.dataset.iconName = iconKey;
  return img;
}

/**
 * Decorates the search icon in the nav-tools section
 * @param {Element} navTools - The nav-tools container element
 */
function decorateSearchIcon(navTools) {
  const searchSpan = navTools.querySelector('.icon-search');
  if (searchSpan && !searchSpan.querySelector('img')) {
    const img = createIconImage('search', 'Search');
    searchSpan.appendChild(img);
  }
}

/**
 * Decorates the special icon in the nav-tools section
 * @param {Element} navTools - The nav-tools container element
 */
function decorateSpecialIcon(navTools) {
  const specialSpan = navTools.querySelector('.icon-special');
  if (specialSpan && !specialSpan.querySelector('img')) {
    const img = createIconImage('special', "What's special about us");
    specialSpan.appendChild(img);
  }
}

/**
 * Decorates the login icon in the nav-tools section
 * Adds the icon before the "Login" text in the last list item
 * @param {Element} navTools - The nav-tools container element
 */
function decorateLoginIcon(navTools) {
  const toolsUl = navTools.querySelector('.default-content-wrapper > ul');
  if (toolsUl) {
    const lastLi = toolsUl.querySelector('li:last-child');
    if (lastLi && lastLi.textContent.toLowerCase().includes('login')) {
      // Check if icon already exists
      if (!lastLi.querySelector('.icon-login-header')) {
        const iconSpan = document.createElement('span');
        iconSpan.classList.add('icon', 'icon-login-header');
        const img = createIconImage('login', 'Login');
        iconSpan.appendChild(img);
        lastLi.prepend(iconSpan);
      }
    }
  }
}

/**
 * Main function to decorate all header navigation icons
 * Call this after the header has been built
 * @param {Element} nav - The nav element or document if not provided
 */
export function decorateHeaderIcons(nav = document) {
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    decorateSearchIcon(navTools);
    decorateSpecialIcon(navTools);
    decorateLoginIcon(navTools);
  }
}

export default decorateHeaderIcons;
