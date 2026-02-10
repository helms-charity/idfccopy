import {
  createOptimizedPicture, loadScript, loadCSS, getMetadata,
} from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createModal } from '../modal/modal.js';

/**
 * Sanitizes text for JSON-LD by removing/replacing problematic characters
 * @param {string} text The text to sanitize
 * @returns {string} Sanitized text
 */

/**
 * Extracts block-level properties from placeholder cards and sets them as data attributes
 * @param {HTMLElement} block The block element
 * @param {HTMLElement} cardsContainer The container holding card items
 */
function extractBlockProperties(block, cardsContainer) {
  const propertyFields = [
    'modalTheme',
    'modalDialogBackgroundImageTexture',
    'modalPageBackgroundImage',
    'modalPageDecorationImage',
    'modalCtaContent',
    'swipable',
    'autoplayEnabled',
    'startingCard',
  ];
  const propertyValues = {};
  const itemsToRemove = [];

  // Check first few card elements for property values
  const items = [...cardsContainer.querySelectorAll('.cards-card')];
  let cardIndex = 0;
  let propertyIndex = 0;

  // Process card elements, matching them to expected property fields
  while (cardIndex < items.length && propertyIndex < propertyFields.length) {
    const cardItem = items[cardIndex];
    const fieldName = propertyFields[propertyIndex];

    // Check if card is completely empty (no content or only whitespace)
    const isEmpty = !cardItem.textContent.trim() && !cardItem.querySelector('picture, img');

    if (isEmpty) {
      // Empty card - field value not defined, just remove it and move to next field
      itemsToRemove.push(cardItem);
      cardIndex += 1;
      propertyIndex += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // Check card content structure
    const paragraphs = cardItem.querySelectorAll('p');
    // Only consider picture elements for authored images (not icon imgs)
    const pictureEl = cardItem.querySelector('picture');
    const hasAuthoredImage = !!pictureEl;
    const hasHeading = cardItem.querySelector('h1, h2, h3, h4, h5, h6');

    // Check if this is an image-only card (for image reference fields)
    // Must have a picture element (not just any img, which could be an icon)
    const isImageOnly = hasAuthoredImage && !hasHeading && paragraphs.length <= 1
      && (!paragraphs.length || paragraphs[0].querySelector('picture'));

    // Check if this is a text-only card (for string/boolean/number fields)
    const isTextOnly = paragraphs.length === 1 && !hasAuthoredImage && !hasHeading;

    // Handle image reference fields
    const imageReferenceFields = [
      'modalDialogBackgroundImageTexture',
      'modalPageBackgroundImage',
      'modalPageDecorationImage',
    ];
    if (imageReferenceFields.includes(fieldName)) {
      if (isImageOnly && pictureEl) {
        // Extract image src from picture element
        const img = pictureEl.querySelector('img');
        if (img && img.src) {
          propertyValues[fieldName] = img.src;
          itemsToRemove.push(cardItem);
          cardIndex += 1;
          propertyIndex += 1;
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      // Not an authored image or no src - skip to next field, stay on same card
      propertyIndex += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // Handle richtext fields (modalCtaContent)
    if (fieldName === 'modalCtaContent') {
      // Check if card contains button-container or links (typical CTA content)
      // BUT also verify it's not an actual card structure with image div
      const hasButtonContainer = cardItem.querySelector('.button-container');
      const hasLinks = cardItem.querySelector('a');
      const hasCardImage = cardItem.querySelector('.cards-card-image');
      const hasCardBody = cardItem.querySelector('.cards-card-body');

      // Only extract as modalCtaContent if it has buttons/links but is NOT a full card structure
      const isPlaceholderCta = (hasButtonContainer || hasLinks) && !hasCardImage;

      // Additional check: if it has both image and body, it's definitely a real card
      const isRealCard = hasCardImage && hasCardBody;

      if (isPlaceholderCta && !isRealCard) {
        // Extract the entire innerHTML as richtext content
        propertyValues[fieldName] = cardItem.innerHTML;
        itemsToRemove.push(cardItem);
        cardIndex += 1;
        propertyIndex += 1;
        // eslint-disable-next-line no-continue
        continue;
      }
      // Not richtext content or is a real card - skip to next field, stay on same card
      propertyIndex += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // Handle text-based fields
    if (!isTextOnly) {
      // This is a real card (has multiple elements) - stop processing
      break;
    }

    const text = paragraphs[0].textContent.trim();

    // Validate value based on expected field type:
    // - modalTheme: CSS class name string (not boolean, not number)
    // - swipable, autoplayEnabled: boolean ("true" or "false")
    // - startingCard: number
    const isBoolean = text === 'true' || text === 'false';
    const isNumber = !Number.isNaN(Number(text)) && text !== '';

    let isValidValue = false;
    if (fieldName === 'modalTheme') {
      // modalTheme must be a CSS class name (string, not boolean, not pure number)
      isValidValue = !isBoolean && !isNumber && text.length > 0;
    } else if (fieldName === 'swipable' || fieldName === 'autoplayEnabled') {
      // Must be boolean
      isValidValue = isBoolean;
    } else if (fieldName === 'startingCard') {
      // Must be a number
      isValidValue = isNumber;
    }

    if (isValidValue) {
      // Value matches expected type - extract it
      propertyValues[fieldName] = text;
      itemsToRemove.push(cardItem);
      cardIndex += 1;
      propertyIndex += 1;
    } else {
      // Value doesn't match expected type for this field
      // This card might be for a later field - skip to next field but stay on same card
      propertyIndex += 1;
    }
  }

  // Set data attributes on block (dataset automatically handles kebab-case conversion)
  Object.keys(propertyValues).forEach((key) => {
    block.dataset[key] = propertyValues[key];
  });

  // Remove placeholder items
  itemsToRemove.forEach((cardItem) => cardItem.remove());
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
    const buttonContainer = cardLink.closest('.button-container');
    if (buttonContainer) {
      buttonContainer.classList.add('sr-only');
    }

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
    const buttonContainer = cardLink.closest('.button-container');
    if (buttonContainer) {
      buttonContainer.classList.add('sr-only');
    }

    // Add arrow icon for interactive cards (if enabled for this variant)
    if (shouldAddArrow) {
      appendArrowIcon(mainBody);
    }
  }
  // Type 1: Standard card with no link - no additional interactivity needed
  // No arrow is added for non-interactive cards
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

  // Build container structure and collect card elements in one pass
  // Use div structure for all cards (unified approach, simpler and more maintainable)
  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');
  const rows = [...block.children];

  rows.forEach((row) => {
    const cardItem = document.createElement('div');
    cardItem.classList.add('cards-card');
    moveInstrumentation(row, cardItem);
    while (row.firstElementChild) cardItem.append(row.firstElementChild);

    // Process children in a single pass
    const divsToRemove = [];
    [...cardItem.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else if (div.children.length > 0 || div.textContent.trim().length > 0) {
        div.className = 'cards-card-body';
      } else {
        divsToRemove.push(div);
      }
    });
    // Remove empty divs after iteration (avoid modifying during iteration)
    divsToRemove.forEach((div) => div.remove());

    cardsContainer.append(cardItem);
  });

  // Identify semantic elements if needed (before image optimization)
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

  // Append container to block (use replaceChildren for better performance)
  cardsContainer.classList.add('grid-cards');
  block.replaceChildren(cardsContainer);

  // Extract block properties from placeholder cards
  extractBlockProperties(block, cardsContainer);

  // Get all card elements once and reuse
  const allCards = cardsContainer.querySelectorAll('.cards-card');

  // Add appropriate class to card items
  allCards.forEach((cardItem) => {
    if (isImportantDocuments) {
      cardItem.classList.add('important-documents-card');

      // Make entire card clickable - wrap card content in link
      const link = cardItem.querySelector('.cards-card-body a');
      if (link && link.href) {
        const linkUrl = link.href;
        const linkTitle = link.getAttribute('title') || link.textContent.trim();
        const imageDiv = cardItem.querySelector('.cards-card-image');
        const bodyDiv = cardItem.querySelector('.cards-card-body');

        // Create new link wrapper
        const cardLink = document.createElement('a');
        cardLink.href = linkUrl;
        cardLink.title = linkTitle;
        cardLink.className = 'important-documents-card-link';

        // Move elements directly instead of cloning (performance optimization)
        if (imageDiv) {
          // Remove from parent and append to link
          const imageDivClone = imageDiv.cloneNode(true);
          cardLink.appendChild(imageDivClone);
        }

        // Move body content into link, but replace nested link with just text
        if (bodyDiv) {
          const bodyDivClone = bodyDiv.cloneNode(true);
          const nestedLink = bodyDivClone.querySelector('a');
          if (nestedLink) {
            // Replace link with its text content (use textContent for better performance)
            const strong = document.createElement('strong');
            strong.textContent = nestedLink.textContent;
            nestedLink.replaceWith(strong);
          }
          cardLink.appendChild(bodyDivClone);
        }

        // Clear and append link wrapper
        cardItem.textContent = '';
        cardItem.appendChild(cardLink);
      }
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
    // Skip for blog-posts and important-documents - they use standard link behavior
    if (!isBlogPosts && !isImportantDocuments) {
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
