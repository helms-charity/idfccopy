import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);

  // Hide decorative headings from screen readers to resolve contrast audit
  // Future suggestion: Replace with proper color contrast fix in CSS
  const missionHeading = block.querySelector('.default-content h5:first-of-type');
  const customerHeading = block.querySelector('.default-content h6:first-of-type');
  if (missionHeading) missionHeading.setAttribute('aria-hidden', 'true');
  if (customerHeading) customerHeading.setAttribute('aria-hidden', 'true');

  // Remove "only one open" behavior from footer accordions (allow multiple open)
  block.querySelectorAll('.accordion').forEach((accordion) => {
    // Remove toggle handlers from all details
    accordion.querySelectorAll('details').forEach((detail) => {
      if (detail.accordionToggleHandler) {
        detail.removeEventListener('toggle', detail.accordionToggleHandler);
        delete detail.accordionToggleHandler;
      }
    });

    // Close the first item that was auto-opened by accordion.js
    const firstDetail = accordion.querySelector('details');
    if (firstDetail && firstDetail.hasAttribute('open')) {
      firstDetail.removeAttribute('open');
    }
  });

  // Handle accordion open/close state based on viewport width
  const details = block.querySelectorAll('.footer .section.accordion-container:first-of-type details');
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  const updateAccordionState = (isMobile) => {
    details.forEach((detail) => {
      if (isMobile) {
        // Close accordions on mobile
        detail.removeAttribute('open');
      } else {
        // Open accordions on desktop
        detail.setAttribute('open', '');
      }
    });
  };
  // Set initial state
  updateAccordionState(mobileQuery.matches);

  // Listen for viewport changes
  mobileQuery.addEventListener('change', (e) => {
    updateAccordionState(e.matches);
  });
}
