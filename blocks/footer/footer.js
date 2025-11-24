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
  let footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';

  // Fetch footer content directly without using loadFragment
  // This avoids adding data-aue-* attributes from the footer fragment
  if (footerPath && footerPath.startsWith('/')) {
    // Ensure we're fetching the .plain.html version
    footerPath = footerPath.replace(/\.html$/, '');
    const resp = await fetch(`${footerPath}.plain.html`);

    if (resp.ok) {
      const html = await resp.text();

      // Parse HTML into a temporary container
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Extract sections from the parsed HTML
      const sections = temp.querySelectorAll(':scope > main > div');
      const footer = document.createElement('div');

      sections.forEach((section) => {
        // Create new section div (without data-aue attributes from fragment)
        const newSection = document.createElement('div');
        newSection.className = section.className;
        newSection.innerHTML = section.innerHTML;
        footer.append(newSection);
      });

      // Decorate icons in the footer content
      decorateIcons(footer);

      // Decorate and load any blocks in the footer
      const blocks = footer.querySelectorAll('.block');
      blocks.forEach((footerBlock) => {
        decorateBlock(footerBlock);
        loadBlock(footerBlock);
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
