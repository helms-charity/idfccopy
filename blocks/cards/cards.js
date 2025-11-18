import { createOptimizedPicture, loadScript, loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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
      } else {
        div.className = 'cards-card-body';
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
  ul.querySelectorAll('li').forEach((li) => li.classList.add('benefit-cards'));
  block.append(ul);

  // Check if swiper is enabled via data attribute
  const isSwipable = block.dataset.swipable === 'true';
  const startingCard = parseInt(block.dataset.startingCard || '0', 10);

  if (isSwipable) {
    // Load Swiper library
    await loadCSS('/scripts/swiperjs/swiper-bundle.css');
    await loadScript('/scripts/swiperjs/swiper-bundle.js');

    // Add Swiper classes
    block.classList.add('swiper');
    ul.classList.add('swiper-wrapper');
    ul.classList.remove('grid-cards');
    ul.querySelectorAll('li').forEach((li) => {
      li.classList.add('swiper-slide');
    });

    // Add navigation and pagination
    const swiperPagination = document.createElement('div');
    swiperPagination.className = 'swiper-pagination';
    block.appendChild(swiperPagination);

    const swiperButtonPrev = document.createElement('div');
    swiperButtonPrev.className = 'swiper-button-prev';
    block.appendChild(swiperButtonPrev);

    const swiperButtonNext = document.createElement('div');
    swiperButtonNext.className = 'swiper-button-next';
    block.appendChild(swiperButtonNext);

    // Initialize Swiper
    // eslint-disable-next-line no-undef
    const swiper = new Swiper(block, {
      slidesPerView: 1,
      spaceBetween: 16,
      initialSlide: startingCard,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        900: {
          slidesPerView: 2,
          spaceBetween: 24,
        },
      },
    });

    // Store swiper instance for potential future use
    block.swiperInstance = swiper;
  } else {
    // === View All / View Less Toggle (Mobile Only) ===
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
