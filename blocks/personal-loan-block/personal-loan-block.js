import Swiper from '../swipper/swipper-bundle.min.js'; // adjust path based on your project

export default function decorate(block) {
  // Add swiper and wrapper
  block.classList.add('swiper');
  const wrapper = document.createElement('div');
  wrapper.classList.add('swiper-wrapper');

  // Wrap each child card in swiper-slide
  Array.from(block.children).forEach((card) => {
    card.classList.add('swiper-slide', 'pl-card');

    const [imgDiv, textDiv] = card.children;
    if (imgDiv) imgDiv.classList.add('pl-img');
    if (textDiv) textDiv.classList.add('pl-text');

    wrapper.appendChild(card);
  });

  // Empty block and append wrapper
  block.textContent = '';
  block.appendChild(wrapper);

  // Add pagination element for mobile view
  const pagination = document.createElement('div');
  pagination.classList.add('swiper-pagination');
  block.appendChild(pagination);

  // Init Swiper
  new Swiper(block, {
    slidesPerView: 1,
    spaceBetween: 16,
    pagination: {
      el: pagination,
      clickable: true,
    },
    breakpoints: {
      768: {
        slidesPerView: 3,
        pagination: false, // Hide dots on desktop
      },
    },
  });
}
