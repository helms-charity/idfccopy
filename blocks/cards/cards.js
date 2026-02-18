import {
  createOptimizedPicture, loadScript, loadCSS,
} from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createModal } from '../modal/modal.js';

/**
 * Sanitizes text for JSON-LD by removing/replacing problematic characters
 * @param {string} text The text to sanitize
 * @returns {string} Sanitized text
 */

/**
 * Block-level row order (AEM EDS element grouping):
 * Row 0 = modal_ group (theme + up to 3 images), Row 1 = swiper_ group.
 * Card row: cell 0 = image+alt, cell 1 = cardDecor (divider + texture), cell 2 = cardContent.
 */

/**
 * Extracts block-level properties from the first two block rows (modal_ and swiper_ groups).
 * Row 0 = cell with theme text + up to 3 pictures; row 1 = cell with 3 values.
 * @param {HTMLElement} block The block element (children: config rows then card rows)
 * @returns {number} Number of config rows consumed (2 when grouped, else 0)
 */
function extractBlockProperties(block) {
  const rows = [...block.children];
  if (rows.length < 2) return 0;

  const [row0, row1] = rows;
  const modalCell = row0.querySelector('div > div') || row0.firstElementChild || row0;
  const swiperCell = row1.querySelector('div > div') || row1.firstElementChild || row1;
  if (!modalCell || !swiperCell) return 0;

  let modalTheme = '';
  const modalImages = [];
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t && !modalTheme) modalTheme = t;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'P' && !modalTheme) {
      const t = node.textContent?.trim();
      if (t) modalTheme = t;
      return;
    }
    const img = node.tagName === 'IMG' ? node : node.querySelector?.('img');
    if (img?.src) modalImages.push(img.src);
    [...node.childNodes].forEach(walk);
  };
  walk(modalCell);
  if (modalTheme) block.dataset.modalTheme = modalTheme;
  const [dialogTexture, pageBg, decorationImg] = modalImages;
  if (dialogTexture) block.dataset.modalDialogBackgroundImageTexture = dialogTexture;
  if (pageBg) block.dataset.modalPageBackgroundImage = pageBg;
  if (decorationImg) block.dataset.modalPageDecorationImage = decorationImg;

  const swiperText = swiperCell.textContent?.trim() || '';
  const parts = swiperText.split(/\s+/).filter(Boolean);
  const [swipableVal, autoplayVal, startingVal] = parts;
  if (swipableVal) block.dataset.swipable = swipableVal;
  if (autoplayVal) block.dataset.autoplayEnabled = autoplayVal;
  if (startingVal) block.dataset.startingCard = startingVal;

  return 2;
}

/**
 * Creates and appends the arrow icon element to a card body
 * @param {HTMLElement} cardBody The card body element to append the arrow to
 */
function appendArrowIcon(cardBody) {
  // Check if arrow already exists
  if (cardBody.querySelector('.icon-arrow-right-white')) return;

  const arrowP = document.createElement('p');
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'icon icon-arrow-right-white';

  const arrowImg = document.createElement('img');
  arrowImg.setAttribute('data-icon-name', 'arrow-right-white');
  arrowImg.src = '/icons/arrow-right-white.svg';
  arrowImg.alt = 'arrow-right-white';
  arrowImg.loading = 'lazy';

  arrowSpan.appendChild(arrowImg);
  arrowP.appendChild(arrowSpan);
  cardBody.appendChild(arrowP);
}

/**
 * Sets up card interactivity based on card type:
 * 1. Standard card: No link, no modal - not clickable
 * 2. Easy modal card: No link, has modalContent - opens inline modal on click
 * 3. Complex modal card: Has link to /modals/ path - handled by autolinkModals
 * @param {HTMLElement} cardItem The card element
 * @param {boolean} shouldAddArrow Whether to add the arrow icon for interactive cards
 * @param {string} modalTheme Optional theme class to apply to the modal
 * @param {HTMLElement} parentBlock The parent block element (passed to avoid repeated queries)
 */
