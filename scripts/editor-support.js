import {
  decorateBlock,
  decorateBlocks,
  decorateButtons,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateMain, loadFragment } from './scripts.js';

/**
 * Reload category navigation after main content updates
 * This handles changes to page-level category-nav aem-content field
 */
async function reloadCategoryNav(main) {
  const categoryNavBlocks = main.querySelectorAll('.category-nav');
  if (categoryNavBlocks.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Editor] No blocks found after update');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[Category Nav Editor] Reloading with ${categoryNavBlocks.length} block(s)`);

  // Reset the unified nav flag so it can be rebuilt
  try {
    const categoryNavModule = await import(`${window.hlx.codeBasePath}/blocks/category-nav/category-nav.js`);
    if (categoryNavModule.resetUnifiedNavFlag) {
      categoryNavModule.resetUnifiedNavFlag();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav Editor] Failed to reset nav flag:', error);
  }

  // Remove existing wrapper if present
  const existingWrapper = document.querySelector('.category-nav-wrapper');
  if (existingWrapper) {
    // eslint-disable-next-line no-console
    console.log('[Category Nav Editor] Removing existing wrapper');
    existingWrapper.remove();
  }

  // Create new wrapper at top of main
  const categoryNavWrapper = document.createElement('div');
  categoryNavWrapper.classList.add('category-nav-wrapper');
  categoryNavWrapper.setAttribute('data-nav-placeholder', 'true');
  main.insertBefore(categoryNavWrapper, main.firstChild);
  // eslint-disable-next-line no-console
  console.log('[Category Nav Editor] New wrapper created');

  // Load CSS
  const blockName = 'category-nav';
  try {
    await loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Category Nav Editor] Failed to load CSS:', error);
  }

  // Load the category-nav blocks to trigger their decoration
  const navBlocks = [...main.querySelectorAll('.category-nav.block')];
  // eslint-disable-next-line no-console
  console.log(`[Category Nav Editor] Loading ${navBlocks.length} block(s) to trigger decoration`);
  for (let i = 0; i < navBlocks.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadBlock(navBlocks[i]);
  }
  // eslint-disable-next-line no-console
  console.log('[Category Nav Editor] Category navigation reload complete');

  // Clean up: Remove the fragment sections from main
  // These were injected from the fragment but are no longer needed
  const categoryNavSections = main.querySelectorAll('.category-nav-container');
  if (categoryNavSections.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Category Nav Editor] Removing ${categoryNavSections.length} fragment section(s) from main`);
    categoryNavSections.forEach((section) => {
      section.remove();
    });
    // eslint-disable-next-line no-console
    console.log('[Category Nav Editor] Fragment sections cleaned up');
  }
}

async function applyChanges(event) {
  // redecorate default content and blocks on patches (in the properties rail)
  const { detail } = event;

  const resource = detail?.request?.target?.resource // update, patch components
    || detail?.request?.target?.container?.resource // update, patch, add to sections
    || detail?.request?.to?.container?.resource; // move in sections
  if (!resource) return false;
  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  const parsedUpdate = new DOMParser().parseFromString(content, 'text/html');
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(`[data-aue-resource="${resource}"]`);
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);

      // Load category-nav fragment from page metadata BEFORE decorating
      // This handles when content authors change the category-nav page property
      const categoryNavPath = getMetadata('category-nav', parsedUpdate);
      if (categoryNavPath) {
        // eslint-disable-next-line no-console
        console.log(`[Category Nav Editor] Loading fragment from metadata: ${categoryNavPath}`);
        try {
          const fragment = await loadFragment(categoryNavPath);
          if (fragment) {
            const fragmentSections = fragment.querySelectorAll(':scope > .section');
            // eslint-disable-next-line no-console
            console.log(`[Category Nav Editor] Injecting ${fragmentSections.length} section(s) from fragment`);
            const { firstChild } = newMain;
            fragmentSections.forEach((section) => {
              const sectionClone = section.cloneNode(true);

              // Add semantic classes to sections containing category-nav blocks
              const categoryNavBlock = sectionClone.querySelector('.category-nav');
              if (categoryNavBlock) {
                // Remove the fragment-block marker so it can be loaded on the page
                categoryNavBlock.removeAttribute('data-fragment-block');
                // Reset block status so it can be loaded explicitly later
                categoryNavBlock.dataset.blockStatus = '';

                sectionClone.classList.add('category-nav-section');

                const titleWrapper = sectionClone.querySelector('.default-content-wrapper');
                if (titleWrapper) {
                  titleWrapper.classList.add('category-title-wrapper');
                  const titleElement = titleWrapper.querySelector('p, h1, h2, h3, h4, h5, h6');
                  if (titleElement) {
                    titleElement.classList.add('category-title');
                    const categoryName = titleElement.textContent.trim();
                    sectionClone.setAttribute('data-category-name', categoryName);
                    // eslint-disable-next-line no-console
                    console.log(`[Category Nav Editor] Tagged section with category: ${categoryName}`);
                  }
                }

                const blockWrapper = sectionClone.querySelector('.category-nav-wrapper');
                if (blockWrapper) {
                  blockWrapper.classList.add('category-nav-block-wrapper');
                }
              }

              if (firstChild) {
                newMain.insertBefore(sectionClone, firstChild);
              } else {
                newMain.appendChild(sectionClone);
              }
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[Category Nav Editor] Error loading fragment:', error);
        }
      }

      decorateMain(newMain);
      decorateRichtext(newMain);
      await loadSections(newMain);

      // Reload category navigation if present
      // eslint-disable-next-line no-console
      console.log('[Category Nav Editor] Main element updated, checking for category-nav');
      await reloadCategoryNav(newMain);

      element.remove();
      newMain.style.display = null;
      // eslint-disable-next-line no-use-before-define
      attachEventListners(newMain);
      return true;
    }

    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    if (block) {
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(`[data-aue-resource="${blockResource}"]`);
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        await loadBlock(newBlock);
        block.remove();
        newBlock.style.display = null;

        // If this is a category-nav block, reload the unified navigation
        if (newBlock.classList.contains('category-nav')) {
          // eslint-disable-next-line no-console
          console.log('[Category Nav Editor] Category-nav block updated, rebuilding navigation');
          const main = newBlock.closest('main');
          if (main) {
            await reloadCategoryNav(main);
          } else {
            // eslint-disable-next-line no-console
            console.error('[Category Nav Editor] Could not find main element for block update');
          }
        }

        return true;
      }
    } else {
      // sections and default content, may be multiple in the case of richtext
      const newElements = parsedUpdate.querySelectorAll(`[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`);
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          await loadSections(parentElement);
          element.remove();
          newSection.style.display = null;

          // If this section contains category-nav blocks, reload the navigation
          if (newSection.querySelector('.category-nav')) {
            // eslint-disable-next-line no-console
            console.log('[Category Nav Editor] Section with category-nav updated, rebuilding navigation');
            const main = newSection.closest('main');
            if (main) {
              await reloadCategoryNav(main);
            } else {
              // eslint-disable-next-line no-console
              console.error('[Category Nav Editor] Could not find main element for section update');
            }
          }
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
        }
        return true;
      }
    }
  }

  return false;
}

function attachEventListners(main) {
  [
    'aue:content-patch',
    'aue:content-update',
    'aue:content-add',
    'aue:content-move',
    'aue:content-remove',
    'aue:content-copy',
  ].forEach((eventType) => main?.addEventListener(eventType, async (event) => {
    event.stopPropagation();
    const applied = await applyChanges(event);
    if (!applied) window.location.reload();
  }));
}

attachEventListners(document.querySelector('main'));
