/**
 * Hotspot Block
 *
 * Creates an image with interactive hotspots. Clicking a hotspot displays
 * its tooltip content on the left side with a connecting line to the hotspot.
 * Link hotspots (#id) navigate to other hotspot blocks.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// Per-section tracking (keyed by section element)
// Stores: { firstBlockId, firstBlockElement, maxHeight, seenFirst, contentMap }
// contentMap stores original decorated content for each hotspot block by ID within that section
const sectionDataMap = new Map();

// Store animation frame IDs for cleanup
const animationFrameMap = new Map();

// Track containers that are currently transitioning (skip padding updates)
const transitioningContainers = new Set();

/**
 * Get or create section data for a given section element
 */
function getSectionData(section) {
  if (!sectionDataMap.has(section)) {
    sectionDataMap.set(section, {
      firstBlockId: null,
      firstBlockElement: null,
      maxHeight: 0,
      seenFirst: false,
      contentMap: new Map(), // Store block content by ID within this section
    });
  }
  return sectionDataMap.get(section);
}

/**
 * Parse hotspot item rows
 * Each row with 3 cells (text, x, y) becomes a hotspot
 * If the first cell contains an anchor starting with #, it's a link hotspot
 */
function parseHotspotGroups(rows) {
  const groups = [];

  rows.forEach((row) => {
    if (row.children.length < 3) {
      // Skip rows without 3 cells (text, x, y)
      return;
    }

    const cells = Array.from(row.children);
    const firstCell = cells[0];
    const xHotspot = parseFloat(cells[1]?.textContent?.trim()) || 0;
    const yHotspot = parseFloat(cells[2]?.textContent?.trim()) || 0;

    // Check for anchor tag with # href (link hotspot)
    const anchor = firstCell.querySelector('a[href^="#"]');
    const isLink = !!anchor;
    let targetId = '';

    if (isLink) {
      // Extract target ID from anchor href (remove the #)
      targetId = anchor.getAttribute('href').substring(1);
    } else {
      // Also check if the text content itself starts with # (plain text link)
      const textContent = firstCell.textContent?.trim() || '';
      if (textContent.startsWith('#')) {
        targetId = textContent.substring(1);
      }
    }

    const hasLink = isLink || !!targetId;

    if (hasLink && targetId) {
      // Link hotspot - navigates to another hotspot block
      groups.push({
        type: 'link',
        targetId,
        x: xHotspot,
        y: yHotspot,
        row,
      });
    } else {
      // Standard hotspot - shows block-level hotspot-text in left panel
      groups.push({
        type: 'standard',
        x: xHotspot,
        y: yHotspot,
        row,
      });
    }
  });

  return groups;
}

/**
 * Shows the initial panel content by getting panelHTML from the first hotspot
 * and making the panel visible. This is used both on initial load and after navigation.
 * @param {HTMLElement} container - The hotspot container element
 * @param {string} currentBlockId - The current block's ID being displayed
 * @param {boolean} skipPaddingCalculation - Skip padding calculation (transitions)
 */