function setupCardInteractivity(cardItem, shouldAddArrow = false, modalTheme = '', parentBlock = null) {
  const cardBodies = cardItem.querySelectorAll('.cards-card-body');
  if (cardBodies.length === 0) return;

  // The first cards-card-body is the main text content
  // The last cards-card-body (if different) is the modal content
  const mainBody = cardBodies[0];
  const modalContentDiv = cardBodies.length > 1 ? cardBodies[cardBodies.length - 1] : null;

  // Check if modal content div has actual content (not just a link from cardLink field)
  // If the div only contains a single link with no other text, it's a cardLink, not modal content
  const isJustALink = modalContentDiv
    && modalContentDiv.querySelector('a')
    && modalContentDiv.textContent.trim() === modalContentDiv.querySelector('a')?.textContent.trim();

  const hasModalContent = modalContentDiv
    && modalContentDiv.textContent.trim().length > 0
    && modalContentDiv !== mainBody
    && !isJustALink;

  // Hide the secondary body div (whether it's modal content or just a cardLink)
  if (modalContentDiv && modalContentDiv !== mainBody) {
    modalContentDiv.classList.add('cards-modal-content');
  }

  // Check for card link (could be in main body or as a standalone link)
  const cardLink = cardItem.querySelector('a[href]');
  const hasModalPath = cardLink && cardLink.href && cardLink.href.includes('/modals/');
  const hasRegularLink = cardLink && !hasModalPath;

  // Type 3: Complex modal with /modals/ path - make entire card clickable
  // The autolinkModals function in scripts.js will handle the actual modal opening
  if (hasModalPath) {
    cardItem.classList.add('card-clickable');
    cardItem.setAttribute('role', 'button');
    cardItem.setAttribute('tabindex', '0');

    const handleClick = (e) => {
      // Don't intercept if clicking on the actual link
      if (e.target.closest('a')) return;
      e.preventDefault();
      e.stopPropagation();
      // Trigger click on the link to let autolinkModals handle it
      cardLink.click();
    };

    cardItem.addEventListener('click', handleClick);
    cardItem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cardLink.click();
      }
    });

    // Hide the original link text but keep it functional
    let buttonContainer = cardLink.closest('.button-container');
    if (!buttonContainer) {
      buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';
      cardLink.parentNode.insertBefore(buttonContainer, cardLink);
      buttonContainer.appendChild(cardLink);
    }
    buttonContainer.classList.add('sr-only');

    // Add arrow icon for interactive cards (if enabled for this variant)
    if (shouldAddArrow) {
      appendArrowIcon(mainBody);
    }
    return; // Don't process further if this is a complex modal card
  }

  // Type 2: Easy modal with inline content (no link to /modals/)
  if (hasModalContent) {
    cardItem.classList.add('card-clickable', 'card-modal');
    cardItem.setAttribute('role', 'button');
    cardItem.setAttribute('tabindex', '0');

    // Store the modal content (already hidden via CSS .cards-modal-content class)
    const modalContent = modalContentDiv.cloneNode(true);

    const openCardModal = async () => {
      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = modalContent.innerHTML;

      // Build modal options
      const modalOptions = {};
      if (modalTheme) {
        modalOptions.modalTheme = modalTheme;
      }

      // Get images from block-level settings (authored in modal settings)
      // Use passed parentBlock instead of querying
      const blockTextureUrl = parentBlock?.dataset?.modalDialogBackgroundImageTexture;
      const pageBackgroundUrl = parentBlock?.dataset?.modalPageBackgroundImage;

      // Only use the block-level authored texture image, never inherit from card
      if (blockTextureUrl) {
        modalOptions.textureImage = blockTextureUrl;
      }

      if (pageBackgroundUrl) {
        modalOptions.pageBackgroundImage = pageBackgroundUrl;
      }

      const decorationImageUrl = parentBlock?.dataset?.modalPageDecorationImage;
      if (decorationImageUrl) {
        modalOptions.decorationImage = decorationImageUrl;
      }

      const ctaContent = parentBlock?.dataset?.modalCtaContent;
      if (ctaContent) {
        modalOptions.ctaContent = ctaContent;
      }

      const { showModal } = await createModal([contentWrapper], modalOptions);
      showModal();
    };

    cardItem.addEventListener('click', (e) => {
      // Don't trigger modal if clicking on a regular link within the card
      if (e.target.closest('a')) return;
      e.preventDefault();
      e.stopPropagation();
      openCardModal();
    });
    cardItem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCardModal();
      }
    });

    // Add arrow icon for interactive cards (if enabled for this variant)
    if (shouldAddArrow) {
      appendArrowIcon(mainBody);
    }
    return;
  }

  // Type 1 variant: Card with regular link (not /modals/) - make entire card clickable
  if (hasRegularLink) {
    cardItem.classList.add('card-clickable');
    cardItem.setAttribute('role', 'link');
    cardItem.setAttribute('tabindex', '0');

    const handleClick = (e) => {
      if (e.target.closest('a')) return;
      e.preventDefault();
      cardLink.click();
    };

    cardItem.addEventListener('click', handleClick);
    cardItem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cardLink.click();
      }
    });

    // Hide the original link text but keep it functional
    let buttonContainer = cardLink.closest('.button-container');
    if (!buttonContainer) {
      buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';
      cardLink.parentNode.insertBefore(buttonContainer, cardLink);
      buttonContainer.appendChild(cardLink);
    }
    buttonContainer.classList.add('sr-only');

    // Add arrow icon for interactive cards (if enabled for this variant)
    if (shouldAddArrow) {
      appendArrowIcon(mainBody);
    }
  }
  // Type 1: Standard card with no link - no additional interactivity needed
  // No arrow is added for non-interactive cards
}

