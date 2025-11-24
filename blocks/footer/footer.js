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

  // Extract inner content from sections without transferring the section elements
  // This prevents footer sections from appearing in the Universal Editor content tree
  if (fragment) {
    const sections = fragment.querySelectorAll(':scope > div');
    sections.forEach((section) => {
      // Create a new div to hold this section's content
      const newSection = document.createElement('div');
      // Copy the class names to preserve styling
      newSection.className = section.className;

      // Move the children (blocks, content wrappers) from the original section
      // but not the section element itself (which has data-aue-resource)
      while (section.firstChild) {
        newSection.appendChild(section.firstChild);
      }

      footer.append(newSection);
    });
  }

  block.append(footer);

  // Open accordion details on desktop
  const details = block.querySelectorAll('footer .section.accordion-container:first-of-type details');
  if (window.innerWidth > 768) {
    details.forEach((detail) => {
      detail.open = true;
    });
  }
}
