import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // eslint-disable-next-line no-console
  console.log('[DEBUG footer.js decorate] START - Decorating footer block');
  // eslint-disable-next-line no-console
  console.log('[DEBUG footer.js decorate] Block element:', block);
  
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  // eslint-disable-next-line no-console
  console.log('[DEBUG footer.js decorate] Loading footer fragment from:', footerPath);
  const fragment = await loadFragment(footerPath);
  // eslint-disable-next-line no-console
  console.log('[DEBUG footer.js decorate] Footer fragment loaded, building footer DOM');

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);

  const details = block.querySelectorAll('footer .section.accordion-container:first-of-type details');
  if (window.innerWidth > 768) {
    details.forEach((detail) => {
      detail.open = true;
    });
  }
  // eslint-disable-next-line no-console
  console.log('[DEBUG footer.js decorate] COMPLETE - Footer decoration finished');
}