/**
 * Splits the cardContent cell into cardTag, cards-card-body, and cards-modal-content divs.
 * With headings: tag before first, body first→second, modal second onward.
 * Without headings: first=tag, middle=body, last=modal (if 3+ nodes).
 * @param {HTMLElement} cardItem The card element to append to
 * @param {HTMLElement} contentCell The third cell (cardContent group)
 */
function splitCardContentCell(cardItem, contentCell) {
  const wrapper = contentCell.querySelector('div') || contentCell;
  const nodes = [...wrapper.children];
  const headingIndices = [];
  nodes.forEach((el, i) => {
    if (el.matches?.('h1, h2, h3, h4, h5, h6')) headingIndices.push(i);
  });

  let tagNodes;
  let bodyNodes;
  let modalNodes;

  if (headingIndices.length > 0) {
    const firstHeadingIdx = headingIndices[0];
    const secondHeadingIdx = headingIndices[1] ?? nodes.length;
    tagNodes = firstHeadingIdx > 0 ? nodes.slice(0, firstHeadingIdx) : [];
    bodyNodes = nodes.slice(firstHeadingIdx, secondHeadingIdx);
    modalNodes = secondHeadingIdx < nodes.length ? nodes.slice(secondHeadingIdx) : [];
  } else {
    // No headings: first node = tag, last node = modal (if 3+), middle = body
    if (nodes.length === 0) return;
    if (nodes.length === 1) {
      tagNodes = [];
      bodyNodes = nodes;
      modalNodes = [];
    } else if (nodes.length === 2) {
      tagNodes = [nodes[0]];
      bodyNodes = [nodes[1]];
      modalNodes = [];
    } else {
      tagNodes = [nodes[0]];
      bodyNodes = nodes.slice(1, -1);
      modalNodes = [nodes[nodes.length - 1]];
    }
  }

  if (tagNodes.length > 0) {
    const tagDiv = document.createElement('div');
    tagDiv.className = 'cards-card-tag';
    tagNodes.forEach((n) => tagDiv.appendChild(n));
    cardItem.appendChild(tagDiv);
  }
  if (bodyNodes.length > 0) {
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'cards-card-body';
    bodyNodes.forEach((n) => bodyDiv.appendChild(n));
    cardItem.appendChild(bodyDiv);
  }
  if (modalNodes.length > 0) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'cards-card-body cards-modal-content';
    modalNodes.forEach((n) => modalDiv.appendChild(n));
    cardItem.appendChild(modalDiv);
  }
}

/**
 * Builds a single card DOM from a row with 3 cells (image, cardDecor, cardContent).
 * @param {HTMLElement} row The row element (has 3 child cells)
 * @returns {HTMLElement} The card element
 */
function buildCardFromThreeCells(row) {
  const cardItem = document.createElement('div');
  cardItem.classList.add('cards-card');
  moveInstrumentation(row, cardItem);
  // Consolidate all card-field instrumentation onto this element so UE tree shows one "Card" node
  row.querySelectorAll('*').forEach((el) => moveInstrumentation(el, cardItem));

  const cells = [...row.children];
  if (cells.length < 3) return cardItem;

  // Cell 0: single picture -> cards-card-image (move node to preserve instrumentation)
  const imageCell = cells[0].querySelector('div') || cells[0];
  const picture = imageCell.querySelector?.('picture');
  if (picture) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-card-image';
    imageWrap.appendChild(picture);
    cardItem.appendChild(imageWrap);
  }

  // Cell 1: two pictures -> cards-card-divider, then cards-card-bg-texture
  const decorCell = cells[1].querySelector('div') || cells[1];
  const pictures = [...decorCell.querySelectorAll?.('picture') || []];
  if (pictures.length >= 1) {
    const dividerWrap = document.createElement('div');
    dividerWrap.className = 'cards-card-divider';
    dividerWrap.appendChild(pictures[0]);
    cardItem.appendChild(dividerWrap);
  }
  if (pictures.length >= 2) {
    const textureWrap = document.createElement('div');
    textureWrap.className = 'cards-card-bg-texture';
    textureWrap.appendChild(pictures[1]);
    cardItem.appendChild(textureWrap);
  }

  // Cell 2: cardContent -> split into tag, body, modal
  splitCardContentCell(cardItem, cells[2]);

  return cardItem;
}

