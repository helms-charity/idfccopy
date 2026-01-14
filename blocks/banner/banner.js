export default function decorate(block) {
  // Get the main container div
  const container = block.querySelector(':scope > div');

  if (!container) return;

  // Add semantic class to container
  container.classList.add('banner-content');

  // Get all child divs
  const children = Array.from(container.children);

  // Banner Heading
  if (children[0]) {
    children[0].classList.add('banner-heading');
    const headingText = children[0].querySelector('p');
    if (headingText) headingText.classList.add('banner-heading-text');
  }

  // Bottom Text
  if (children[1]) {
    children[1].classList.add('banner-bottom-text');
    const bottomText = children[1].querySelector('p');
    if (bottomText) bottomText.classList.add('banner-bottom-text-content');
  }

  // Desktop Image
  if (children[2]) {
    children[2].classList.add('banner-image-desktop', 'banner-image');
    const picture = children[2].querySelector('picture');
    const img = children[2].querySelector('img');
    if (picture) picture.classList.add('banner-picture');
    if (img) {
      img.classList.add('banner-img');
      img.loading = 'eager';
    }
  }

  // Mobile Image
  if (children[3]) {
    children[3].classList.add('banner-image-mobile', 'banner-image');
    const picture = children[3].querySelector('picture');
    const img = children[3].querySelector('img');
    if (picture) picture.classList.add('banner-picture');
    if (img) {
      img.classList.add('banner-img');
      img.loading = 'lazy';
    }
  }
}
