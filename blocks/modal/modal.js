import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/*
  This is not a traditional block, so there is no decorate function.
  Instead, links to a /modals/ path are automatically transformed into a modal.
  Other blocks can also use the createModal() and openModal() functions.
*/

/**
 * Closes a dialog with a fade-out animation.
 * @param {HTMLDialogElement} dialog - The dialog element to close
 */
function animatedClose(dialog) {
  if (!dialog || !dialog.open) return;
  // Remove visible class to trigger fade-out transition
  dialog.classList.remove('modal-visible');
  setTimeout(() => {
    dialog.close();
  }, 300); // matches --modal-transition-duration in CSS
}

/**
 * Hotspot positions for each mayura-metal-concept section.
 * Each section has 3 hotspots that correspond to pseudo-elements:
 * - hotspot1 (::before on columns-img-col) → shows concept-1
 * - hotspot2 (::after on columns-img-col) → shows concept-2
 * - hotspot3 (::before on picture) → shows concept-3
 */
const MAYURA_HOTSPOT_POSITIONS = {
  1: {
    hotspot1: { top: '35%', left: '11%' },
    hotspot2: { top: '55%', left: '52%' },
    hotspot3: { top: '16%', left: '61%' },
  },
  2: {
    hotspot1: { top: '22%', left: '14%' },
    hotspot2: { top: '62%', left: '51%' },
    hotspot3: { top: '16%', left: '61%' },
  },
  3: {
    hotspot1: { top: '11%', left: '22%' },
    hotspot2: { top: '61%', left: '42%' },
    hotspot3: { top: '22%', left: '81%' },
  },
};

/**
 * Creates clickable hotspots for mayura-metal-concept sections.
 * These hotspots overlay the pseudo-element positions and allow
 * switching between concept sections.
 * @param {HTMLElement} container - The modal content container
 */
function setupMayuraHotspots(container) {
  const conceptSections = container.querySelectorAll('.section[data-id^="mayura-metal-concept-"]');
  if (conceptSections.length === 0) return;

  conceptSections.forEach((section) => {
    const dataId = section.getAttribute('data-id');
    const conceptNum = parseInt(dataId.replace('mayura-metal-concept-', ''), 10);
    const positions = MAYURA_HOTSPOT_POSITIONS[conceptNum];

    if (!positions) return;

    const imgCol = section.querySelector('div.columns-img-col');
    if (!imgCol) return;

    // Create hotspot container
    const hotspotContainer = document.createElement('div');
    hotspotContainer.className = 'mayura-hotspot-container';

    // Create 3 hotspots
    [1, 2, 3].forEach((targetConcept) => {
      const hotspotKey = `hotspot${targetConcept}`;
      const pos = positions[hotspotKey];

      const hotspot = document.createElement('button');
      hotspot.type = 'button';
      hotspot.className = 'mayura-hotspot';
      hotspot.setAttribute('aria-label', `View concept ${targetConcept}`);
      // Position hotspot to overlap the 20px pseudo-element circles
      // Pseudo-elements have top-left at the specified position
      // We use a larger clickable area (40px) centered on the pseudo-element
      hotspot.style.cssText = `
        position: absolute;
        top: calc(${pos.top} - 10px);
        left: calc(${pos.left} - 10px);
        width: 40px;
        height: 40px;
        background: transparent;
        border: none;
        cursor: pointer;
        z-index: 10;
      `;

      hotspot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Find the currently visible section
        const visibleSection = [...conceptSections].find(
          (s) => s.style.display !== 'none' && getComputedStyle(s).display !== 'none',
        );

        const targetSection = container.querySelector(`.section[data-id="mayura-metal-concept-${targetConcept}"]`);
        if (!targetSection || targetSection === visibleSection) return;

        // Fade out the visible section
        if (visibleSection) {
          visibleSection.classList.add('fade-out');
          visibleSection.classList.remove('fade-in');
        }

        // Wait for fade-out to complete (350ms), then switch sections
        setTimeout(() => {
          // Hide all concept sections
          conceptSections.forEach((s) => {
            s.style.display = 'none';
            s.classList.remove('fade-out', 'fade-in');
          });

          // Show target section starting invisible
          targetSection.style.display = 'flex';
          targetSection.classList.add('fade-out');

          // Force reflow before starting fade-in animation
          // eslint-disable-next-line no-unused-expressions
          targetSection.offsetHeight;

          // Now fade in
          targetSection.classList.remove('fade-out');
          targetSection.classList.add('fade-in');
        }, 350);
      });

      hotspotContainer.appendChild(hotspot);
    });

    imgCol.appendChild(hotspotContainer);
  });
}

/**
 * Sets up click handlers on the last paragraph of each mayura concept section.
 * - Concept 1's last p: closes the modal
 * - Concept 2's last p: clicks hotspot 1 (shows concept 1)
 * - Concept 3's last p: clicks hotspot 2 (shows concept 2)
 * @param {HTMLElement} container - The modal content container
 * @param {HTMLDialogElement} dialog - The dialog element to close
 */