/**
 * Identifies and marks semantic elements within a card:
 * - dividerImage: thin horizontal image (cards-card-divider)
 * - backgroundImageTexture: large texture image (cards-card-bg-texture)
 * - cardTag: simple text tag before main content (cards-card-tag)
 * @param {HTMLElement} cardItem The card element
 */
function identifySemanticCardElements(cardItem) {
  const children = [...cardItem.children];

  // Process all cards-card-image elements to identify dividers and textures
  children.forEach((div) => {
    if (!div.classList.contains('cards-card-image')) return;

    const img = div.querySelector('img');
    if (!img) return;

    const width = parseInt(img.getAttribute('width'), 10) || 0;
    const height = parseInt(img.getAttribute('height'), 10) || 0;

    // Divider: thin horizontal image (height < 50px, width much greater than height)
    if (height > 0 && height < 50 && width > height * 3) {
      div.classList.remove('cards-card-image');
      div.classList.add('cards-card-divider');
      return;
    }

    // Texture: large image (both dimensions > 100px)
    if (width > 100 && height > 100) {
      div.classList.remove('cards-card-image');
      div.classList.add('cards-card-bg-texture');
    }
  });

  // Identify cardTag: a simple text body that appears before the main content body
  // The cardTag has just text (p tag) without headings, and the next body has headings
  const bodyDivs = children.filter((div) => div.classList.contains('cards-card-body'));
  if (bodyDivs.length >= 2) {
    const firstBody = bodyDivs[0];
    const secondBody = bodyDivs[1];

    // Check if first body is a simple tag (no headings, just text)
    // and second body has headings (the main content)
    const firstHasHeading = firstBody.querySelector('h1, h2, h3, h4, h5, h6');
    const secondHasHeading = secondBody.querySelector('h1, h2, h3, h4, h5, h6');

    if (!firstHasHeading && secondHasHeading) {
      // First body is the cardTag
      firstBody.classList.remove('cards-card-body');
      firstBody.classList.add('cards-card-tag');
    }
  }
}

// Mayura scrollbar recovery: one global resize listener instead of per-swiper resize/breakpoint
let mayuraScrollbarResizeAttached = false;

function runScrollbarRecoveryForSwiper(swiper, scrollbarContainer) {
  try {
    if (scrollbarContainer) {
      scrollbarContainer.querySelectorAll('.swiper-pagination-handle').forEach((el) => el.remove());
      if (swiper.scrollbar && swiper.scrollbar.dragEl) {
        swiper.scrollbar.dragEl = null;
      }
    }
    if (swiper.scrollbar && typeof swiper.scrollbar.init === 'function') {
      swiper.scrollbar.init();
    }
    if (swiper.scrollbar && typeof swiper.scrollbar.updateSize === 'function') {
      swiper.scrollbar.updateSize();
    }
    swiper.update();
  } catch (_err) {
    // Recovery failed; continue without logging in production
  }
}

function checkAndRecoverMayuraScrollbarForBlock(block, swiper) {
  if (!block || !swiper || !swiper.scrollbar) return;
  const scrollbarEl = block.querySelector('.swiper-scrollbar');
  const handleEl = block.querySelector('.swiper-pagination-handle');
  const hasScrollbar = !!scrollbarEl;
  const hasHandle = !!handleEl;
  const isLocked = scrollbarEl?.classList.contains('swiper-scrollbar-lock');
  const isHidden = scrollbarEl?.style?.display === 'none';

  if (!hasScrollbar) {
    const newScrollbar = document.createElement('div');
    newScrollbar.className = 'swiper-scrollbar swiper-scrollbar-horizontal';
    block.appendChild(newScrollbar);
    runScrollbarRecoveryForSwiper(swiper, null);
    return;
  }

  // Swiper can add swiper-scrollbar-lock + display:none when container had zero size at init
  // (e.g. tab panel hidden). Force-unlock and unhide so recovery can run and handle is visible.
  if (isLocked || isHidden) {
    scrollbarEl.classList.remove('swiper-scrollbar-lock');
    scrollbarEl.style.removeProperty('display');
  }

  if (!hasHandle || isLocked || isHidden) {
    runScrollbarRecoveryForSwiper(swiper, scrollbarEl);
    // Fix slide offset when block is visible (tabbed or not: init may have run in hidden container)
    const tabpanel = block.closest('[role="tabpanel"]');
    const isVisible = !tabpanel || tabpanel.getAttribute('aria-hidden') === 'false';
    if (isVisible && typeof swiper.slideTo === 'function') {
      const expectedSlide = parseInt(block.dataset.startingCard || '0', 10);
      const isMobile = window.innerWidth < 600;
      const targetSlide = isMobile ? 0 : expectedSlide;
      if (swiper.activeIndex !== targetSlide) {
        swiper.slideTo(targetSlide, 0);
      }
    }
  }
}