function showInitialPanel(container, currentBlockId, skipPaddingCalculation = false) {
  const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
  const tooltipContent = container.querySelector('.hotspot-tooltip-content');
  const imageSection = container.querySelector('.hotspot-image-section');

  if (!tooltipPanel || !tooltipContent || !imageSection) {
    return;
  }

  // Get panel content from the first hotspot's data
  const firstHotspot = imageSection.querySelector('.hotspot-marker');
  if (!firstHotspot) {
    return;
  }

  const panelHTML = firstHotspot.dataset.panelContent || '';
  if (!panelHTML) {
    return;
  }

  // Show the panel with the content
  tooltipContent.innerHTML = panelHTML;
  tooltipPanel.classList.add('visible');

  // Only calculate padding if not skipped (during transitions, fadeTransition handles this)
  if (!skipPaddingCalculation) {
    // Function to calculate and set padding position
    const calculateInitialPadding = () => {
      const panelItem = tooltipContent.querySelector('.hotspot-panel-item');
      if (!panelItem || !firstHotspot) return;

      // Disable transition for instant positioning
      tooltipContent.style.transition = 'none';

      // Force layout to get accurate measurements
      tooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions

      const hotspotRect = firstHotspot.getBoundingClientRect();
      const panelItemRect = panelItem.getBoundingClientRect();
      const currentPadding = parseFloat(tooltipContent.style.paddingTop) || 0;

      // Calculate hotspot center Y
      const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);

      // Calculate panel item center Y at padding 0
      const panelItemCenterYAtZero = panelItemRect.top
        + (panelItemRect.height / 2) - currentPadding;

      // Calculate desired padding
      const desiredPadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
      tooltipContent.style.paddingTop = `${desiredPadding}px`;

      // Force reflow then re-enable transition
      tooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions
      tooltipContent.style.transition = '';
    };

    // Get the main image in the hotspot
    const mainImage = imageSection.querySelector('img');

    // Wait for image to be fully ready before calculating position
    const waitForImageAndCalculate = () => {
      if (mainImage && mainImage.naturalWidth === 0) {
        // Image not yet decoded, wait for load event
        mainImage.addEventListener('load', () => {
          // Use double RAF to ensure layout is stable after image load
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              calculateInitialPadding();
            });
          });
        }, { once: true });
      } else {
        // Image already loaded or no image, use double RAF for layout stability
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            calculateInitialPadding();
          });
        });
      }
    };

    waitForImageAndCalculate();
  }

  // Set up the go-back behavior:
  // The "Go back" link is authored in the content - find links with href starting with #
  // - If href is just "#", hide the entire section
  // - Otherwise, navigate to the block with the specified ID
  const goBackLinks = tooltipContent.querySelectorAll('a[href^="#"]');
  const sectionWrapper = container.closest('.section');
  const sectionData = getSectionData(sectionWrapper);

  goBackLinks.forEach((link) => {
    link.addEventListener('click', (evt) => {
      evt.preventDefault();

      const href = link.getAttribute('href') || '#';
      const targetId = href.substring(1); // Remove the # prefix

      if (!targetId) {
        // href is just "#" - expand the hero back to 100% (reverse of #the-concept-hotspot)
        const hero = document.querySelector('.hero-heritage-cc');
        if (hero) {
          hero.classList.remove('hero-heritage-cc-collapsed');
        }
      } else {
        // Navigate to the specified block (within this section)
        const targetContent = sectionData.contentMap.get(targetId);
        if (targetContent) {
          // Mark as transitioning to prevent RAF override
          transitioningContainers.add(container);

          // Start moving text towards where it will be
          const currentTooltipContent = container.querySelector('.hotspot-tooltip-content');
          const currentPanelItem = container.querySelector('.hotspot-panel-item');
          const targetHotspot = container.querySelector(`.hotspot-marker[data-target-hotspot="${targetId}"]`);

          if (currentTooltipContent && currentPanelItem && targetHotspot) {
            const hotspotRect = targetHotspot.getBoundingClientRect();
            const panelItemRect = currentPanelItem.getBoundingClientRect();
            const currentPadding = parseFloat(currentTooltipContent.style.paddingTop) || 0;
            const panelItemCenterYAtZero = panelItemRect.top
              + (panelItemRect.height / 2) - currentPadding;
            const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);
            const navPadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
            currentTooltipContent.style.paddingTop = `${navPadding}px`;
          }

          // eslint-disable-next-line no-use-before-define
          fadeTransition(container, () => {
            container.innerHTML = targetContent;
            // eslint-disable-next-line no-use-before-define
            reattachHotspotListeners(container, targetId);
            showInitialPanel(container, targetId, true);
          });
        }
      }
    });
  });
}

/**
 * Waits for all images in an element to finish loading.
 * @param {HTMLElement} element - The element containing images
 * @returns {Promise} Resolves when all images are loaded
 */
function waitForImages(element) {
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true }); // Don't block on errors
    });
  });
  return Promise.all(imagePromises);
}

