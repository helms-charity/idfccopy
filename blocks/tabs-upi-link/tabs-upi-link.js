// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Creates a video element for the phone animation (loop, muted, autoplay).
 * Uses <source> + setAttribute for reliable playback across browsers.
 * @param {string} videoSrc - The video source URL
 * @returns {HTMLVideoElement} The video element
 */
function createVideoElement(videoSrc) {
  const video = document.createElement('video');
  video.className = 'phone-animation-video';
  video.setAttribute('loop', '');
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', ''); // Older iOS
  video.setAttribute('preload', 'auto');
  video.muted = true; // Required for autoplay policy
  const source = document.createElement('source');
  source.src = videoSrc;
  source.type = 'video/mp4';
  video.appendChild(source);
  return video;
}

/** Debug: set ?tabs-upi-video-debug=1 in URL to log video events to console */
const VIDEO_DEBUG = typeof window !== 'undefined' && window.location?.search?.includes('tabs-upi-video-debug=1');

function tryPlayVideo(video) {
  video.play().catch((err) => {
    if (VIDEO_DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[tabs-upi-link] video.play() failed:', err?.message || err);
    }
  });
}

/**
 * Extracts phone video URL from a block-level div (phone group: picture + video reference).
 * Removes the video link from DOM. Supports AEM picker (a[href]) and legacy HTTP URL in p.
 * Resolves relative paths (e.g. /content/dam/.../file.mp4) to a playable absolute URL.
 * @param {HTMLElement} phoneGroupDiv - Block child with picture and video link
 * @returns {string|null} Absolute video URL or null
 */
function getPhoneVideoUrlFromPhoneGroup(phoneGroupDiv) {
  const link = phoneGroupDiv.querySelector('a[href*=".mp4"]');
  if (link) {
    const raw = link.getAttribute('href');
    if (raw) {
      try {
        const url = new URL(raw, window.location.href).href;
        const p = link.closest('p');
        if (p) p.remove();
        else link.remove();
        return url;
      } catch {
        if (link.href) {
          const p = link.closest('p');
          if (p) p.remove();
          else link.remove();
          return link.href;
        }
      }
    }
  }
  const p = phoneGroupDiv.querySelector('p');
  if (p) {
    const text = p.textContent.trim();
    if (text.endsWith('.mp4') && (text.startsWith('http://') || text.startsWith('https://'))) {
      p.remove();
      return text;
    }
  }
  return null;
}

export default async function decorate(block) {
  // Check if tabs-list already exists - if so, script has already run successfully
  if (block.querySelector('.tabs-list')) {
    return; // Already processed, skip
  }

  // Get all children
  const children = [...block.children];

  // Title: child with h2
  const titleDiv = children.find((child) => child.querySelector('h2'));

  // Image: old model = child with only picture; new model = phone group (picture + video link)
  const imageDiv = children.find((child) => {
    const hasPicture = child.querySelector('picture');
    const hasOtherContent = child.querySelector('h2, h3, p');
    return hasPicture && !hasOtherContent;
  });
  const phoneGroupDiv = !imageDiv && titleDiv
    ? children.find((child) => child !== titleDiv && child.querySelector('picture') && child.querySelector('a[href*=".mp4"]'))
    : null;

  // Single source for picture: prefer image-only cell (old), else phone group (new)
  const pictureSourceDiv = imageDiv || phoneGroupDiv;

  // Extract video URL from phone group (new model) and remove the link from DOM
  if (phoneGroupDiv) {
    const videoUrl = getPhoneVideoUrlFromPhoneGroup(phoneGroupDiv);
    if (videoUrl) block.dataset.phoneVideoUrl = videoUrl;
  }

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

  // Tab panels: exclude title and picture source (image-only cell or phone group)
  const tabPanels = children.filter((child) => child !== titleDiv && child !== pictureSourceDiv);

  // Build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Store tab names for later use
  const tabNames = [];

  // Process each tab panel
  const processableTabs = tabPanels.map((tabpanel) => ({ tabpanel }));
  processableTabs.forEach(({ tabpanel }, i) => {
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

      // Note: Video in phone frame stays visible for all tabs
      // The phone animation is shared across all UPI app tabs
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
  if (pictureSourceDiv) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'tabs-upi-link-image';
    // Clone the picture element (we'll use original for desktop, clones for mobile)
    const picture = pictureSourceDiv.querySelector('picture');
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

        // Add video container for mobile phone animation
        const mobileVideoContainer = document.createElement('div');
        mobileVideoContainer.className = 'phone-animation-video-container mobile';
        mobileImageWrapper.appendChild(mobileVideoContainer);

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

  // Move all tab panels to tabs container and add QR code text
  let tabIndex = 0;
  tabPanels.forEach((tabpanel) => {
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

  // Initialize phone video in all containers (desktop and mobile)
  const videoPath = block.dataset.phoneVideoUrl;
  if (videoPath) {
    if (VIDEO_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[tabs-upi-link] video URL:', videoPath);
    }
    const allVideoContainers = block.querySelectorAll('.phone-animation-video-container');
    allVideoContainers.forEach((container) => {
      const video = createVideoElement(videoPath);
      container.appendChild(video);
      tryPlayVideo(video);
      // Retry play when enough data has loaded (autoplay can fail if called too early)
      video.addEventListener('loadeddata', () => tryPlayVideo(video), { once: true });
      video.addEventListener('canplay', () => tryPlayVideo(video), { once: true });
      if (VIDEO_DEBUG) {
        video.addEventListener('playing', () => {
          // eslint-disable-next-line no-console
          console.log('[tabs-upi-link] video playing');
        });
        video.addEventListener('error', () => {
          const e = video.error;
          const src = video.querySelector('source')?.src || video.src;
          // eslint-disable-next-line no-console
          console.warn('[tabs-upi-link] video error:', e?.message || e?.code, src);
        });
      }
    });
  }
}