function globalMayuraScrollbarResizeHandler() {
  requestAnimationFrame(() => {
    const blocks = document.querySelectorAll('.mayura .cards.swiper');
    blocks.forEach((block) => {
      const swiper = block.swiperInstance;
      if (swiper) checkAndRecoverMayuraScrollbarForBlock(block, swiper);
    });
  });
}

export default async function decorate(block) {
  const isDesktop = window.matchMedia('(min-width: 900px)').matches;
  const section = block.closest('.section');
  const wrapper = block.closest('.cards-wrapper') || block.parentElement;
  const isAllAboutCard = block.classList.contains('all-about-card');
  const initialBlockHeight = block.getBoundingClientRect().height;
  const initialWrapperHeight = wrapper?.getBoundingClientRect().height;
  const initialSectionHeight = section?.getBoundingClientRect().height;

  if (isDesktop && isAllAboutCard && section) {
    section.style.minHeight = '1412px';
    if (wrapper) wrapper.style.minHeight = '1412px';
    block.style.minHeight = '1412px';
    block.style.visibility = 'hidden';
  }

  // Prevent temporary collapse while we rebuild the DOM for cards on desktop.
  if (isDesktop && initialBlockHeight > 0) {
    block.style.minHeight = `${initialBlockHeight}px`;
    if (wrapper && initialWrapperHeight) {
      wrapper.style.minHeight = `${initialWrapperHeight}px`;
    }
    if (section?.classList.contains('cards-container') && initialSectionHeight) {
      section.style.minHeight = `${initialSectionHeight}px`;
    }
  }

  const releaseLayoutLock = () => {
    if (!isDesktop) return;
    block.style.minHeight = '';
    if (wrapper) wrapper.style.minHeight = '';
    if (section) section.style.minHeight = '';
  };

  const setRenderedImageDimensions = () => {
    block.querySelectorAll('img').forEach((img) => {
      if (img.hasAttribute('width') && img.hasAttribute('height')) return;
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        img.setAttribute('width', Math.round(rect.width));
        img.setAttribute('height', Math.round(rect.height));
      }
    });
  };

  const getStaticImageDimensions = (img) => {
    if (block.classList.contains('all-about-card')) {
      return { width: 280, height: 350 };
    }
    if (block.classList.contains('important-documents')) {
      return { width: 175, height: 175 };
    }
    if (img.closest('.swiper-slide')) {
      return { width: 232, height: 358 };
    }
    return null;
  };
  // Cache variant checks once (performance optimization)
  const { classList } = block;
  const isImportantDocuments = classList.contains('important-documents');
  const isRelatedSearch = classList.contains('related-search');
  const isExperienceLife = classList.contains('experience-life');
  const isBlogPosts = classList.contains('blog-posts');
  const isEarnRewards = classList.contains('earn-rewards');
  const isJoiningPerks = classList.contains('joining-perks');
  const supportsSemanticElements = classList.contains('key-benefits')
    || isExperienceLife
    || classList.contains('reward-points');
  const isExploreOtherCards = classList.contains('explore-other-cards');

  // Check if this cards block is within the #cscards section (customer service dropdown)
  const isInCsCards = block.closest('#cscards') !== null;

  // First 2 rows = config; rest = card rows (see extractBlockProperties).
  const rows = [...block.children];
  const configRowCount = extractBlockProperties(block);
  const cardRows = rows.slice(configRowCount);

  // Move block-level UE instrumentation from config rows onto the block so the tree shows
  // one "Cards" node (not modal/swiper as separate nodes). Same pattern as accordion: one
  // source element's instrumentation → one target; here config rows → block.
  for (let i = 0; i < configRowCount; i += 1) {
    const configRow = rows[i];
    moveInstrumentation(configRow, block);
    configRow.querySelectorAll('*').forEach((el) => moveInstrumentation(el, block));
  }

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');

  cardRows.forEach((row, rowIndex) => {
    const numCells = row.querySelectorAll(':scope > div').length || row.children.length;
    if (numCells === 3) {
      const cardItem = buildCardFromThreeCells(row);
      cardsContainer.append(cardItem);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        'Cards block: card row has unexpected number of cells (expected 3, got %d). Row index: %d.',
        numCells,
        rowIndex,
      );
    }
  });

  // Identify semantic elements (divider/texture by size, cardTag by heading)
  if (supportsSemanticElements) {
    cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => {
      identifySemanticCardElements(cardItem);
    });
  }

  // Replace images with optimized pictures
  cardsContainer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);

    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if (width && height) {
      optimizedImg.setAttribute('width', width);
      optimizedImg.setAttribute('height', height);
    } else {
      const staticSize = getStaticImageDimensions(img);
      if (staticSize) {
        optimizedImg.setAttribute('width', staticSize.width);
        optimizedImg.setAttribute('height', staticSize.height);
      }
    }

    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(cardsContainer);

  // Get all card elements once and reuse
  const allCards = cardsContainer.querySelectorAll('.cards-card');

  // Add appropriate class to card items
  allCards.forEach((cardItem) => {
    if (isImportantDocuments) {
      cardItem.classList.add('important-documents-card');
    } else if (isBlogPosts) {
      cardItem.classList.add('blog-post-card');
    } else if (!isEarnRewards && !isJoiningPerks && !isAllAboutCard) {
      if (isExploreOtherCards) {
        cardItem.classList.add('explore-other-cards');
      } else {
        cardItem.classList.add('benefit-cards');
      }
    }

    // Setup interactivity for all card types (links, modals)
    // Skip for blog-posts and important-documents - they use wrap-in-link behavior only
    if (!isBlogPosts) {
      // Add arrow icons for key-benefits, experience-life, reward-points variants
      const shouldAddArrow = supportsSemanticElements;
      const modalTheme = block.dataset.modalTheme || '';
      setupCardInteractivity(cardItem, shouldAddArrow, modalTheme, block);
    }
  });

  block.append(cardsContainer);

  // Check if swiper is enabled via data attribute
  const isSwipable = block.dataset.swipable === 'true';
  const isAutoplayEnabled = block.dataset.autoplayEnabled === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);

  if (isSwipable) {
    // Load Swiper library (will skip if already loaded from head.html)
    await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
    await loadScript('/scripts/swiperjs/swiper-bundle.min.js');

    // Wait for Swiper to be available (script may need time to execute)
    const waitForSwiper = () => new Promise((resolve) => {
      if (typeof Swiper !== 'undefined') {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (typeof Swiper !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10);
        // Timeout after 2 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 2000);
      }
    });
    await waitForSwiper();

    // Add Swiper classes
    block.classList.add('swiper');
    cardsContainer.classList.add('swiper-wrapper');
    cardsContainer.classList.remove('grid-cards');
    cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => {
      cardItem.classList.add('swiper-slide');
    });

    // Count total slides
    const slideCount = cardsContainer.querySelectorAll('.cards-card').length;

    // For mobile view (< 600px), always start at first card
    // For larger views, use authored startingCard value
    const isMobileView = window.innerWidth < 600;
    const initialSlideIndex = isMobileView ? 0 : startingCard;

    // Mayura template uses native Swiper scrollbar (draggable handle); others use bullet pagination
    const isMayuraTemplate = document.body.classList.contains('mayura');

    if (isMayuraTemplate) {
      const scrollbarEl = document.createElement('div');
      scrollbarEl.className = 'swiper-scrollbar';
      block.appendChild(scrollbarEl);
    } else {
      const swiperPagination = document.createElement('div');
      swiperPagination.className = 'swiper-pagination';
      block.appendChild(swiperPagination);
    }

    // Build Swiper configuration
    const swiperConfig = {
      slidesPerView: 1.2,
      spaceBetween: 16,
      initialSlide: initialSlideIndex,
      centeredSlides: true, // Will be overridden by breakpoints if all cards fit
      ...(isMayuraTemplate
        ? {
          scrollbar: {
            el: '.swiper-scrollbar',
            dragClass: 'swiper-pagination-handle',
            dragSize: 33,
            draggable: true,
            snapOnRelease: true,
          },
        }
        : {
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: false,
            type: 'bullets',
          },
        }),
    };

    if (isExperienceLife) {
      // For experience-life cards: tighter spacing
      swiperConfig.slidesPerView = 1.15; // ~287px cards at 360px viewport
      swiperConfig.spaceBetween = 16;
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: Math.min(2, slideCount),
          spaceBetween: 20,
          centeredSlides: slideCount > 2, // Disable centering if all cards fit
        },
        900: {
          slidesPerView: Math.min(3, slideCount),
          spaceBetween: 36,
          centeredSlides: slideCount > 3, // Disable centering if all cards fit
        },
      };
      // Add class for CSS centering when fewer than 3 cards
      if (slideCount === 1) {
        block.classList.add('cards-single-slide');
      } else if (slideCount === 2) {
        block.classList.add('cards-two-slides');
      }
    } else if (isJoiningPerks) {
      // For joining perks cards: show edges on both sides on mobile, 3 cards at larger breakpoints
      swiperConfig.loop = false;
      swiperConfig.watchSlidesProgress = true;
      swiperConfig.watchSlidesVisibility = true;
      swiperConfig.slidesPerView = 1.5; // ~198px cards at 360px viewport
      swiperConfig.spaceBetween = 16;
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: 2,
          spaceBetween: 30,
          centeredSlides: slideCount > 2, // Disable centering if all cards fit
        },
        900: {
          slidesPerView: 3,
          spaceBetween: 60,
          centeredSlides: slideCount > 3, // Disable centering if all cards fit
        },
      };
      // Add class for CSS centering when fewer than 3 cards
      if (slideCount === 1) {
        block.classList.add('cards-single-slide');
      } else if (slideCount === 2) {
        block.classList.add('cards-two-slides');
      }
    } else if (isExploreOtherCards || isBlogPosts) {
      // For explore-other-cards: show edges on mobile, 3 cards at larger breakpoints
      swiperConfig.loop = false;
      swiperConfig.watchSlidesProgress = true;
      swiperConfig.watchSlidesVisibility = true;
      swiperConfig.slidesPerView = 1; // Don't show edges of adjacent cards on mobile
      swiperConfig.spaceBetween = 25;
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: 2,
          spaceBetween: 20,
          centeredSlides: slideCount > 2, // Disable centering if all cards fit
        },
        900: {
          slidesPerView: 3,
          spaceBetween: 42,
          centeredSlides: slideCount > 3, // Disable centering if all cards fit
        },
      };
      // Add class for CSS centering when fewer than 3 cards
      if (slideCount === 1) {
        block.classList.add('cards-single-slide');
      } else if (slideCount === 2) {
        block.classList.add('cards-two-slides');
      }
    } else if (isAllAboutCard) {
      // For all-about-card: narrower cards at mobile (~198px)
      swiperConfig.loop = false;
      swiperConfig.watchSlidesProgress = true;
      swiperConfig.watchSlidesVisibility = true;
      swiperConfig.slidesPerView = 1.5; // ~198px cards at 360px viewport
      swiperConfig.spaceBetween = 16;
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: 2,
          spaceBetween: 20,
          centeredSlides: slideCount > 2,
        },
        900: {
          slidesPerView: 3,
          spaceBetween: 42,
          centeredSlides: slideCount > 3,
        },
      };
      // Add class for CSS centering when fewer than 3 cards
      if (slideCount === 1) {
        block.classList.add('cards-single-slide');
      } else if (slideCount === 2) {
        block.classList.add('cards-two-slides');
      }
    } else {
      // For benefit cards: standard breakpoints
      swiperConfig.spaceBetween = 16;
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: Math.min(2, slideCount),
          spaceBetween: 20,
          centeredSlides: slideCount > 2, // Disable centering if all cards fit
        },
        900: {
          slidesPerView: Math.min(3, slideCount),
          spaceBetween: 36,
          centeredSlides: slideCount > 3, // Disable centering if all cards fit
        },
      };
      // Add class for CSS centering when fewer than 3 cards
      if (slideCount === 1) {
        block.classList.add('cards-single-slide');
      } else if (slideCount === 2) {
        block.classList.add('cards-two-slides');
      }
    }

    // Add autoplay configuration if enabled
    if (isAutoplayEnabled) {
      swiperConfig.autoplay = {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      };
      swiperConfig.loop = false;
    }

    // Initialize Swiper if available
    if (typeof Swiper === 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('Swiper library not available, cards will display without slider');
      return;
    }

    // eslint-disable-next-line no-undef
    const swiper = new Swiper(block, swiperConfig);
    window.requestAnimationFrame(() => releaseLayoutLock());
    if (isAllAboutCard) {
      block.style.visibility = '';
    }
    window.requestAnimationFrame(() => setRenderedImageDimensions());

    // Store swiper instance for potential future use
    block.swiperInstance = swiper;

    // Correct slide if init ran in hidden tab (active/realIndex can be wrong)
    const loggedInitialSlideIndex = initialSlideIndex;
    const tryFixSlide = () => {
      const active = swiper.activeIndex;
      const real = swiper.realIndex;
      const mismatch = (active !== loggedInitialSlideIndex) || (real !== loggedInitialSlideIndex);
      if (mismatch && typeof swiper.slideTo === 'function' && loggedInitialSlideIndex >= 0) {
        swiper.slideTo(loggedInitialSlideIndex, 0);
      }
    };
    requestAnimationFrame(() => {
      setTimeout(tryFixSlide, 50);
      setTimeout(tryFixSlide, 350); // Retry after layout (e.g. fragment/tab visible)
    });

    // Recover scrollbar + handle when missing (Mayura; fragments/tabs)
    if (isMayuraTemplate) {
      checkAndRecoverMayuraScrollbarForBlock(block, swiper);
      swiper.on('init', () => checkAndRecoverMayuraScrollbarForBlock(block, swiper));
      if (!mayuraScrollbarResizeAttached) {
        mayuraScrollbarResizeAttached = true;
        window.addEventListener('resize', () => globalMayuraScrollbarResizeHandler());
        // One-time passes after layout settles (fix first tab handle when it inits before others)
        setTimeout(() => globalMayuraScrollbarResizeHandler(), 700);
        setTimeout(() => globalMayuraScrollbarResizeHandler(), 1400);
        // Run recovery after tab switch so newly visible panel gets scrollbar handle
        document.addEventListener('click', (e) => {
          const tab = e.target.closest('.mayura [role="tab"]');
          if (!tab) return;
          const panelId = tab.getAttribute('aria-controls');
          setTimeout(() => globalMayuraScrollbarResizeHandler(), 150);
          setTimeout(() => globalMayuraScrollbarResizeHandler(), 400);
          // Slide to startingCard when tab is selected so the correct card is in the center slot
          setTimeout(() => {
            const panel = panelId ? document.getElementById(panelId) : null;
            const tabBlock = panel?.querySelector('.cards.swiper');
            const target = tabBlock
              ? parseInt(tabBlock.dataset.startingCard || '0', 10) : null;
            if (tabBlock?.swiperInstance && window.innerWidth >= 600 && target != null) {
              tabBlock.swiperInstance.slideTo(target, 0);
            }
          }, 200);
        });
        // Run recovery when a tab panel becomes visible (aria-hidden -> false);
        // handles Travel when block inits in hidden panel and panel is shown later
        const mayuraRoot = document.querySelector('.mayura');
        if (mayuraRoot) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
                const panel = mutation.target;
                if (panel.getAttribute?.('role') === 'tabpanel'
                  && panel.getAttribute('aria-hidden') === 'false') {
                  const visibleBlock = panel.querySelector('.cards.swiper');
                  requestAnimationFrame(() => {
                    setTimeout(() => globalMayuraScrollbarResizeHandler(), 50);
                    setTimeout(() => globalMayuraScrollbarResizeHandler(), 250);
                  });
                  // Slide to startingCard so correct card is in center (initial load or tab switch)
                  if (visibleBlock && window.innerWidth >= 600) {
                    setTimeout(() => {
                      const swiperInst = visibleBlock.swiperInstance;
                      const target = parseInt(visibleBlock.dataset.startingCard || '0', 10);
                      if (swiperInst) {
                        swiperInst.slideTo(target, 0);
                      }
                    }, 200);
                  }
                }
              }
            });
          });
          observer.observe(mayuraRoot, { attributes: true, subtree: true, attributeFilter: ['aria-hidden'] });
        }
      }
      requestAnimationFrame(() => {
        setTimeout(() => checkAndRecoverMayuraScrollbarForBlock(block, swiper), 150);
        setTimeout(() => checkAndRecoverMayuraScrollbarForBlock(block, swiper), 450);
      });
    }
  } else if (
    !isImportantDocuments && !isRelatedSearch
    && !isEarnRewards && !isJoiningPerks && !isInCsCards
  ) {
    // === View All / View Less Toggle (Mobile Only) - Only for benefit cards ===
    const maxVisible = 3;

    const isMobile = () => window.innerWidth <= 768;

    const toggleView = (btn, expand) => {
      // Use allCards instead of re-querying
      allCards.forEach((card, index) => {
        if (index >= maxVisible) {
          card.style.display = expand ? 'flex' : 'none';
        }
      });
      btn.textContent = expand ? 'View Less' : 'View All';
    };

    const setupToggleButton = () => {
      if (allCards.length > maxVisible && isMobile()) {
        // Hide extra cards
        allCards.forEach((card, index) => {
          card.style.display = index >= maxVisible ? 'none' : 'flex';
        });

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'View All';
        toggleBtn.className = 'view-toggle';
        block.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
          const isExpanded = toggleBtn.textContent === 'View Less';
          toggleView(toggleBtn, !isExpanded);
        });
      }
    };

    // Initial setup
    setupToggleButton();

    // Debounced resize handler (performance optimization)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const existingBtn = block.querySelector('.view-toggle');
        if (existingBtn) existingBtn.remove();
        allCards.forEach((card) => { card.style.display = 'flex'; });
        setupToggleButton();
      }, 150); // Debounce resize events
    });
  }

  if (!isSwipable) {
    window.requestAnimationFrame(() => releaseLayoutLock());
    if (isAllAboutCard) {
      block.style.visibility = '';
    }
    window.requestAnimationFrame(() => setRenderedImageDimensions());
  }
}
