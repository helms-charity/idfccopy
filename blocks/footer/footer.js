import {
  getMetadata, decorateIcons, decorateBlock, loadBlock,
} from '../../scripts/aem.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  block.textContent = '';

  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';

  // Fetch footer content without using loadFragment (which adds data-aue-* attributes)
  if (footerPath && footerPath.startsWith('/')) {
    const resp = await fetch(footerPath);

    if (resp.ok) {
      const html = await resp.text();
      const footer = document.createElement('div');
      footer.innerHTML = html;

      // Decorate icons in the footer content
      decorateIcons(footer);

      // Decorate and load accordion blocks
      const accordions = footer.querySelectorAll('.accordion');
      accordions.forEach((accordion) => {
        decorateBlock(accordion);
        loadBlock(accordion);
      });

      block.append(footer);
    }
  }

  // Open accordion details on desktop
  const details = block.querySelectorAll('footer .section.accordion-container:first-of-type details');
  if (window.innerWidth > 768) {
    details.forEach((detail) => {
      detail.open = true;
    });
  }
}