function setupMayuraLastParagraphActions(container, dialog) {
  // Concept 1: last p closes modal
  const concept1LastP = container.querySelector('.section[data-id="mayura-metal-concept-1"] p:last-child');
  if (concept1LastP) {
    concept1LastP.style.cursor = 'pointer';
    concept1LastP.addEventListener('click', () => {
      animatedClose(dialog);
    });
  }

  // Concept 2: last p clicks hotspot 1 (shows concept 1)
  const concept2LastP = container.querySelector('.section[data-id="mayura-metal-concept-2"] p:last-child');
  if (concept2LastP) {
    concept2LastP.style.cursor = 'pointer';
    concept2LastP.addEventListener('click', () => {
      const hotspot1 = container.querySelector('.section[data-id="mayura-metal-concept-2"] .mayura-hotspot-container > button:nth-child(1)');
      if (hotspot1) hotspot1.click();
    });
  }

  // Concept 3: last p clicks hotspot 2 (shows concept 2)
  const concept3LastP = container.querySelector('.section[data-id="mayura-metal-concept-3"] p:last-child');
  if (concept3LastP) {
    concept3LastP.style.cursor = 'pointer';
    concept3LastP.addEventListener('click', () => {
      const hotspot2 = container.querySelector('.section[data-id="mayura-metal-concept-3"] .mayura-hotspot-container > button:nth-child(2)');
      if (hotspot2) hotspot2.click();
    });
  }
}

/**
 * Line configurations for connecting p elements to hotspot buttons.
 * Each concept section has its own line configuration.
 */
const MAYURA_LINE_CONFIGS = [
  { concept: 1, pSelector: 'p:nth-child(1)', buttonIndex: 1 },
  { concept: 2, pSelector: 'p:nth-child(2)', buttonIndex: 2 },
  { concept: 3, pSelector: 'p:nth-child(2)', buttonIndex: 3 },
];

/**
 * Draws connecting lines between text elements and hotspot buttons.
 * Lines are redrawn continuously using requestAnimationFrame.
 * @param {HTMLElement} container - The modal content container
 * @returns {Function} cleanup function to stop the animation loop
 */
