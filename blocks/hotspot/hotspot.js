/**
 * Hotspot Block
 *
 * Creates an image with interactive hotspots. Clicking a hotspot displays
 * its tooltip content on the left side with a connecting line to the hotspot.
 * Link hotspots (#id) navigate to other hotspot blocks.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// Store original decorated content for each hotspot block by ID
const originalContentMap = new Map();

// Track if we've seen the first hotspot block (only show the first one)
let isFirstHotspotBlock = true;

// Store the first block's ID and element for "Go back" functionality
let firstBlockId = null;
let firstBlockElement = null;

// Store animation frame IDs for cleanup
const animationFrameMap = new Map();

/**
 * Parse hotspot item rows
 * Each row with 3 cells (text, x, y) becomes a hotspot
 * If the first cell contains an anchor starting with #, it's a link hotspot
 */
function parseHotspotGroups(rows) {
  const groups = [];

  rows.forEach((row, index) => {
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
 */
function showInitialPanel(container, currentBlockId) {
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

  // Set up the go-back behavior:
  // - If on first block: hide the entire hotspot block
  // - If on any other block: return to the first block
  const goBackLink = tooltipContent.querySelector('[data-go-back]');
  if (goBackLink) {
    const isOnFirstBlock = currentBlockId === firstBlockId;

    goBackLink.addEventListener('click', (evt) => {
      evt.preventDefault();

      if (isOnFirstBlock) {
        // Hide the entire hotspot section, revealing content underneath
        // Fade out first, then hide completely
        container.classList.add('fade-out');
        container.addEventListener('transitionend', () => {
          // Find the parent .section wrapper and hide it
          const sectionWrapper = firstBlockElement?.closest('.section');
          if (sectionWrapper) {
            sectionWrapper.style.display = 'none';
            sectionWrapper.setAttribute('aria-hidden', 'true');
          } else if (firstBlockElement) {
            // Fallback to hiding the block itself
            firstBlockElement.style.display = 'none';
            firstBlockElement.setAttribute('aria-hidden', 'true');
          }
        }, { once: true });
      } else {
        // Return to the first block with fade transition
        const firstBlockContent = originalContentMap.get(firstBlockId);
        if (firstBlockContent) {
          fadeTransition(container, () => {
            container.innerHTML = firstBlockContent;
            reattachHotspotListeners(container, firstBlockId);
            showInitialPanel(container, firstBlockId);
          });
        }
      }
    });
  }
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
 * then fades back in.
 * @param {HTMLElement} container - The container element
 * @param {Function} contentSwapCallback - Function to call during the fade (swaps content)
 * @returns {Promise} Resolves when the transition is complete
 */
function fadeTransition(container, contentSwapCallback) {
  return new Promise((resolve) => {
    // Start fade out
    container.classList.add('fade-out');

    // Wait for fade-out transition to complete
    const onFadeOutEnd = () => {
      container.removeEventListener('transitionend', onFadeOutEnd);

      // Swap content while invisible
      contentSwapCallback();

      // Wait for images to load before fading in
      waitForImages(container).then(() => {
        // Use double RAF to ensure browser has painted the new content
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Start fade in
            container.classList.remove('fade-out');

            // Wait for fade-in to complete
            const onFadeInEnd = () => {
              container.removeEventListener('transitionend', onFadeInEnd);
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
  // Use original block ID for animation cleanup (stored on container)
  const cleanupKey = container.dataset.originalBlockId || currentBlockId || 'default';

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
    z-index: 5;
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

    // Detect mobile mode: panel is below image when panel's top is >= image's bottom
    // or when container has flex-direction: column (stacked layout)
    const containerStyles = window.getComputedStyle(container);
    const isMobileLayout = containerStyles.flexDirection === 'column'
      || tooltipPanelRect.top >= imageSectionRect.bottom - 20;

    // Align panel item center with hotspot center (desktop only)
    if (!isMobileLayout && tooltipContent) {
      // Reset padding first to get accurate measurements
      tooltipContent.style.paddingTop = '0px';
      
      // Get fresh measurements after reset
      const panelItemRectFresh = panelItem.getBoundingClientRect();
      const tooltipPanelRectFresh = tooltipPanel.getBoundingClientRect();
      
      // Calculate hotspot center Y relative to the panel
      const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2);
      
      // Calculate current panel item center Y
      const panelItemCenterY = panelItemRectFresh.top + (panelItemRectFresh.height / 2);
      
      // Calculate offset needed to align centers
      const offsetNeeded = hotspotCenterY - panelItemCenterY;
      
      // Apply as padding-top (only if positive, can't have negative padding)
      const desiredPaddingTop = Math.max(0, offsetNeeded);
      tooltipContent.style.paddingTop = `${desiredPaddingTop}px`;
    } else if (tooltipContent) {
      // Reset padding in mobile mode
      tooltipContent.style.paddingTop = '';
    }

    // Re-get panelItem rect after potential padding change
    const panelItemRect = panelItem.getBoundingClientRect();

    let x1; let y1; let x2; let y2;

    // Offset to add spacing between text and line start
    const lineOffset = 10;

    // Line color - dark gray
    const lineColor = '#555';

    // Hotspot center coordinates
    const hotspotCenterX = hotspotRect.left + (hotspotRect.width / 2) - containerRect.left;
    const hotspotCenterY = hotspotRect.top + (hotspotRect.height / 2) - containerRect.top;

    if (isMobileLayout) {
      // Mobile mode: Line from top-center of panel item to hotspot center (with offset above)
      x1 = panelItemRect.left + (panelItemRect.width / 2) - containerRect.left;
      y1 = panelItemRect.top - containerRect.top - lineOffset;

      // Line ends at center of hotspot marker
      x2 = hotspotCenterX;
      y2 = hotspotCenterY;
    } else {
      // Desktop mode: Line from right-center of panel item to hotspot center (with offset to the right)
      x1 = panelItemRect.right - containerRect.left + lineOffset;
      y1 = panelItemRect.top + (panelItemRect.height / 2) - containerRect.top;

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

  // Extract block-level fields
  let metadataRowCount = 0;
  let imageElement = null;
  let blockId = '';
  let hotspotText = '';

  // Row 0: Image
  if (rows.length > 0) {
    const firstRow = rows[0];
    const picture = firstRow.querySelector('picture');
    if (picture) {
      imageElement = picture;
      metadataRowCount = 1;
    }
  }

  // Row 1: Block ID (optional)
  if (rows.length > 1 && rows[1].children.length === 1) {
    const idCell = rows[1].children[0];
    if (!idCell.querySelector('picture')) {
      blockId = idCell.textContent?.trim() || '';
      if (blockId) {
        metadataRowCount = 2;
      }
    }
  }

  // Row 2: Hotspot Text (block-level text for left panel)
  // Check if this row is hotspot-text (1 cell) or a hotspot item (3 cells with coordinates)
  if (rows.length > metadataRowCount) {
    const potentialTextRow = rows[metadataRowCount];
    const cells = Array.from(potentialTextRow.children);
    
    // If row has 1 cell with content (not an image, not starting with #), it's hotspot-text
    if (cells.length === 1) {
      const textCell = cells[0];
      if (!textCell.querySelector('picture')) {
        const cellText = textCell.textContent?.trim() || '';
        if (cellText && !cellText.startsWith('#')) {
          hotspotText = textCell.innerHTML;
          metadataRowCount += 1;
        }
      }
    }
    // If row has 2 cells (first is text, second could be interpreted as a single coordinate row)
    // This handles cases where the CMS might structure it differently
    else if (cells.length === 2) {
      const firstCell = cells[0];
      const secondCell = cells[1];
      // If second cell is empty or not a number, first cell might be hotspot-text
      const secondText = secondCell?.textContent?.trim() || '';
      if (!firstCell.querySelector('picture') && (secondText === '' || Number.isNaN(parseFloat(secondText)))) {
        hotspotText = firstCell.innerHTML;
        metadataRowCount += 1;
      }
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

  // Track the current block ID for "Go back" functionality
  let currentBlockId = blockId;

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
    const panelHTML = hotspotText
      ? `<div class="hotspot-panel-item">${hotspotText}</div><div class="hotspot-go-back"><a href="#" data-go-back="${currentBlockId}">Go back</a></div>`
      : '';

    hotspot.dataset.panelContent = panelHTML;

    if (group.type === 'link') {
      hotspot.classList.add('hotspot-link-marker');
      hotspot.dataset.targetHotspot = group.targetId;

      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate to target hotspot block
        const storedContent = originalContentMap.get(group.targetId);
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
          // Use fade transition when switching blocks
          // Don't mark hotspot as active until after fade-out to avoid line jumping
          fadeTransition(container, () => {
            container.innerHTML = newContent;
            reattachHotspotListeners(container, group.targetId);
            showInitialPanel(container, group.targetId);
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
            ? `<div class="hotspot-panel-item">${hotspotText}</div><div class="hotspot-go-back"><a href="#" data-go-back="${currentBlockId}">Go back</a></div>`
            : '';
          tooltipPanel.classList.add('visible');

          // Attach go-back handler
          const goBackLink = tooltipContent.querySelector('[data-go-back]');
          if (goBackLink) {
            goBackLink.addEventListener('click', (evt) => {
              evt.preventDefault();
              const backToId = goBackLink.dataset.goBack;
              const backContent = originalContentMap.get(backToId);
              if (backContent) {
                // Use fade transition when going back
                fadeTransition(container, () => {
                  container.innerHTML = backContent;
                  reattachHotspotListeners(container, blockId);
                });
              }
            });
          }
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

  // Track the first block's info for "Go back" functionality
  // Must be done BEFORE showInitialPanel so it knows if this is the first block
  if (isFirstHotspotBlock) {
    firstBlockId = blockId;
    firstBlockElement = block;
    isFirstHotspotBlock = false;
  } else {
    // Hide non-first blocks (only show the first hotspot block initially)
    block.style.display = 'none';
    block.setAttribute('aria-hidden', 'true');
  }

  // Setup SVG connector line
  setupConnectorLine(container, blockId);

  // Show initial panel with hotspot-text (so it's visible by default)
  showInitialPanel(container, blockId);

  // Store original content AFTER showing initial panel (so stored state includes visible panel)
  if (blockId) {
    originalContentMap.set(blockId, container.innerHTML);
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

  hotspots.forEach((hotspot, idx) => {
    const isLink = hotspot.classList.contains('hotspot-link-marker');
    const panelHTML = hotspot.dataset.panelContent || '';
    const targetId = hotspot.dataset.targetHotspot;

    if (isLink && targetId) {
      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate first
        let newContent = null;
        const storedContent = originalContentMap.get(targetId);
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
          // Use fade transition when switching blocks
          fadeTransition(container, () => {
            container.innerHTML = newContent;
            reattachHotspotListeners(container, targetId);

            // After navigation, show tooltip content from the NEW container's first hotspot
            // Pass targetId as the current block ID we're now on
            showInitialPanel(container, targetId);
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

          // Attach go-back handler
          const goBackLink = tooltipContent.querySelector('[data-go-back]');
          if (goBackLink) {
            goBackLink.addEventListener('click', (evt) => {
              evt.preventDefault();
              const backToId = goBackLink.dataset.goBack;
              const backContent = originalContentMap.get(backToId);
              if (backContent) {
                // Use fade transition when going back
                fadeTransition(container, () => {
                  container.innerHTML = backContent;
                  reattachHotspotListeners(container, blockId);
                });
              }
            });
          }
          // SVG connector line updates automatically via requestAnimationFrame
        } else if (tooltipPanel) {
          tooltipPanel.classList.remove('visible');
        }
      });
    }
  });
}
