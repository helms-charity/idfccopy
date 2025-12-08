/**
 * 80-icons.js - Icon enhancements for header navigation
 *
 * This module adds icons before navigation titles in the nav-tools section:
 * - icon-search.svg → "what are you looking for"
 * - special-icon.svg → "what's special about us"
 * - login_header_icon.svg → "login"
 *
 * Import and call addNavToolsIcons(navToolsWrapper) after building the nav-tools section.
 */

/**
 * Adds icon to the Login item in the nav-tools list
 * @param {Element} navToolsWrapper - The nav-tools wrapper element
 */
export function addLoginIcon(navToolsWrapper) {
  if (!navToolsWrapper) return;

  // Find the Login list item
  const toolsUl = navToolsWrapper.querySelector('ul');
  if (!toolsUl) return;

  const loginLi = Array.from(toolsUl.querySelectorAll('li')).find(
    (li) => li.textContent.trim().toLowerCase() === 'login',
  );

  if (loginLi) {
    // Create the icon span
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon', 'icon-login_header');

    // Insert icon before the text content
    const textContent = loginLi.textContent.trim();
    loginLi.textContent = '';
    loginLi.appendChild(iconSpan);
    loginLi.appendChild(document.createTextNode(textContent));
  }
}

/**
 * Ensures search icon is present in the search bar
 * @param {Element} navToolsWrapper - The nav-tools wrapper element
 */
export function ensureSearchIcon(navToolsWrapper) {
  if (!navToolsWrapper) return;

  const searchP = navToolsWrapper.querySelector('p:first-child');
  if (searchP && !searchP.querySelector('.icon-search')) {
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon', 'icon-search');
    searchP.insertBefore(iconSpan, searchP.firstChild);
  }
}

/**
 * Ensures special icon is present in "What's special about us"
 * @param {Element} navToolsWrapper - The nav-tools wrapper element
 */
export function ensureSpecialIcon(navToolsWrapper) {
  if (!navToolsWrapper) return;

  const specialP = navToolsWrapper.querySelector('p:nth-child(2)');
  if (specialP && !specialP.querySelector('.icon-special')) {
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon', 'icon-special');
    specialP.insertBefore(iconSpan, specialP.firstChild);
  }
}

/**
 * Adds all nav-tools icons (search, special, login)
 * Call this function after building the nav-tools section in header.js
 * @param {Element} navToolsWrapper - The nav-tools wrapper element
 */
export function addNavToolsIcons(navToolsWrapper) {
  ensureSearchIcon(navToolsWrapper);
  ensureSpecialIcon(navToolsWrapper);
  addLoginIcon(navToolsWrapper);
}

export default addNavToolsIcons;

