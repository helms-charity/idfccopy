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

        // After fade out, switch sections and fade in
        setTimeout(() => {
          // Hide all concept sections
          conceptSections.forEach((s) => {
            s.style.display = 'none';
            s.classList.remove('fade-out', 'fade-in');
          });

          // Show target section starting invisible
          targetSection.style.display = 'flex';
          targetSection.style.opacity = '0';

          // Force reflow before starting fade-in animation
          // eslint-disable-next-line no-unused-expressions
          targetSection.offsetHeight;

          // Now fade in
          targetSection.style.opacity = '';
          targetSection.classList.add('fade-in');
        }, 200);
      });

      hotspotContainer.appendChild(hotspot);
    });

    imgCol.appendChild(hotspotContainer);
  });
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

  // Set decoration image as CSS custom property for pseudo-elements
  if (options.decorationImage) {
    dialog.style.setProperty('--modal-decoration-image', `url('${options.decorationImage}')`);
    dialog.classList.add('has-decoration');
  }

  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  // Setup interactive hotspots for mayura-metal-concept sections
  setupMayuraHotspots(dialogContent);

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
  closeButton.addEventListener('click', () => dialog.close());
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
      dialog.close();
    }
  });

  // Add page background image if provided (sits behind the dialog)
  let pageBackground = null;
  if (options.pageBackgroundImage) {
    pageBackground = document.createElement('div');
    pageBackground.classList.add('modal-page-background');

    const bgImg = document.createElement('img');
    bgImg.src = options.pageBackgroundImage;
    bgImg.alt = '';
    bgImg.loading = 'eager';

    pageBackground.append(bgImg);
  }

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    cleanupConnectorLines(); // Stop the animation loop
    block.remove();
  });

  block.innerHTML = '';
  if (pageBackground) {
    block.append(pageBackground);
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