/**
 * Performs a fade transition when switching block content.
 * Waits for fade-out to complete, swaps content, waits for images to load,
 * then fades back in. Also handles text position animation.
 * @param {HTMLElement} container - The container element
 * @param {Function} contentSwapCallback - Function to call during the fade (swaps content)
 * @returns {Promise} Resolves when the transition is complete
 */
function fadeTransition(container, contentSwapCallback) {
  return new Promise((resolve) => {
    // Mark container as transitioning - RAF will skip padding updates
    transitioningContainers.add(container);

    // Start fade out
    container.classList.add('fade-out');

    // Wait for fade-out transition to complete
    const onFadeOutEnd = () => {
      container.removeEventListener('transitionend', onFadeOutEnd);

      // Capture the ACTUAL computed position at the END of fade-out (mid-animation point)
      const tooltipContent = container.querySelector('.hotspot-tooltip-content');
      const positionAtFadeOut = tooltipContent
        ? window.getComputedStyle(tooltipContent).paddingTop
        : '0px';

      // Swap content while invisible
      contentSwapCallback();

      // Set new content's initial position to where the old content was
      const newTooltipContent = container.querySelector('.hotspot-tooltip-content');
      if (newTooltipContent && positionAtFadeOut) {
        // Temporarily disable transition to set initial position instantly
        newTooltipContent.style.transition = 'none';
        newTooltipContent.style.paddingTop = positionAtFadeOut;
        // Force reflow to apply the instant change
        newTooltipContent.offsetHeight; // eslint-disable-line no-unused-expressions
        // Re-enable transition for the animation
        newTooltipContent.style.transition = '';
      }

      // Allow RAF to calculate final position again
      transitioningContainers.delete(container);

      // Wait for images to load before fading in
      waitForImages(container).then(() => {
        // Use double RAF to ensure browser has painted the new content
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Add brightness flash before fade-in starts
            container.classList.add('brightness-flash');

            // Start fade in
            container.classList.remove('fade-out');

            // Wait for fade-in to complete
            const onFadeInEnd = () => {
              container.removeEventListener('transitionend', onFadeInEnd);
              // Remove brightness flash - triggers 0.2s transition back to normal brightness
              container.classList.remove('brightness-flash');
              resolve();
            };
            container.addEventListener('transitionend', onFadeInEnd, { once: true });
          });
        });
      });
    };

    container.addEventListener('transitionend', onFadeOutEnd, { once: true });
  });
}

/**
 * Sets up SVG connector line that draws from hotspot panel item to the hotspot marker.
 * Uses requestAnimationFrame for smooth updates on resize/scroll.
 * - Desktop mode: Line from right-center of .hotspot-panel-item to hotspot marker
 * - Mobile mode: Line from top-center of .hotspot-panel-item to hotspot marker
 * @param {HTMLElement} container - The hotspot container element
 * @param {string} currentBlockId - The ID of the block currently being displayed
 * @returns {Function} cleanup function to stop the animation loop
 */
