// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default async function decorate(block) {
  // Check if tabs-list already exists - if so, script has already run successfully
  if (block.querySelector('.tabs-list')) {
    return; // Already processed, skip
  }

  // Get all children
  const children = [...block.children];

  // Extract title (H2) and main image (picture only, no other content)
  const titleDiv = children.find((child) => child.querySelector('h2'));
  const imageDiv = children.find((child) => {
    const hasPicture = child.querySelector('picture');
    const hasOtherContent = child.querySelector('h2, h3, p');
    return hasPicture && !hasOtherContent;
  });

  // Reset any partially processed panels (remove tabs-panel class and attributes)
  children.forEach((child) => {
    if (child.classList.contains('tabs-panel')) {
      child.classList.remove('tabs-panel');
      child.removeAttribute('id');
      child.removeAttribute('aria-hidden');
      child.removeAttribute('aria-labelledby');
      child.removeAttribute('role');
    }
  });

  // Filter to get only tab panels (skip image and title divs)
  const tabPanels = children.filter((child) => {
    const hasOnlyPicture = child.querySelector('picture') && !child.querySelector('h2, h3, p');
    const hasTitle = child.querySelector('h2');
    return !hasOnlyPicture && !hasTitle;
  });

  // Build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Process each tab panel - similar to original tabs.js but handle nested structure
  tabPanels.forEach((tabpanel, i) => {
    // Find the tab name element - it's in the first child div's p element
    const firstChildDiv = tabpanel.querySelector(':scope > div:first-child');
    if (!firstChildDiv) return; // Skip if no first child div

    const tabNameElement = firstChildDiv.querySelector('p');
    if (!tabNameElement) return; // Skip if no tab name found

    const tabName = tabNameElement.textContent.trim();
    if (!tabName) return; // Skip if empty

    const id = toClassName(tabName);

    // Decorate tabpanel
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // Build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;

    // Copy the tab name content (including icon) to button
    // Wrap in p tag to match expected structure
    moveInstrumentation(tabNameElement.parentElement, tabpanel.lastElementChild);
    button.innerHTML = `<p>${tabNameElement.innerHTML}</p>`;

    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);

    // Remove the tab name div from the panel (it's now in the button)
    firstChildDiv.remove();
    const buttonP = button.querySelector('p');
    if (buttonP) {
      moveInstrumentation(buttonP, null);
    }
  });

  // Create wrapper structure for tabs area (will contain image and tabs)
  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'tabs-upi-link-content';

  // Add image to wrapper (for desktop - outside tabs)
  if (imageDiv) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'tabs-upi-link-image';
    // Clone the picture element (we'll use original for desktop, clones for mobile)
    const picture = imageDiv.querySelector('picture');
    if (picture) {
      // Clone for desktop (outside tabs)
      const desktopPicture = picture.cloneNode(true);
      imageWrapper.appendChild(desktopPicture);
      tabsWrapper.appendChild(imageWrapper);

      // Clone image into each tab panel for mobile (inside each tab)
      tabPanels.forEach((tabpanel) => {
        const mobileImageWrapper = document.createElement('div');
        mobileImageWrapper.className = 'tabs-upi-link-panel-image';
        const mobilePicture = picture.cloneNode(true);
        mobileImageWrapper.appendChild(mobilePicture);

        // Wrap all existing content (except the image we're adding) in a container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tabs-upi-link-panel-content';
        while (tabpanel.firstChild) {
          contentWrapper.appendChild(tabpanel.firstChild);
        }

        // Insert image first, then content wrapper
        tabpanel.appendChild(mobileImageWrapper);
        tabpanel.appendChild(contentWrapper);
      });
    }
  }

  // Create tabs container (will contain tabs-list and tabs-panels)
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-upi-link-tabs';

  // Add tabs-list to tabs container
  if (tablist.children.length > 0) {
    tabsContainer.appendChild(tablist);
  }

  // Move all tab panels to tabs container
  tabPanels.forEach((tabpanel) => {
    tabsContainer.appendChild(tabpanel);
  });

  // Add tabs container to wrapper
  tabsWrapper.appendChild(tabsContainer);

  // Clear block and rebuild structure: title -> wrapper (image + tabs)
  block.textContent = '';

  // Add title at the top
  if (titleDiv) {
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'tabs-upi-link-title';
    titleWrapper.appendChild(titleDiv);
    block.appendChild(titleWrapper);
  }

  // Add tabs wrapper (contains image + tabs)
  block.appendChild(tabsWrapper);
}
