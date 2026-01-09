import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/*
  This is not a traditional block, so there is no decorate function.
  Instead, links to a /modals/ path are automatically transformed into a modal.
  Other blocks can also use the createModal() and openModal() functions.
*/

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
