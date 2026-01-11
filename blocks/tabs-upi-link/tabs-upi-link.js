// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Creates a video element for the phone animation
 * @param {string} videoSrc - The video source URL
 * @returns {HTMLVideoElement} The video element
 */
function createVideoElement(videoSrc) {
  const video = document.createElement('video');
  video.className = 'phone-animation-video';
  video.src = videoSrc;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', ''); // iOS support
  video.setAttribute('webkit-playsinline', ''); // Older iOS support
  return video;
}

/**
 * Checks if a tab panel contains only a video link (no other content like icons)
 * @param {HTMLElement} tabPanel - The tab panel element
 * @returns {string|null} The video path or null if not a video-only tab
 */
function getVideoOnlyPath(tabPanel) {
  const firstChild = tabPanel.querySelector(':scope > div:first-child');
  if (!firstChild) return null;

  const link = firstChild.querySelector('a');
  if (link && link.href && link.href.endsWith('.mp4')) {
    // Check if this is a video-only tab (no icon)
    const hasIcon = firstChild.querySelector('.icon, picture');
    if (!hasIcon) {
      return link.href;
    }
  }
  return null;
}

// Store video paths mapped to their corresponding tabs
const tabVideoMap = new Map();

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

  // Store tab names for later use
  const tabNames = [];

  // First pass: identify video-only tabs and extract video paths
  let pendingVideoPath = null;
  const processableTabs = [];

  tabPanels.forEach((tabpanel) => {
    const videoPath = getVideoOnlyPath(tabpanel);
    if (videoPath) {
      // This is a video-only tab, store the path for the next tab
      pendingVideoPath = videoPath;
      // Mark this tab for removal (don't add to processable tabs)
      tabpanel.dataset.videoOnly = 'true';
    } else {
      // This is a regular tab
      processableTabs.push({ tabpanel, videoPath: pendingVideoPath });
      pendingVideoPath = null; // Reset for next iteration
    }
  });

  // Process each regular tab panel
  processableTabs.forEach(({ tabpanel, videoPath }, i) => {
    // Find the tab name element - it's in the first child div's p element
    const firstChildDiv = tabpanel.querySelector(':scope > div:first-child');
    if (!firstChildDiv) return; // Skip if no first child div

    const tabNameElement = firstChildDiv.querySelector('p');
    if (!tabNameElement) return; // Skip if no tab name found

    const tabName = tabNameElement.textContent.trim();
    if (!tabName) return; // Skip if empty

    // Store tab name (use "app" for first tab, actual name for others)
    tabNames.push(i === 0 ? 'the app' : tabName);

    const id = toClassName(tabName);

    // Store video path for this tab if one was provided
    if (videoPath) {
      tabVideoMap.set(id, videoPath);
    }

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
      // Skip if already selected
      if (button.getAttribute('aria-selected') === 'true') return;

      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);

      // Update phone video if this tab has a video
      const videoContainer = block.querySelector('.phone-animation-video-container');
      if (videoContainer) {
        // Get tab ID from button ID (remove 'tab-' prefix)
        const tabId = button.id.replace('tab-', '');
        const videoPath = tabVideoMap.get(tabId);
        const existingVideo = videoContainer.querySelector('video');

        if (videoPath) {
          if (existingVideo) {
            existingVideo.src = videoPath;
            existingVideo.style.display = 'block';
            existingVideo.load();
            existingVideo.play();
          } else {
            const newVideo = createVideoElement(videoPath);
            videoContainer.appendChild(newVideo);
          }
        } else if (existingVideo) {
          // No video for this tab, hide video
          existingVideo.pause();
          existingVideo.style.display = 'none';
        }
      }
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

      // Add video container for phone animation (desktop only)
      const videoContainer = document.createElement('div');
      videoContainer.className = 'phone-animation-video-container';
      imageWrapper.appendChild(videoContainer);

      tabsWrapper.appendChild(imageWrapper);

      // Clone image into each tab panel for mobile (inside each tab)
      tabPanels.forEach((tabpanel) => {
        const mobileImageWrapper = document.createElement('div');
        mobileImageWrapper.className = 'tabs-upi-link-panel-image';
        const mobilePicture = picture.cloneNode(true);
        mobileImageWrapper.appendChild(mobilePicture);

        // Extract button container if it exists
        const buttonContainer = tabpanel.querySelector('.button-container');
        if (buttonContainer) {
          buttonContainer.remove();
        }

        // Wrap all existing content (except the image we're adding) in a container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tabs-upi-link-panel-content';
        while (tabpanel.firstChild) {
          contentWrapper.appendChild(tabpanel.firstChild);
        }

        // Create a wrapper for image and content (top section)
        const topSection = document.createElement('div');
        topSection.className = 'tabs-upi-link-panel-top';
        topSection.appendChild(mobileImageWrapper);
        topSection.appendChild(contentWrapper);

        // Insert top section first, then button container at the bottom
        tabpanel.appendChild(topSection);
        if (buttonContainer) {
          tabpanel.appendChild(buttonContainer);
        }
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

  // Move all tab panels to tabs container and add QR code text (skip video-only tabs)
  let tabIndex = 0;
  tabPanels.forEach((tabpanel) => {
    // Skip video-only tabs - they were already processed and their video paths stored
    if (tabpanel.dataset.videoOnly === 'true') {
      tabpanel.remove(); // Remove from DOM
      return;
    }

    tabsContainer.appendChild(tabpanel);

    // Find the QR code picture in this tab panel
    const qrPicture = tabpanel.querySelector('.tabs-upi-link-panel-content picture');
    if (qrPicture && tabNames[tabIndex]) {
      const tabName = tabNames[tabIndex];

      // Create text element
      const qrText = document.createElement('p');
      qrText.className = 'tabs-upi-link-qr-text';
      qrText.textContent = `Scan the QR code to open ${tabName}`;

      // Wrap picture and text in a container
      const qrWrapper = document.createElement('div');
      qrWrapper.className = 'tabs-upi-link-qr-wrapper';
      qrPicture.parentNode.insertBefore(qrWrapper, qrPicture);
      qrWrapper.appendChild(qrPicture);
      qrWrapper.appendChild(qrText);
    }

    tabIndex += 1;
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

  // Replace "Scan" with "Tap" in H3 elements for mobile/tablet view (< 900px)
  function updateScanToTap() {
    const isMobile = window.matchMedia('(max-width: 899px)').matches;
    const h3Elements = block.querySelectorAll('.tabs-panel h3');

    h3Elements.forEach((h3) => {
      // Get the original text content (without any previous modifications)
      let text = h3.textContent;

      if (isMobile) {
        // Replace "Scan" with "Tap"
        text = text.replace(/Scan/g, 'Tap');
        h3.textContent = text;
      } else {
        // Replace "Tap" back to "Scan"
        text = text.replace(/Tap/g, 'Scan');
        h3.textContent = text;
      }
    });
  }

  // Run on load and resize with debouncing
  updateScanToTap();
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateScanToTap, 150);
  });

  // Initialize phone video for the first active tab (if it has a video)
  const videoContainer = block.querySelector('.phone-animation-video-container');
  const firstActiveButton = tablist.querySelector('button[aria-selected="true"]');
  if (videoContainer && firstActiveButton) {
    // Get tab ID from button ID (remove 'tab-' prefix)
    const tabId = firstActiveButton.id.replace('tab-', '');
    const videoPath = tabVideoMap.get(tabId);
    if (videoPath) {
      const video = createVideoElement(videoPath);
      videoContainer.appendChild(video);
    }
  }
}