function setupConnectorLine(container, currentBlockId = null) {
  // Use container element as cleanup key (unique per container, not per block ID)
  const cleanupKey = container;

  // Cancel any existing animation for this container
  const existingCleanup = animationFrameMap.get(cleanupKey);
  if (existingCleanup) existingCleanup();

  // Remove any existing SVG
  const existingSvg = container.querySelector('.hotspot-connector-svg');
  if (existingSvg) existingSvg.remove();

  // Create SVG container
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('hotspot-connector-svg');
  svg.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 1;
  `;
  container.style.position = 'relative';
  container.appendChild(svg);

  let animationFrameId = null;

  function drawLine() {
    // Clear existing lines
    svg.innerHTML = '';

    const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
    const panelItem = container.querySelector('.hotspot-panel-item');
    const imageSection = container.querySelector('.hotspot-image-section');

    // Only draw if tooltip is visible and panel item exists
    if (!tooltipPanel?.classList.contains('visible') || !panelItem || !imageSection) {
      animationFrameId = requestAnimationFrame(drawLine);
      return;
    }

    // Get target hotspot:
    // 1. Prefer active hotspot
    // 2. Then hotspot that links to the current block being displayed
    // 3. Fallback to first hotspot
    const activeHotspot = container.querySelector('.hotspot-marker.active');
    const matchingHotspot = currentBlockId
      ? imageSection.querySelector(`.hotspot-marker[data-target-hotspot="${currentBlockId}"]`)
      : null;
    const firstHotspot = imageSection.querySelector('.hotspot-marker');
    const targetHotspot = activeHotspot || matchingHotspot || firstHotspot;

    if (!targetHotspot) {
      animationFrameId = requestAnimationFrame(drawLine);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const hotspotRect = targetHotspot.getBoundingClientRect();
    const tooltipPanelRect = tooltipPanel.getBoundingClientRect();
    const imageSectionRect = imageSection.getBoundingClientRect();
    const tooltipContent = container.querySelector('.hotspot-tooltip-content');
    let panelItemRect = panelItem.getBoundingClientRect();

    // Detect mobile mode: panel is below image when panel's top is >= image's bottom
    // or when container has flex-direction: column (stacked layout)
    const containerStyles = window.getComputedStyle(container);
    const isMobileLayout = containerStyles.flexDirection === 'column'
      || tooltipPanelRect.top >= imageSectionRect.bottom - 20;

    // Align panel item center with hotspot center (desktop only)
    // Skip during transitions to allow CSS animation to complete
    if (!isMobileLayout && tooltipContent && !transitioningContainers.has(container)) {
      // Get the TARGET padding value (what we're animating towards)
      const targetPadding = parseFloat(tooltipContent.style.paddingTop) || 0;

      // Use tooltip panel's top as stable reference (doesn't change during animation)
      // Panel item's position at padding=0 would be near the top of the panel
      const panelItemHeight = panelItem.offsetHeight;
      const panelTopPadding = parseFloat(window.getComputedStyle(tooltipPanel).paddingTop) || 40;

      // Calculate where panel item center would be at padding 0
      // (tooltip panel top + panel's padding + half of panel item height)
      const panelItemCenterYAtZero = tooltipPanelRect.top + panelTopPadding + (panelItemHeight / 2);

      // Calculate hotspot center Y (absolute position)
      const hotspotCenterYAbs = hotspotRect.top + (hotspotRect.height / 2);

      // Calculate desired padding to align centers
      const desiredPaddingTop = Math.max(0, hotspotCenterYAbs - panelItemCenterYAtZero);

      // Only update if significantly different from TARGET (avoids fighting with CSS transition)
      const paddingDiff = Math.abs(desiredPaddingTop - targetPadding);
      if (paddingDiff > 2) {
        tooltipContent.style.paddingTop = `${desiredPaddingTop}px`;
      }

      // Re-get panelItem rect after potential padding change
      panelItemRect = panelItem.getBoundingClientRect();
    } else if (tooltipContent && !transitioningContainers.has(container)) {
      // Reset padding in mobile mode (but not during transitions)
      tooltipContent.style.paddingTop = '';
    }

    let x1; let y1; let x2; let y2;

    // Offset to add spacing between text and line start
    const lineOffset = 10;

    // Line color - dark gray
    const lineColor = '#555';

    // Hotspot center coordinates
    const hotspotCenterX = hotspotRect.left + (hotspotRect.width / 2) - containerRect.left;
    const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2) - containerRect.top;

    // Use all <p> elements except the last one for line attachment
    // (last one is typically "Go back")
    // Calculate combined bounding box of these paragraphs
    const allParagraphs = panelItem.querySelectorAll('p');
    let lineTargetRect = panelItemRect; // fallback

    if (allParagraphs.length > 1) {
      // Get all paragraphs except the last one
      const contentParagraphs = Array.from(allParagraphs).slice(0, -1);

      // Calculate combined bounding box
      const firstRect = contentParagraphs[0].getBoundingClientRect();
      const lastRect = contentParagraphs[contentParagraphs.length - 1].getBoundingClientRect();

      // Combined rect: from first paragraph's top/left to last paragraph's bottom, widest right
      let maxRight = firstRect.right;
      contentParagraphs.forEach((p) => {
        const rect = p.getBoundingClientRect();
        if (rect.right > maxRight) maxRight = rect.right;
      });

      lineTargetRect = {
        top: firstRect.top,
        bottom: lastRect.bottom,
        left: firstRect.left,
        right: maxRight,
        width: maxRight - firstRect.left,
        height: lastRect.bottom - firstRect.top,
      };
    } else if (allParagraphs.length === 1) {
      // Only one paragraph, use it directly
      lineTargetRect = allParagraphs[0].getBoundingClientRect();
    }

    if (isMobileLayout) {
      // Mobile mode: Line from top-center of first paragraph to hotspot center (with offset above)
      x1 = lineTargetRect.left + (lineTargetRect.width / 2) - containerRect.left;
      y1 = lineTargetRect.top - containerRect.top - lineOffset;

      // Line ends at center of hotspot marker
      x2 = hotspotCenterX;
      y2 = hotspotCenterY;
    } else {
      // Desktop: Line from right-center of first paragraph to hotspot center
      x1 = lineTargetRect.right - containerRect.left + lineOffset;
      y1 = lineTargetRect.top + (lineTargetRect.height / 2) - containerRect.top;

      // Line ends at center of hotspot marker
      x2 = hotspotCenterX;
      y2 = hotspotCenterY;
    }

    // Create line element
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', lineColor);
    line.setAttribute('stroke-width', '1');

    // Create small circle at the panel item end (text side)
    const circleStart = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleStart.setAttribute('cx', x1);
    circleStart.setAttribute('cy', y1);
    circleStart.setAttribute('r', '3');
    circleStart.setAttribute('fill', lineColor);

    // Create small circle at the hotspot end
    const circleEnd = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleEnd.setAttribute('cx', x2);
    circleEnd.setAttribute('cy', y2);
    circleEnd.setAttribute('r', '3');
    circleEnd.setAttribute('fill', lineColor);

    svg.appendChild(line);
    svg.appendChild(circleStart);
    svg.appendChild(circleEnd);

    // Continue the animation loop
    animationFrameId = requestAnimationFrame(drawLine);
  }

  // Start the continuous drawing loop
  animationFrameId = requestAnimationFrame(drawLine);

  // Return cleanup function
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (svg.parentNode) {
      svg.remove();
    }
  };

  // Store cleanup function for later
  animationFrameMap.set(cleanupKey, cleanup);

  return cleanup;
}

export default function decorate(block) {
  const rows = Array.from(block.children);

  // Block-level fields have fixed positions (per _hotspot.json):
  // Row 0: Image
  // Row 1: ID
  // Row 2: Hotspot Text (richtext - can contain text, images, etc.)
  // Row 3+: Hotspot Items

  let imageElement = null;
  let blockId = '';
  let hotspotText = '';
  const metadataRowCount = 3; // First 3 rows are always block-level fields

  // Row 0: Image
  if (rows.length > 0) {
    const imageRow = rows[0];
    const picture = imageRow.querySelector('picture');
    if (picture) {
      imageElement = picture;
    }
  }

  // Row 1: Block ID
  if (rows.length > 1) {
    const idRow = rows[1];
    const idCell = idRow.children[0];
    blockId = idCell ? idCell.textContent?.trim() || '' : '';
  }

  // Row 2: Hotspot Text (richtext - take full innerHTML to support images, formatting, etc.)
  if (rows.length > 2) {
    const textRow = rows[2];
    // Get innerHTML from the first cell if it exists, otherwise from the row itself
    const firstCell = textRow.children[0];
    const rawHTML = firstCell ? firstCell.innerHTML?.trim() : textRow.innerHTML?.trim();
    // Only set if there's actual content (not just empty string)
    if (rawHTML) {
      hotspotText = rawHTML;
    }
  }

  if (blockId) {
    block.id = blockId;
  }

  // Create the main container
  const container = document.createElement('div');
  container.className = 'hotspot-container';
  // Store original block ID for animation cleanup (stays constant across navigations)
  container.dataset.originalBlockId = blockId;

  // Create left panel for tooltip content
  const tooltipPanel = document.createElement('div');
  tooltipPanel.className = 'hotspot-tooltip-panel';

  const tooltipContent = document.createElement('div');
  tooltipContent.className = 'hotspot-tooltip-content';
  tooltipPanel.appendChild(tooltipContent);

  container.appendChild(tooltipPanel);

  // Create right section for image with hotspots
  const imageSection = document.createElement('div');
  imageSection.className = 'hotspot-image-section';

  // Create image wrapper (hotspots will be positioned relative to this)
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'hotspot-image-wrapper';

  // Add the image
  if (imageElement) {
    imageWrapper.appendChild(imageElement.cloneNode(true));
  }

  imageSection.appendChild(imageWrapper);
  container.appendChild(imageSection);

  // Parse and process hotspot items
  const hotspotItems = rows.slice(metadataRowCount);
  const hotspotGroups = parseHotspotGroups(hotspotItems);

  hotspotGroups.forEach((group, groupIndex) => {
    // Create hotspot marker
    const hotspot = document.createElement('button');
    hotspot.type = 'button'; // Prevent form submission behavior
    hotspot.className = 'hotspot-marker';
    hotspot.setAttribute('aria-label', `Hotspot ${groupIndex + 1}`);
    hotspot.style.left = `${group.x}%`;
    hotspot.style.top = `${group.y}%`;

    // Store position for connecting line
    hotspot.dataset.x = group.x;
    hotspot.dataset.y = group.y;

    moveInstrumentation(group.row, hotspot);

    // Build panel content from block-level hotspot-text
    // The "Go back" link is authored in the content itself, not added here
    const panelHTML = hotspotText
      ? `<div class="hotspot-panel-item">${hotspotText}</div>`
      : '';

    hotspot.dataset.panelContent = panelHTML;

    if (group.type === 'link') {
      hotspot.classList.add('hotspot-link-marker');
      hotspot.dataset.targetHotspot = group.targetId;

      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate to target hotspot block (within this section)
        const clickSectionWrapper = container.closest('.section');
        const clickSectionData = getSectionData(clickSectionWrapper);
        const storedContent = clickSectionData.contentMap.get(group.targetId);
        let newContent = null;
        if (storedContent) {
          newContent = storedContent;
        } else {
          const targetBlock = document.getElementById(group.targetId);
          if (targetBlock && targetBlock.classList.contains('hotspot')) {
            const targetContainer = targetBlock.querySelector('.hotspot-container');
            if (targetContainer) {
              newContent = targetContainer.innerHTML;
            }
          }
        }

        if (newContent) {
          // Mark as transitioning FIRST to prevent RAF from overwriting padding
          transitioningContainers.add(container);

          // Start moving text towards the clicked hotspot during fade-out
          const currentTooltipContent = container.querySelector('.hotspot-tooltip-content');
          const currentPanelItem = container.querySelector('.hotspot-panel-item');
          if (currentTooltipContent && currentPanelItem) {
            const hotspotRect = hotspot.getBoundingClientRect();
            const panelItemRect = currentPanelItem.getBoundingClientRect();
            const currentPadding = parseFloat(currentTooltipContent.style.paddingTop) || 0;

            // Calculate where panel item center would be at padding 0
            const panelItemCenterYAtZero = panelItemRect.top
              + (panelItemRect.height / 2) - currentPadding;

            // Calculate hotspot center Y
            const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);

            // Calculate target padding to move towards clicked hotspot
            const clickPadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
            currentTooltipContent.style.paddingTop = `${clickPadding}px`;
          }

          // Use fade transition when switching blocks
          // eslint-disable-next-line no-use-before-define
          fadeTransition(container, () => {
            container.innerHTML = newContent;
            // eslint-disable-next-line no-use-before-define
            reattachHotspotListeners(container, group.targetId);
            // Skip padding calc, fadeTransition handles it
            showInitialPanel(container, group.targetId, true);
          });
        }
      });
    } else {
      // Standard hotspot - show block-level hotspot-text in left panel on click
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isActive = hotspot.classList.contains('active');

        // Deactivate all hotspots
        imageWrapper.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));

        if (!isActive) {
          // Show block-level hotspot-text content
          hotspot.classList.add('active');
          tooltipContent.innerHTML = hotspotText
            ? `<div class="hotspot-panel-item">${hotspotText}</div>`
            : '';
          tooltipPanel.classList.add('visible');

          // Attach go-back handlers to any links with href starting with #
          const sectionWrapper = container.closest('.section');
          const sectionData = getSectionData(sectionWrapper);
          const goBackLinks = tooltipContent.querySelectorAll('a[href^="#"]');

          goBackLinks.forEach((link) => {
            link.addEventListener('click', (evt) => {
              evt.preventDefault();
              const href = link.getAttribute('href') || '#';
              const targetId = href.substring(1);

              if (!targetId) {
                // href is just "#" - expand the hero back to 100% (reverse of #the-concept-hotspot)
                const hero = document.querySelector('.hero-heritage-cc');
                if (hero) {
                  hero.classList.remove('hero-heritage-cc-collapsed');
                }
              } else {
                // Navigate to the specified block (within this section)
                const targetContent = sectionData.contentMap.get(targetId);
                if (targetContent) {
                  transitioningContainers.add(container);
                  // eslint-disable-next-line no-use-before-define
                  fadeTransition(container, () => {
                    container.innerHTML = targetContent;
                    // eslint-disable-next-line no-use-before-define
                    reattachHotspotListeners(container, targetId);
                    showInitialPanel(container, targetId, true);
                  });
                }
              }
            });
          });
          // SVG connector line will automatically update via requestAnimationFrame
        } else {
          // Hide panel
          tooltipPanel.classList.remove('visible');
        }
      });
    }

    imageWrapper.appendChild(hotspot);
  });

  // Close panel when clicking outside - only if a hotspot is actively selected
  // This prevents the initial panel from being hidden by unrelated clicks (e.g., closing a modal)
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      const hasActiveHotspot = imageWrapper.querySelector('.hotspot-marker.active');
      if (hasActiveHotspot) {
        tooltipPanel.classList.remove('visible');
        imageWrapper.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));
      }
    }
  });

  // Replace block content
  block.replaceChildren(container);

  // Get section-specific data (scoped to this section only)
  const sectionWrapper = block.closest('.section');
  const sectionData = getSectionData(sectionWrapper);

  // Track the first block's info for "Go back" functionality (per section)
  // Must be done BEFORE showInitialPanel so it knows if this is the first block
  if (!sectionData.seenFirst) {
    sectionData.firstBlockId = blockId;
    sectionData.firstBlockElement = block;
    sectionData.seenFirst = true;
  }

  // Setup SVG connector line
  setupConnectorLine(container, blockId);

  // Show initial panel with hotspot-text (so it's visible by default)
  showInitialPanel(container, blockId);

  // Measure block height BEFORE hiding (for consistent section height)
  const blockHeight = block.offsetHeight;
  if (blockHeight > sectionData.maxHeight) {
    sectionData.maxHeight = blockHeight;
    // Update section min-height to accommodate the tallest block
    if (sectionWrapper) {
      sectionWrapper.style.minHeight = `${sectionData.maxHeight}px`;
    }
  }

  // Hide non-first blocks in this section (only show the first hotspot block initially)
  if (blockId !== sectionData.firstBlockId) {
    block.style.display = 'none';
    block.setAttribute('aria-hidden', 'true');
  }

  // Store original content AFTER showing initial panel (so stored state includes visible panel)
  // Content is stored per-section to avoid conflicts between sections with same block IDs
  if (blockId) {
    sectionData.contentMap.set(blockId, container.innerHTML);
  }
}

/**
 * Re-attach event listeners after replacing hotspot content
 * @param {HTMLElement} container - The hotspot container
 * @param {string} blockId - The ID of the block currently being displayed
 */
function reattachHotspotListeners(container, blockId) {
  const tooltipPanel = container.querySelector('.hotspot-tooltip-panel');
  const tooltipContent = container.querySelector('.hotspot-tooltip-content');
  const imageSection = container.querySelector('.hotspot-image-section');

  // Re-setup SVG connector line with current block ID
  setupConnectorLine(container, blockId);

  if (!imageSection) {
    return;
  }

  const hotspots = imageSection.querySelectorAll('.hotspot-marker');

  hotspots.forEach((hotspot) => {
    const isLink = hotspot.classList.contains('hotspot-link-marker');
    const panelHTML = hotspot.dataset.panelContent || '';
    const targetId = hotspot.dataset.targetHotspot;

    if (isLink && targetId) {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate first (within this section)
        const clickSectionWrapper = container.closest('.section');
        const clickSectionData = getSectionData(clickSectionWrapper);
        let newContent = null;
        const storedContent = clickSectionData.contentMap.get(targetId);
        if (storedContent) {
          newContent = storedContent;
        } else {
          const targetBlock = document.getElementById(targetId);
          if (targetBlock && targetBlock.classList.contains('hotspot')) {
            const targetContainer = targetBlock.querySelector('.hotspot-container');
            if (targetContainer) {
              newContent = targetContainer.innerHTML;
            }
          }
        }

        if (newContent) {
          // Mark as transitioning FIRST to prevent RAF from overwriting padding
          transitioningContainers.add(container);

          // Start moving text towards the clicked hotspot during fade-out
          const currentTooltipContent = container.querySelector('.hotspot-tooltip-content');
          const currentPanelItem = container.querySelector('.hotspot-panel-item');
          if (currentTooltipContent && currentPanelItem) {
            const hotspotRect = hotspot.getBoundingClientRect();
            const panelItemRect = currentPanelItem.getBoundingClientRect();
            const currentPadding = parseFloat(currentTooltipContent.style.paddingTop) || 0;

            // Calculate where panel item center would be at padding 0
            const panelItemCenterYAtZero = panelItemRect.top
              + (panelItemRect.height / 2) - currentPadding;

            // Calculate hotspot center Y
            const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);

            // Calculate target padding to move towards clicked hotspot
            const movePadding = Math.max(0, hotspotCenterY - panelItemCenterYAtZero);
            currentTooltipContent.style.paddingTop = `${movePadding}px`;
          }

          // Use fade transition when switching blocks
          fadeTransition(container, () => {
            container.innerHTML = newContent;
            reattachHotspotListeners(container, targetId);
            // Skip padding calc, fadeTransition handles it
            showInitialPanel(container, targetId, true);
          });
        }
      });
    } else {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isActive = hotspot.classList.contains('active');

        imageSection.querySelectorAll('.hotspot-marker').forEach((m) => m.classList.remove('active'));

        if (!isActive && tooltipPanel && tooltipContent) {
          hotspot.classList.add('active');
          tooltipContent.innerHTML = panelHTML;
          tooltipPanel.classList.add('visible');

          // Attach go-back handlers to any links with href starting with #
          const sectionWrapper = container.closest('.section');
          const sectionData = getSectionData(sectionWrapper);
          const goBackLinks = tooltipContent.querySelectorAll('a[href^="#"]');

          goBackLinks.forEach((link) => {
            link.addEventListener('click', (evt) => {
              evt.preventDefault();
              const href = link.getAttribute('href') || '#';
              const goBackId = href.substring(1);

              if (!goBackId) {
                // href is just "#" - expand the hero back to 100% (reverse of #the-concept-hotspot)
                const hero = document.querySelector('.hero-heritage-cc');
                if (hero) {
                  hero.classList.remove('hero-heritage-cc-collapsed');
                }
              } else {
                // Navigate to the specified block (within this section)
                const goBackContent = sectionData.contentMap.get(goBackId);
                if (goBackContent) {
                  transitioningContainers.add(container);
                  fadeTransition(container, () => {
                    container.innerHTML = goBackContent;
                    reattachHotspotListeners(container, goBackId);
                    showInitialPanel(container, goBackId, true);
                  });
                }
              }
            });
          });
          // SVG connector line updates automatically via requestAnimationFrame
        } else if (tooltipPanel) {
          tooltipPanel.classList.remove('visible');
        }
      });
    }
  });
}
