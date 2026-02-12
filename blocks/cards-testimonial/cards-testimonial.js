import {
  createOptimizedPicture, loadScript, loadCSS, getMetadata,
} from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function sanitizeText(text) {
  if (!text) return '';
  return (
    String(text)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .trim()
  );
}

function parseReviewDateToISO(dateText) {
  if (!dateText || !String(dateText).trim()) return '';
  const trimmed = String(dateText).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnlyMatch) return dateOnlyMatch[1];
  try {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) { /* ignore */ }
  return '';
}

function formatDateForDisplay(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate).trim())) return isoDate || '';
  try {
    const d = new Date(`${String(isoDate).trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return isoDate; }
}

function generateTestimonialSchema(block) {
  const testimonials = [];
  const cards = block.querySelectorAll('.cards-card');
  cards.forEach((card) => {
    const cardBody = card.querySelector('.cards-card-body');
    if (!cardBody) return;
    let authorName = sanitizeText(card.getAttribute('data-person-name') || '');
    let productName = sanitizeText(card.getAttribute('data-product-name') || 'IDFC FIRST Bank Credit Card');
    let ratingValue = parseInt(card.getAttribute('data-author-rating'), 10) || 0;
    let datePublished = parseReviewDateToISO(card.getAttribute('data-review-date') || '');
    if (!authorName) {
      const authorEl = cardBody.querySelector('.testimonial-person-name') || cardBody.querySelector('h5');
      authorName = sanitizeText(authorEl ? authorEl.textContent : '');
    }
    if (!productName || productName === 'IDFC FIRST Bank Credit Card') {
      const productEl = cardBody.querySelector('.testimonial-product-name u') || cardBody.querySelector('p u');
      productName = sanitizeText(productEl ? productEl.textContent : 'IDFC FIRST Bank Credit Card');
    }
    if (ratingValue <= 0) {
      const starIcons = cardBody.querySelectorAll('[class*="icon-star"]');
      ratingValue = starIcons.length;
    }
    const paragraphs = cardBody.querySelectorAll('p');
    let reviewText = '';
    paragraphs.forEach((p, index) => {
      if (p.classList.contains('testimonial-person-name') || p.classList.contains('testimonial-date')
          || p.classList.contains('testimonial-product-name')) return;
      if (index > 0 && !p.querySelector('u') && !p.querySelector('.icon-inverted-commas')
          && !p.querySelector('[class*="icon-star"]')) {
        reviewText += p.textContent.trim();
      }
    });
    reviewText = sanitizeText(reviewText);
    if (!datePublished) {
      const dateEl = cardBody.querySelector('.testimonial-date') || cardBody.querySelector('h6');
      const dateText = dateEl ? dateEl.textContent : '';
      const dateParts = dateText.split('|');
      const dateString = dateParts.length > 1 ? dateParts[1].trim() : dateText.trim();
      datePublished = parseReviewDateToISO(dateString);
    }
    if (!datePublished) {
      [datePublished] = new Date().toISOString().split('T');
    }
    if (reviewText && authorName && ratingValue > 0) {
      testimonials.push({
        '@type': 'Review',
        reviewBody: reviewText,
        reviewRating: { '@type': 'Rating', ratingValue: ratingValue.toString(), bestRating: '5' },
        author: { '@type': 'Person', name: authorName },
        datePublished,
        itemReviewed: { '@type': 'Product', name: productName },
      });
    }
  });
  if (testimonials.length === 0) return null;
  const totalRating = testimonials.reduce(
    (sum, t) => sum + parseInt(t.reviewRating.ratingValue, 10),
    0,
  );
  const avgRating = (totalRating / testimonials.length).toFixed(1);
  const pageTitle = document.title || 'IDFC FIRST Bank Credit Card';
  const pageDescription = getMetadata('description')
    || getMetadata('og:description')
    || 'Apply for Credit Card at IDFC FIRST Bank with exclusive benefits and rewards.';
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const pageUrl = canonicalLink?.href || getMetadata('og:url') || window.location.href;
  const pageImage = getMetadata('og:image');
  const publishedTime = getMetadata('published-time');
  const modifiedTime = getMetadata('modified-time');
  const category = getMetadata('breadcrumbstitle');
  let brandName = 'IDFC FIRST Bank';
  if (pageTitle.includes('IDFC')) {
    const titleParts = pageTitle.split('|');
    if (titleParts.length > 1) brandName = titleParts[1].trim();
  }
  let schemaProductName = pageTitle;
  if (pageTitle.includes('|')) {
    [schemaProductName] = pageTitle.split('|');
    schemaProductName = schemaProductName.trim();
  }
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: schemaProductName,
    description: pageDescription,
    brand: { '@type': 'Brand', name: brandName },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      ratingCount: testimonials.length.toString(),
      reviewCount: testimonials.length.toString(),
    },
    review: testimonials,
  };
  if (pageUrl) schema.url = pageUrl;
  if (pageImage) schema.image = pageImage;
  if (publishedTime) schema.datePublished = publishedTime;
  if (modifiedTime) schema.dateModified = modifiedTime;
  if (category) schema.category = category;
  return schema;
}

function injectSchema(schema) {
  if (!schema) return;
  document.querySelectorAll(
    'script[type="application/ld+json"][data-schema-type="testimonial"], script[type="application/ld+json"][data-error]',
  ).forEach((script) => script.remove());
  if (window.testimonialSchemaInjected) return;
  try {
    const jsonString = JSON.stringify(schema, null, 2);
    JSON.parse(jsonString);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', 'testimonial');
    script.text = jsonString;
    document.head.appendChild(script);
    window.testimonialSchemaInjected = true;
    setTimeout(() => {
      document.querySelectorAll('script[type="application/ld+json"][data-error]').forEach((s) => s.remove());
    }, 500);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to inject JSON-LD schema:', error);
  }
}

const PROPERTY_FIELDS = ['swipable', 'autoplayEnabled', 'startingCard'];
const DEFAULT_PRODUCT = 'IDFC FIRST Bank Credit Card';

function parsePropertyValue(fieldName, text) {
  const t = String(text).trim();
  if (fieldName === 'swipable' || fieldName === 'autoplayEnabled') {
    return (t === 'true' || t === 'false') ? t : null;
  }
  if (fieldName === 'startingCard') {
    return (t !== '' && !Number.isNaN(Number(t))) ? t : null;
  }
  return null;
}

function extractBlockProperties(block, cardsContainer) {
  const propertyValues = {};
  const itemsToRemove = [];
  const items = [...cardsContainer.querySelectorAll('.cards-card')];
  let cardIndex = 0;
  let propertyIndex = 0;

  while (cardIndex < items.length && propertyIndex < PROPERTY_FIELDS.length) {
    const cardItem = items[cardIndex];
    const fieldName = PROPERTY_FIELDS[propertyIndex];
    const isEmpty = !cardItem.textContent.trim() && !cardItem.querySelector('picture, img');

    if (isEmpty) {
      itemsToRemove.push(cardItem);
      cardIndex += 1;
      propertyIndex += 1;
    } else {
      const paragraphs = cardItem.querySelectorAll('p');
      const hasPicture = cardItem.querySelector('picture');
      const hasHeading = cardItem.querySelector('h1, h2, h3, h4, h5, h6');
      const isTextOnly = paragraphs.length === 1 && !hasPicture && !hasHeading;

      if (isTextOnly) {
        const value = parsePropertyValue(fieldName, paragraphs[0].textContent);
        if (value != null) {
          propertyValues[fieldName] = value;
          itemsToRemove.push(cardItem);
          cardIndex += 1;
          propertyIndex += 1;
        } else {
          propertyIndex += 1;
        }
      } else if (paragraphs.length >= 3 && !hasPicture && !hasHeading) {
        const texts = [...paragraphs].slice(0, 3).map((p) => p.textContent.trim());
        const allValid = PROPERTY_FIELDS.slice(0, 3).every(
          (name, i) => parsePropertyValue(name, texts[i]),
        );
        if (allValid) {
          const [swipableVal, autoplayVal, startingVal] = texts;
          propertyValues.swipable = swipableVal;
          propertyValues.autoplayEnabled = autoplayVal;
          propertyValues.startingCard = startingVal;
          itemsToRemove.push(cardItem);
          cardIndex += 1;
          propertyIndex = PROPERTY_FIELDS.length;
        }
        break;
      } else {
        break;
      }
    }
  }

  Object.keys(propertyValues).forEach((key) => {
    block.dataset[key] = propertyValues[key];
  });
  itemsToRemove.forEach((cardItem) => cardItem.remove());
}

function createQuoteIconElement() {
  const p = document.createElement('p');
  const span = document.createElement('span');
  span.className = 'icon icon-inverted-commas';
  const img = document.createElement('img');
  img.setAttribute('data-icon-name', 'inverted-commas');
  img.src = '/icons/inverted-commas.svg';
  img.alt = '';
  img.loading = 'lazy';
  img.width = 18;
  img.height = 15;
  span.appendChild(img);
  p.appendChild(span);
  return p;
}

function createStarRatingElement(rating, formattedDate = '') {
  const p = document.createElement('p');
  const count = Math.min(5, Math.max(0, parseInt(Number(rating), 10) || 0));
  for (let i = 0; i < count; i += 1) {
    const span = document.createElement('span');
    span.className = 'icon icon-star icon-star-yellow';
    const img = document.createElement('img');
    img.setAttribute('data-icon-name', 'star-yellow');
    img.src = '/icons/star-yellow.svg';
    img.alt = '';
    img.loading = 'lazy';
    img.width = 12;
    img.height = 11;
    span.appendChild(img);
    p.appendChild(span);
  }
  if (formattedDate) {
    p.appendChild(document.createTextNode(` | ${formattedDate}`));
  }
  return p;
}

const looksLikeQuoteColumn = (text) => {
  const t = String(text).trim().toLowerCase();
  return t === '' || t === 'inverted-commas' || t === 'none';
};

const STRUCTURED_LAYOUTS = [
  {
    length: 3,
    hasContent: (d) => {
      const hasReview = d[1] && d[1].textContent.trim().length > 0;
      const hasDetails = d[2] && d[2].querySelectorAll('p').length >= 4;
      return hasReview || hasDetails;
    },
    quoteIdx: 0,
    reviewIdx: 1,
    quotedetailsIdx: 2,
  },
  {
    length: 7,
    hasContent: (d) => d[1].textContent.trim() || d[2].textContent.trim()
      || d[3].textContent.trim(),
    quoteIdx: 1,
    reviewIdx: 2,
    personIdx: 3,
    productIdx: 4,
    ratingIdx: 5,
    dateIdx: 6,
  },
  {
    length: 6,
    hasContent: (d) => d[0].textContent.trim() || d[1].textContent.trim()
      || d[2].textContent.trim(),
    quoteIdx: 0,
    reviewIdx: 1,
    personIdx: 2,
    productIdx: 3,
    ratingIdx: 4,
    dateIdx: 5,
  },
  {
    length: 5,
    hasContent: (d) => !looksLikeQuoteColumn(d[0].textContent)
      && (d[0].textContent.trim() || d[1].textContent.trim()),
    quoteVal: 'none',
    reviewIdx: 0,
    personIdx: 1,
    productIdx: 2,
    ratingIdx: 3,
    dateIdx: 4,
  },
  {
    length: 5,
    hasContent: (d) => looksLikeQuoteColumn(d[0].textContent)
      && (d[1].textContent.trim() || d[2].textContent.trim()),
    quoteIdx: 0,
    reviewIdx: null,
    personIdx: 1,
    productIdx: 2,
    ratingIdx: 3,
    dateIdx: 4,
  },
];

function applyLegacyNormalization(cardItem, mainBody) {
  if (!mainBody.querySelector('.icon-inverted-commas')) {
    cardItem.setAttribute('data-quote-icon', 'none');
  }
  const authorEl = mainBody.querySelector('h5');
  if (authorEl) {
    const name = sanitizeText(authorEl.textContent);
    const p = document.createElement('p');
    p.className = 'testimonial-person-name';
    p.textContent = name;
    authorEl.replaceWith(p);
    cardItem.setAttribute('data-person-name', name);
  }
  const dateEl = mainBody.querySelector('h6');
  if (dateEl) {
    const dt = sanitizeText(dateEl.textContent);
    const p = document.createElement('p');
    p.className = 'testimonial-date';
    p.textContent = dt;
    dateEl.replaceWith(p);
    cardItem.setAttribute('data-review-date', dt);
  }
  const productEl = mainBody.querySelector('p u');
  if (productEl) {
    const name = sanitizeText(productEl.textContent);
    const parentP = productEl.closest('p');
    if (parentP && !parentP.classList.contains('testimonial-product-name')) {
      parentP.classList.add('testimonial-product-name');
    }
    cardItem.setAttribute('data-product-name', name);
  }
  const starIcons = mainBody.querySelectorAll('[class*="icon-star"]');
  if (starIcons.length > 0) {
    cardItem.setAttribute('data-author-rating', String(starIcons.length));
  }
}

function normalizeTestimonialCard(cardItem) {
  const bodyDivs = [...cardItem.querySelectorAll('.cards-card-body')];
  if (bodyDivs.length === 0) return;

  const mainBody = bodyDivs[0];
  const layout = STRUCTURED_LAYOUTS.find(
    (l) => bodyDivs.length === l.length && l.hasContent(bodyDivs),
  );

  let quoteIconVal;

  if (!layout) {
    applyLegacyNormalization(cardItem, mainBody);
    return;
  }

  if (layout.quoteVal !== undefined) {
    quoteIconVal = layout.quoteVal;
  } else {
    quoteIconVal = bodyDivs[layout.quoteIdx].textContent.trim().toLowerCase();
  }
  const reviewHtml = layout.reviewIdx != null ? bodyDivs[layout.reviewIdx].innerHTML : '';
  let personName;
  let productName;
  let ratingRaw;
  let dateText;
  if (layout.quotedetailsIdx !== undefined) {
    const detailsBody = bodyDivs[layout.quotedetailsIdx];
    const detailsParas = [...detailsBody.querySelectorAll('p')];
    personName = sanitizeText(detailsParas[0]?.textContent ?? '');
    productName = sanitizeText(detailsParas[1]?.textContent ?? '') || DEFAULT_PRODUCT;
    ratingRaw = detailsParas[2]?.textContent?.trim() ?? '';
    dateText = detailsParas[3]?.textContent?.trim() ?? '';
  } else {
    personName = sanitizeText(bodyDivs[layout.personIdx].textContent);
    productName = sanitizeText(bodyDivs[layout.productIdx].textContent) || DEFAULT_PRODUCT;
    ratingRaw = bodyDivs[layout.ratingIdx].textContent.trim();
    dateText = bodyDivs[layout.dateIdx].textContent.trim();
  }

  const quoteIcon = (quoteIconVal === 'inverted-commas') ? 'inverted-commas' : 'none';
  const ratingNum = parseInt(ratingRaw, 10);
  const authorRating = (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) ? 5 : ratingNum;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText.trim())
    ? dateText.trim() : parseReviewDateToISO(dateText) || dateText;
  const formattedDate = formatDateForDisplay(isoDate) || dateText;

  const newBody = document.createElement('div');
  newBody.className = 'cards-card-body';
  if (quoteIcon === 'inverted-commas') {
    newBody.appendChild(createQuoteIconElement());
  }
  cardItem.setAttribute('data-quote-icon', quoteIcon);
  if (reviewHtml && reviewHtml.trim()) {
    const reviewWrapper = document.createElement('div');
    reviewWrapper.innerHTML = reviewHtml;
    newBody.append(...reviewWrapper.childNodes);
  }
  const pPerson = document.createElement('p');
  pPerson.className = 'testimonial-person-name';
  pPerson.textContent = personName;
  newBody.appendChild(pPerson);
  const pProduct = document.createElement('p');
  pProduct.className = 'testimonial-product-name';
  const u = document.createElement('u');
  u.textContent = productName;
  pProduct.appendChild(u);
  newBody.appendChild(pProduct);
  newBody.appendChild(createStarRatingElement(authorRating, formattedDate));
  cardItem.setAttribute('data-person-name', personName);
  cardItem.setAttribute('data-product-name', productName);
  cardItem.setAttribute('data-author-rating', String(authorRating));
  cardItem.setAttribute('data-review-date', isoDate);

  bodyDivs.forEach((div) => div.remove());
  const imageDiv = cardItem.querySelector('.cards-card-image');
  if (imageDiv) {
    cardItem.insertBefore(newBody, imageDiv.nextSibling);
  } else {
    cardItem.appendChild(newBody);
  }
}

export default async function decorate(block) {
  block.classList.add('cards-testimonial', 'testimonial-card');

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('grid-cards');
  const rows = [...block.children];

  rows.forEach((row) => {
    const cardItem = document.createElement('div');
    cardItem.classList.add('cards-card');
    moveInstrumentation(row, cardItem);
    while (row.firstElementChild) cardItem.append(row.firstElementChild);
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
    divsToRemove.forEach((div) => div.remove());
    cardsContainer.append(cardItem);
  });

  cardsContainer.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const optimizedImg = optimizedPic.querySelector('img');
    moveInstrumentation(img, optimizedImg);
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if (width && height) {
      optimizedImg.setAttribute('width', width);
      optimizedImg.setAttribute('height', height);
    } else if (img.closest('.swiper-slide')) {
      optimizedImg.setAttribute('width', '232');
      optimizedImg.setAttribute('height', '358');
    }
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(cardsContainer);
  extractBlockProperties(block, cardsContainer);

  const section = block.closest('.section');
  const blockContent = block.closest('.block-content');
  [blockContent, section].filter(Boolean).forEach((el) => {
    const { dataset } = el;
    if (block.dataset.swipable === undefined && dataset.swipable !== undefined) {
      block.dataset.swipable = dataset.swipable;
    }
    if (block.dataset.autoplayEnabled === undefined && dataset.autoplayEnabled !== undefined) {
      block.dataset.autoplayEnabled = dataset.autoplayEnabled;
    }
    if (block.dataset.startingCard === undefined && dataset.startingCard !== undefined) {
      block.dataset.startingCard = dataset.startingCard;
    }
  });

  cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => normalizeTestimonialCard(cardItem));
  block.append(cardsContainer);

  const isSwipable = block.dataset.swipable === 'true';
  const isAutoplayEnabled = block.dataset.autoplayEnabled === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);

  if (!isSwipable) {
    window.requestAnimationFrame(() => {
      block.querySelectorAll('img').forEach((img) => {
        if (img.hasAttribute('width') && img.hasAttribute('height')) return;
        const rect = img.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          img.setAttribute('width', Math.round(rect.width));
          img.setAttribute('height', Math.round(rect.height));
        }
      });
    });
    injectSchema(generateTestimonialSchema(block));
    return;
  }

  await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
  await loadScript('/scripts/swiperjs/swiper-bundle.min.js');

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
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    }
  });
  await waitForSwiper();

  if (typeof Swiper === 'undefined') {
    injectSchema(generateTestimonialSchema(block));
    return;
  }

  block.classList.add('swiper');
  cardsContainer.classList.add('swiper-wrapper');
  cardsContainer.classList.remove('grid-cards');
  cardsContainer.querySelectorAll('.cards-card').forEach((cardItem) => cardItem.classList.add('swiper-slide'));

  const swiperPagination = document.createElement('div');
  swiperPagination.className = 'swiper-pagination';
  block.appendChild(swiperPagination);

  const isMobileView = window.innerWidth < 600;
  const initialSlideIndex = isMobileView ? 0 : startingCard;

  const swiperConfig = {
    loop: false,
    watchSlidesProgress: true,
    watchSlidesVisibility: true,
    slidesPerView: 1.3,
    spaceBetween: 16,
    centeredSlides: true,
    initialSlide: initialSlideIndex,
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true,
      dynamicBullets: false,
    },
    breakpoints: {
      600: { slidesPerView: 1.5, spaceBetween: 20, centeredSlides: true },
      900: { slidesPerView: 3, spaceBetween: 36, centeredSlides: true },
    },
  };
  if (isAutoplayEnabled) {
    swiperConfig.autoplay = {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    };
  }

  // eslint-disable-next-line no-undef
  const swiper = new Swiper(block, swiperConfig);
  block.swiperInstance = swiper;

  let updateScheduled = false;
  const updateStarIcons = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateScheduled = false;
      const slides = block.querySelectorAll('.swiper-slide');
      const activeSlide = block.querySelector('.swiper-slide-active');
      slides.forEach((slide) => {
        const isActive = slide === activeSlide;
        const iconSrc = isActive ? '/icons/star-yellow.svg' : '/icons/star-white.svg';
        const iconName = isActive ? 'star-yellow' : 'star-white';
        slide.querySelectorAll('[class*="icon-star"] img').forEach((img) => {
          const currentSrc = img.getAttribute('src');
          if (currentSrc && currentSrc.includes('star')) {
            img.setAttribute('src', iconSrc);
            img.setAttribute('data-icon-name', iconName);
          }
        });
      });
    });
  };
  updateStarIcons();
  swiper.on('slideChange', updateStarIcons);
  swiper.on('slideChangeTransitionEnd', updateStarIcons);

  injectSchema(generateTestimonialSchema(block));
}
