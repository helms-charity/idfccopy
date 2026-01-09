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

  // Open accordion details on desktop
  const details = block.querySelectorAll('.footer .section.accordion-container:first-of-type details');
  if (window.innerWidth > 768) {
    // Use setAttribute to avoid triggering toggle events
    details.forEach((detail) => {
      detail.setAttribute('open', '');
    });
  }
}
