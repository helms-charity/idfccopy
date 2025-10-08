import Swiper from "../swipper/swipper-bundle.min.js";

export default function decorate(block) {
  const allChildren = Array.from(block.children);

  // Filter out empty or malformed cards
  const validCards = allChildren.filter((item) => {
    const children = item.children;
    if (!children || children.length < 2) return false;

    const hasImage = children[0].querySelector("img") || children[0].querySelector("picture");
    const hasText = children[1].textContent.trim().length > 0;

    return hasImage && hasText;
  });

  if (!validCards.length) {
    block.innerHTML = ''; // If no valid cards, clean up block
    return;
  }

  // Assign classes to image and text containers
  validCards.forEach((item) => {
    item.classList.add("prodCard");

    const [imgDiv, textDiv] = item.children;
    if (imgDiv) imgDiv.classList.add("prodImgDiv");
    if (textDiv) textDiv.classList.add("prodTextDiv");
  });

  // Build Swiper structure
  const wrapper = document.createElement("div");
  wrapper.classList.add("swiper-wrapper");

  validCards.forEach((card) => {
    card.classList.add("swiper-slide");
    wrapper.appendChild(card);
  });

  const swiperContainer = document.createElement("div");
  swiperContainer.classList.add("swiper");
  swiperContainer.appendChild(wrapper);

  // Replace content with swiper
  block.innerHTML = "";
  block.appendChild(swiperContainer);

  // Initialize Swiper
  new Swiper(swiperContainer, {
    slidesPerView: 2.2,
    spaceBetween: 16,
    loop: true,
    grabCursor: true,
    allowTouchMove: true,
    breakpoints: {
      0: {
        slidesPerView: 1.2,
        spaceBetween: 12,
      },
      768: {
        slidesPerView: 2.2,
        spaceBetween: 16,
      },
    },
  });
}
