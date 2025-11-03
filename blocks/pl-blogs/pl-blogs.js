import Swiper from '../swipper/swipper-bundle.min.js';

export default function decorate(block) {
  block.id = 'blogs';
  const children = Array.from(block.children);

  // Create swiper elements
  const swiperWrapper = document.createElement('div');
  swiperWrapper.className = 'swiper-wrapper';

  // Wrap all cards from the 2nd one onward inside swiper-slide
  children.slice(1).forEach((child) => {
    const swiperSlide = document.createElement('div');
    swiperSlide.className = 'swiper-slide';
    swiperSlide.appendChild(child);
    swiperWrapper.appendChild(swiperSlide);
  });

  // Create swiper container and pagination
  const swiperContainer = document.createElement('div');
  swiperContainer.className = 'swiper swiper-blog';
  swiperContainer.appendChild(swiperWrapper);

  const swiperPagination = document.createElement('div');
  swiperPagination.className = 'swiper-pagination';
  swiperContainer.appendChild(swiperPagination);

  // Append swiper container after the first static card
  block.appendChild(swiperContainer);

  // Initialize Swiper
  // new Swiper(".swiper-blog", {
  //   slidesPerView: 1,
  //   spaceBetween: 20,
  //   pagination: {
  //     el: ".swiper-pagination",
  //     clickable: true,
  //   },
  //   breakpoints: {
  //     768: {
  //       slidesPerView: 3,
  //     },
  //   },
  // });
  new Swiper('.swiper-blog', {
    slidesPerView: 1,
    spaceBetween: 20,
    watchOverflow: true,
    loop: false,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
    },
  });
}
