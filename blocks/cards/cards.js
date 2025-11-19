import { createOptimizedPicture, loadScript, loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Extracts block-level properties from placeholder cards and sets them as data attributes
 * @param {HTMLElement} block The block element
 * @param {HTMLElement} ul The ul containing card items
 */
function extractBlockProperties(block, ul) {
  const propertyFields = ['swipable', 'startingCard'];
  const propertyValues = {};
  const itemsToRemove = [];

  // Check first few li elements for property values
  const items = ul.querySelectorAll('li');
  let propertyIndex = 0;

  // Use for...of to allow early exit when we hit a real card
  // eslint-disable-next-line no-restricted-syntax
  for (const li of items) {
    // Check if li is completely empty (no content or only whitespace)
    const isEmpty = !li.textContent.trim() && !li.querySelector('picture, img');

    if (isEmpty && propertyIndex < propertyFields.length) {
      // Empty li - field value not defined, just remove it and move to next field
      itemsToRemove.push(li);
      propertyIndex += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    // Check if this li only contains a single text value (boolean or number)
    const paragraphs = li.querySelectorAll('p');
    const hasImage = li.querySelector('picture, img');
    const hasHeading = li.querySelector('h1, h2, h3, h4, h5, h6');

    // If only one paragraph, no images, no headings, might be a property value
    const isPropertyCandidate = paragraphs.length === 1
      && !hasImage
      && !hasHeading
      && propertyIndex < propertyFields.length;

    if (isPropertyCandidate) {
      const text = paragraphs[0].textContent.trim();

      // Check if it's a boolean or number
      if (text === 'true' || text === 'false' || !Number.isNaN(Number(text))) {
        const fieldName = propertyFields[propertyIndex];
        propertyValues[fieldName] = text;
        itemsToRemove.push(li);
        propertyIndex += 1;
      }
    } else {
      // Stop checking once we hit a real card
      break;
    }
  }

  // Set data attributes on block (dataset automatically handles kebab-case conversion)
  Object.keys(propertyValues).forEach((key) => {
    block.dataset[key] = propertyValues[key];
  });

  // Remove placeholder items
  itemsToRemove.forEach((li) => li.remove());
}

export default async function decorate(block) {
  // Build UL structure
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else if (div.children.length > 0 || div.textContent.trim().length > 0) {
        // Only add cards-card-body class if div has content
        div.className = 'cards-card-body';
      } else {
        // Remove empty divs
        div.remove();
      }
    });
    ul.append(li);
  });

  // Replace images with optimized pictures
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // Append UL to block
  block.textContent = '';
  ul.classList.add('grid-cards');

  // Extract block properties from placeholder cards (e.g., swipable, startingCard)
  extractBlockProperties(block, ul);

  // Check if testimonial-card variant
  const isTestimonial = block.classList.contains('testimonial-card');

  // Only add benefit-cards class if NOT testimonial-card variant
  ul.querySelectorAll('li').forEach((li) => {
    if (!isTestimonial) {
      li.classList.add('benefit-cards');
    }
  });

  block.append(ul);

  // Check if swiper is enabled via data attribute
  const isSwipable = block.dataset.swipable === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);

  if (isSwipable) {
    // Load Swiper library
    await loadCSS('/scripts/swiperjs/swiper-bundle.min.css');
    await loadScript('/scripts/swiperjs/swiper-bundle.min.js');

    // Add Swiper classes
    block.classList.add('swiper');
    ul.classList.add('swiper-wrapper');
    ul.classList.remove('grid-cards');
    ul.querySelectorAll('li').forEach((li) => {
      li.classList.add('swiper-slide');
    });

    // Add pagination
    const swiperPagination = document.createElement('div');
    swiperPagination.className = 'swiper-pagination';
    block.appendChild(swiperPagination);

    // Build Swiper configuration
    const swiperConfig = {
      slidesPerView: 1,
      spaceBetween: 16,
      initialSlide: startingCard,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
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
    } else {
      // For benefit cards: standard breakpoints
      swiperConfig.breakpoints = {
        600: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        900: {
          slidesPerView: 3,
          spaceBetween: 36,
        },
      };
    }

    // eslint-disable-next-line no-undef
    const swiper = new Swiper(block, swiperConfig);

    // Store swiper instance for potential future use
    block.swiperInstance = swiper;

    // For testimonial cards, update star icons on active slide
    if (isTestimonial) {
      const updateStarIcons = () => {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          // Reset ALL star icons in ALL slides to white first
          block.querySelectorAll('.swiper-slide [class*="icon-star"] img').forEach((img) => {
            const currentSrc = img.getAttribute('src');
            if (currentSrc && currentSrc.includes('star')) {
              img.setAttribute('src', '/icons/star-white.svg');
              img.setAttribute('data-icon-name', 'star-white');
            }
          });

          // Change star icons to yellow ONLY on the active slide
          const activeSlide = block.querySelector('.swiper-slide-active');
          if (activeSlide) {
            const starIcons = activeSlide.querySelectorAll('[class*="icon-star"] img');
            starIcons.forEach((img) => {
              const currentSrc = img.getAttribute('src');
              if (currentSrc && currentSrc.includes('star')) {
                img.setAttribute('src', '/icons/star-yellow.svg');
                img.setAttribute('data-icon-name', 'star-yellow');
              }
            });
          }
        });
      };

      // Update on initial load
      updateStarIcons();

      // Update when slide changes (both events for reliability)
      swiper.on('slideChangeTransitionEnd', updateStarIcons);
      swiper.on('slideChange', updateStarIcons);
    }
  } else if (!isTestimonial) {
    // === View All / View Less Toggle (Mobile Only) - Only for benefit cards ===
    const cards = ul.querySelectorAll('li');
    const maxVisible = 3;

    const isMobile = () => window.innerWidth <= 768;

    const toggleView = (btn, expand) => {
      cards.forEach((card, index) => {
        if (index >= maxVisible) {
          card.style.display = expand ? 'flex' : 'none';
        }
      });
      btn.textContent = expand ? 'View Less' : 'View All';
    };

    const setupToggleButton = () => {
      if (cards.length > maxVisible && isMobile()) {
        // Hide extra cards
        cards.forEach((card, index) => {
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

    // Reapply toggle if screen resizes
    window.addEventListener('resize', () => {
      const existingBtn = block.querySelector('.view-toggle');
      if (existingBtn) existingBtn.remove();
      cards.forEach((card) => { card.style.display = 'flex'; });
      setupToggleButton();
    });
  }
}