function setupMayuraConnectorLines(container) {
  const conceptSections = container.querySelectorAll('.section[data-id^="mayura-metal-concept-"]');
  if (conceptSections.length === 0) return () => {};

  let animationFrameId = null;

  // Create SVG container for each section
  conceptSections.forEach((section) => {
    const existingSvg = section.querySelector('.mayura-connector-svg');
    if (existingSvg) existingSvg.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('mayura-connector-svg');
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
    section.style.position = 'relative';
    section.appendChild(svg);
  });

  function drawLines() {
    const isMobile = window.innerWidth < 900;

    MAYURA_LINE_CONFIGS.forEach((config) => {
      const section = container.querySelector(`.section[data-id="mayura-metal-concept-${config.concept}"]`);
      if (!section) return;

      const svg = section.querySelector('.mayura-connector-svg');
      if (!svg) return;

      // Clear existing lines
      svg.innerHTML = '';

      // Skip if section is hidden
      if (section.style.display === 'none' || getComputedStyle(section).display === 'none') {
        return;
      }

      // For mobile, always use p:nth-child(1)
      const pSelector = isMobile ? 'p:nth-child(1)' : config.pSelector;
      const pElement = section.querySelector(`.columns-wrapper ${pSelector}`);
      const buttonElement = section.querySelector(`.mayura-hotspot-container > button:nth-child(${config.buttonIndex})`);

      if (!pElement || !buttonElement) return;

      const sectionRect = section.getBoundingClientRect();
      const pRect = pElement.getBoundingClientRect();
      const buttonRect = buttonElement.getBoundingClientRect();

      let x1;
      let y1;
      let x2;
      let y2;

      if (isMobile) {
        // Mobile: center-top of p to center-bottom of button
        x1 = pRect.left + (pRect.width / 2) - sectionRect.left;
        y1 = pRect.top - sectionRect.top;
        x2 = buttonRect.left + (buttonRect.width / 2) - sectionRect.left;
        y2 = buttonRect.bottom - sectionRect.top;
      } else {
        // Desktop: center-right of p to center-left of button
        x1 = pRect.right - sectionRect.left;
        y1 = pRect.top + (pRect.height / 2) - sectionRect.top;
        x2 = buttonRect.left - sectionRect.left;
        y2 = buttonRect.top + (buttonRect.height / 2) - sectionRect.top;
      }

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#332b28');
      line.setAttribute('stroke-width', '1');

      svg.appendChild(line);
    });

    // Continue the animation loop
    animationFrameId = requestAnimationFrame(drawLines);
  }

  // Start the continuous drawing loop
  animationFrameId = requestAnimationFrame(drawLines);

  // Return cleanup function
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

export async function createModal(contentNodes, options = {}) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  const dialog = document.createElement('dialog');

  // Apply modal theme class if provided
  if (options.modalTheme) {
    dialog.classList.add(options.modalTheme);
  }

  // Mark auto-popup modals for different backdrop styling
  if (options.isAutoPopup) {
    dialog.classList.add('modal-auto-popup');
  }

  // Store decoration image for later application to page background
  const { decorationImage } = options;

  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  // Setup interactive hotspots for mayura-metal-concept sections
  setupMayuraHotspots(dialogContent);

  // Setup last paragraph click actions (close modal, navigate between concepts)
  setupMayuraLastParagraphActions(dialogContent, dialog);

  // Setup connector lines between text and hotspots (continuously updated)
  const cleanupConnectorLines = setupMayuraConnectorLines(dialogContent);

  // Add background texture image for themed modals
  if (options.modalTheme && options.textureImage) {
    const textureWrapper = document.createElement('div');
    textureWrapper.classList.add('modal-texture');

    const textureImg = document.createElement('img');
    textureImg.src = options.textureImage;
    textureImg.alt = '';
    textureImg.loading = 'eager';

    textureWrapper.append(textureImg);
    dialog.prepend(textureWrapper);
  }

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<span class="icon icon-close"></span>';
  closeButton.addEventListener('click', () => animatedClose(dialog));
  dialog.prepend(closeButton);

  // Add CTA content if provided (positioned top-right, above close button)
  if (options.ctaContent) {
    const ctaWrapper = document.createElement('div');
    ctaWrapper.classList.add('modal-cta');
    ctaWrapper.innerHTML = options.ctaContent;
    dialog.prepend(ctaWrapper);
  }

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // close on click outside the dialog
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      animatedClose(dialog);
    }
  });

  // Add page background image if provided (sits behind the dialog)
  let pageBackground = null;
  if (options.pageBackgroundImage) {
    // Set CSS custom property for ::backdrop to use
    dialog.style.setProperty('--modal-page-background-image', `url('${options.pageBackgroundImage}')`);
    dialog.classList.add('has-page-background');

    pageBackground = document.createElement('div');
    pageBackground.classList.add('modal-page-background');

    const bgImg = document.createElement('img');
    bgImg.src = options.pageBackgroundImage;
    bgImg.alt = '';
    bgImg.loading = 'eager';

    pageBackground.append(bgImg);

    // Add decoration images as DOM elements (top-right and bottom-left)
    // These go INSIDE the dialog to be in the top layer, but use fixed positioning
    if (decorationImage) {
      const decorTopRight = document.createElement('img');
      decorTopRight.src = decorationImage;
      decorTopRight.alt = '';
      decorTopRight.classList.add('modal-decoration', 'modal-decoration-top-right');

      const decorBottomLeft = document.createElement('img');
      decorBottomLeft.src = decorationImage;
      decorBottomLeft.alt = '';
      decorBottomLeft.classList.add('modal-decoration', 'modal-decoration-bottom-left');

      // Store decorations to append inside dialog later
      pageBackground.decorations = [decorTopRight, decorBottomLeft];
    }
  }

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    cleanupConnectorLines(); // Stop the animation loop
    block.remove();
  });

  block.innerHTML = '';
  if (pageBackground) {
    block.append(pageBackground);
    // Append decorations inside dialog (so they're in top layer and visible)
    // They use fixed positioning with calc() to appear at viewport corners
    if (pageBackground.decorations) {
      pageBackground.decorations.forEach((decor) => dialog.append(decor));
    }
  }
  block.append(dialog);

  return {
    block,
    showModal: () => {
      // Save scroll position before showModal (native dialog can reset it)
      const { scrollY } = window;
      dialog.showModal();
      // Restore scroll position immediately
      window.scrollTo(0, scrollY);
      // Trigger fade-in after dialog is in top layer (needs a frame for transition to work)
      requestAnimationFrame(() => {
        dialog.classList.add('modal-visible');
      });
      // Reset scroll position of dialog content only
      setTimeout(() => { dialogContent.scrollTop = 0; }, 0);
      document.body.classList.add('modal-open');
    },
  };
}

export async function openModal(fragmentUrl, options = {}) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  const { showModal } = await createModal(fragment.childNodes, options);
  showModal();
}

/**
 * Sets up modal interactivity (hotspots, connectors, etc.) on inline content
 * without creating a dialog. Used for embedding modal content directly in page.
 * @param {HTMLElement} container - The container element with the modal content
 */
export async function setupModalInteractivity(container) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);

  // Setup interactive hotspots for mayura-metal-concept sections
  setupMayuraHotspots(container);

  // Setup last paragraph click actions (navigate between concepts)
  // Pass null for dialog since we're not in a modal
  setupMayuraLastParagraphActions(container, null);

  // Setup connector lines between text and hotspots
  setupMayuraConnectorLines(container);
}
