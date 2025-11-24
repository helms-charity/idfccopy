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

  // Build footer DOM from fragment content without transferring section elements
  // This prevents footer sections from appearing in the Universal Editor content tree
  if (fragment) {
    // Get all sections from the fragment
    const sections = fragment.querySelectorAll(':scope > div');
    sections.forEach((section) => {
      // Create a new section div (without data-aue attributes)
      const newSection = document.createElement('div');
      newSection.className = section.className;

      // Move the inner content (blocks, wrappers, etc.) from the section
      // The section element itself (with data-aue-resource) stays in fragment
      while (section.firstChild) {
        newSection.appendChild(section.firstChild);
      }

      footer.append(newSection);
    });
  }

  block.append(footer);

  const details = block.querySelectorAll('footer .section.accordion-container:first-of-type details');
  if (window.innerWidth > 768) {
    details.forEach((detail) => {
      detail.open = true;
    });
  }
}
