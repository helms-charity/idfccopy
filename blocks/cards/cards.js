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
function sanitizeText(text) {
  if (!text) return '';
  // Remove control characters and normalize whitespace
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      // Replace smart quotes with regular quotes
      .replace(/[\u2018\u2019]/g, "'") // Single smart quotes to apostrophe
      .replace(/[\u201C\u201D]/g, '"') // Double smart quotes to regular quotes
      // Replace other problematic characters
      .replace(/[\u2013\u2014]/g, '-') // En-dash and em-dash to hyphen
      .replace(/\u2026/g, '...') // Ellipsis
      .trim()
  );
}

/**
 * Generates JSON-LD schema for testimonial cards
 * @param {HTMLElement} block The testimonial cards block
 * @returns {Object} JSON-LD schema object
 */
function generateTestimonialSchema(block) {
  const testimonials = [];
  const cards = block.querySelectorAll('.cards-card');

  cards.forEach((card) => {
    const cardBody = card.querySelector('.cards-card-body');
    if (!cardBody) return;

    // Extract review text (skip the first paragraph with icon)
    const paragraphs = cardBody.querySelectorAll('p');
    let reviewText = '';
    paragraphs.forEach((p, index) => {
      // Skip first paragraph (icon) and product name paragraph (has <u> tag)
      if (index > 0 && !p.querySelector('u')) {
        reviewText += p.textContent.trim();
      }
    });
    reviewText = sanitizeText(reviewText);

    // Extract author name from h5
    const authorElement = cardBody.querySelector('h5');
    const authorName = sanitizeText(authorElement ? authorElement.textContent : '');

    // Extract product name from underlined paragraph
    const productElement = cardBody.querySelector('p u');
    const productName = sanitizeText(
      productElement ? productElement.textContent : 'IDFC FIRST Bank Credit Card',
    );

    // Extract rating from star icons count
    const starIcons = cardBody.querySelectorAll('[class*="icon-star"]');
    const ratingValue = starIcons.length;

    // Extract date from h6
    const dateElement = cardBody.querySelector('h6');
    let datePublished = '';
    if (dateElement) {
      const dateText = sanitizeText(dateElement.textContent);
      // Extract date after the pipe symbol
      const dateParts = dateText.split('|');
      if (dateParts.length > 1) {
        const dateString = dateParts[1].trim();
        // Convert "March 26, 2025" to ISO format "2025-03-26"
        try {
          const parsedDate = new Date(dateString);
          if (!Number.isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
            [datePublished] = parsedDate.toISOString().split('T');
          }
        } catch (e) {
          // Silently fail, will use fallback below
        }
      }
    }

    // Fallback to current date if no valid date found
    if (!datePublished) {
      [datePublished] = new Date().toISOString().split('T');
    }

    // Only add testimonial if we have the required fields
    if (reviewText && authorName && ratingValue > 0) {
      testimonials.push({
        '@type': 'Review',
        reviewBody: reviewText,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: ratingValue.toString(),
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: authorName,
        },
        datePublished,
        itemReviewed: {
          '@type': 'Product',
          name: productName,
        },
      });
    }
  });

  // Don't generate schema if no valid testimonials found
  if (testimonials.length === 0) {
    return null;
  }

  // Create aggregate rating
  const totalRating = testimonials.reduce(
    (sum, t) => sum + parseInt(t.reviewRating.ratingValue, 10),
    0,
  );
  const avgRating = (totalRating / testimonials.length).toFixed(1);

  // Get dynamic metadata from page
  const pageTitle = document.title || 'IDFC FIRST Bank Credit Card';
  const pageDescription = getMetadata('description')
    || getMetadata('og:description')
    || 'Apply for Credit Card at IDFC FIRST Bank with exclusive benefits and rewards.';

  // Get canonical URL (with fallbacks)
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const pageUrl = canonicalLink?.href || getMetadata('og:url') || window.location.href;

  // Get product image from Open Graph metadata
  const pageImage = getMetadata('og:image');

  // Get published and modified dates
  const publishedTime = getMetadata('published-time');
  const modifiedTime = getMetadata('modified-time');

  // Get category from breadcrumbs title
  const category = getMetadata('breadcrumbstitle');

  // Extract brand name from title or use default
  let brandName = 'IDFC FIRST Bank';
  if (pageTitle.includes('IDFC')) {
    const titleParts = pageTitle.split('|');
    if (titleParts.length > 1) {
      brandName = titleParts[1].trim();
    }
  }

  // Get product name from title (remove brand suffix if present)
  let productName = pageTitle;
  if (pageTitle.includes('|')) {
    [productName] = pageTitle.split('|');
    productName = productName.trim();
  }

  // Build Product schema with reviews
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: pageDescription,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      ratingCount: testimonials.length.toString(),
      reviewCount: testimonials.length.toString(),
    },
    review: testimonials,
  };

  // Add optional fields if available
  if (pageUrl) {
    schema.url = pageUrl;
  }

  if (pageImage) {
    schema.image = pageImage;
  }

  if (publishedTime) {
    schema.datePublished = publishedTime;
  }

  if (modifiedTime) {
    schema.dateModified = modifiedTime;
  }

  if (category) {
    schema.category = category;
  }

  return schema;
}

/**
 * Injects JSON-LD schema into the document head
 * @param {Object} schema The schema object to inject
 */
function injectSchema(schema) {
  // Don't inject if schema is null or empty
  if (!schema) {
    return;
  }

  // Remove existing testimonial schemas and any with errors
  const existingSchemas = document.querySelectorAll(
    'script[type="application/ld+json"][data-schema-type="testimonial"], script[type="application/ld+json"][data-error]',
  );
  existingSchemas.forEach((script) => script.remove());

  // Use a global flag to ensure we only inject once per page
  if (window.testimonialSchemaInjected) {
    return;
  }

  try {
    // Stringify the schema with pretty printing for readability
    const jsonString = JSON.stringify(schema, null, 2);

    // Validate by parsing it back (this will throw if invalid)
    JSON.parse(jsonString);

    // Create script element with content already set
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', 'testimonial');
    script.text = jsonString; // Set content before appending

    // Append to head immediately
    document.head.appendChild(script);

    // Mark as injected globally to prevent duplicates
    window.testimonialSchemaInjected = true;

    // Clean up any error scripts after a brief delay
    setTimeout(() => {
      const errorScripts = document.querySelectorAll('script[type="application/ld+json"][data-error]');
      errorScripts.forEach((errScript) => errScript.remove());
    }, 500);
  } catch (error) {
    // Silently fail - don't break the page if schema generation fails
    // eslint-disable-next-line no-console
    console.error('Failed to inject JSON-LD schema:', error);
  }
}

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
  const isTestimonial = classList.contains('testimonial-card');
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
    } else if (!isTestimonial && !isEarnRewards && !isJoiningPerks && !isAllAboutCard) {
      if (isExploreOtherCards) {
        cardItem.classList.add('explore-other-cards');
      } else {
        cardItem.classList.add('benefit-cards');
      }
    }

    // Setup interactivity for all card types (links, modals)
    // Skip for blog-posts - uses standard link behavior
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

    // Add pagination
    const swiperPagination = document.createElement('div');
    swiperPagination.className = 'swiper-pagination';
    block.appendChild(swiperPagination);

    // Count total slides
    const slideCount = cardsContainer.querySelectorAll('.cards-card').length;

    // For mobile view (< 600px), always start at first card
    // For larger views, use authored startingCard value
    const isMobileView = window.innerWidth < 600;
    const initialSlideIndex = isMobileView ? 0 : startingCard;

    // Build Swiper configuration
    const swiperConfig = {
      slidesPerView: 1.2,
      spaceBetween: 16,
      initialSlide: initialSlideIndex,
      centeredSlides: true, // Will be overridden by breakpoints if all cards fit
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: false,
        type: 'bullets',
      },
    };

    // Configure breakpoints based on card type
    if (isTestimonial) {
      // For testimonial cards: show edges on both sides on mobile, 3 cards at larger breakpoints
      swiperConfig.loop = false;
      swiperConfig.watchSlidesProgress = true;
      swiperConfig.watchSlidesVisibility = true;
      swiperConfig.slidesPerView = 1.3; // Show more edges of cards on both sides when centered
      swiperConfig.spaceBetween = 16;
      swiperConfig.centeredSlides = true; // Keep centered to show edges on both sides
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: 1.5,
          spaceBetween: 20,
          centeredSlides: true,
        },
        900: {
          slidesPerView: 3,
          spaceBetween: 36,
          centeredSlides: true,
        },
      };
    } else if (isExperienceLife) {
      // For experience-life cards: tighter spacing
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
      swiperConfig.slidesPerView = 1.2; // Show edges of adjacent cards on mobile
      swiperConfig.spaceBetween = 30;
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
    } else if (isExploreOtherCards) {
      // For explore-other-cards: show edges on mobile, 3 cards at larger breakpoints
      swiperConfig.loop = false;
      swiperConfig.watchSlidesProgress = true;
      swiperConfig.watchSlidesVisibility = true;
      swiperConfig.slidesPerView = 1.2; // Show edges of adjacent cards on mobile
      swiperConfig.spaceBetween = 16;
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

    // For testimonial cards, update star icons on active slide
    if (isTestimonial) {
      let updateScheduled = false;

      const updateStarIcons = () => {
        // Debounce multiple rapid calls (both events may fire close together)
        if (updateScheduled) return;
        updateScheduled = true;

        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          updateScheduled = false;

          // Get all slides once
          const slides = block.querySelectorAll('.swiper-slide');
          const activeSlide = block.querySelector('.swiper-slide-active');

          // Process slides in a single pass
          slides.forEach((slide) => {
            const isActive = slide === activeSlide;
            const starIcons = slide.querySelectorAll('[class*="icon-star"] img');
            const iconSrc = isActive ? '/icons/star-yellow.svg' : '/icons/star-white.svg';
            const iconName = isActive ? 'star-yellow' : 'star-white';

            starIcons.forEach((img) => {
              const currentSrc = img.getAttribute('src');
              if (currentSrc && currentSrc.includes('star')) {
                img.setAttribute('src', iconSrc);
                img.setAttribute('data-icon-name', iconName);
              }
            });
          });
        });
      };

      // Update on initial load
      updateStarIcons();

      // Listen to both events: slideChange (swipe) and slideChangeTransitionEnd (dot clicks)
      // Debouncing prevents redundant updates when both fire
      swiper.on('slideChange', updateStarIcons);
      swiper.on('slideChangeTransitionEnd', updateStarIcons);
    }
  } else if (
    !isTestimonial && !isImportantDocuments && !isRelatedSearch
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

  // Generate and inject JSON-LD schema for ALL testimonial cards (with or without swiper)
  // This runs at the end after all DOM manipulation is complete
  if (isTestimonial) {
    const schema = generateTestimonialSchema(block);
    injectSchema(schema);
  }
}
