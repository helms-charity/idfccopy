function updateButtonText(button) {
  const desktopText = button.getAttribute('data-desktop-text');
  const mobileText = button.getAttribute('data-mobile-text');
  const isMobile = window.innerWidth < 901;

  if (isMobile && mobileText) {
    button.textContent = mobileText;
  } else if (desktopText) {
    button.textContent = desktopText;
  }
}

export default function decorate(block) {
  // Get all direct child divs of the block
  const children = Array.from(block.children);

  // First child: CTA Button Container
  if (children[0]) {
    children[0].classList.add('sticky-cta-content');
    const ctaLink = children[0].querySelector('a');
    if (ctaLink) {
      ctaLink.classList.add('sticky-cta-link');
      // Store the original button text as desktop text
      const desktopText = ctaLink.textContent.trim();
      ctaLink.setAttribute('data-desktop-text', desktopText);
    }
  }

  // Second child: CTA Tracking ID (hidden)
  if (children[1]) {
    children[1].classList.add('sticky-cta-tracking-id');
    const ctaId = children[1].textContent.trim();
    if (ctaId) {
      block.setAttribute('data-cta-id', ctaId);
    }
  }

  // Third child: CTA Mobile Text (used for button text on mobile)
  if (children[2]) {
    children[2].classList.add('sticky-cta-mobile-text');
    const mobileTextContent = children[2].querySelector('p');
    if (mobileTextContent) {
      mobileTextContent.classList.add('sticky-cta-mobile-text-content');
      // Store mobile text for button
      const mobileText = mobileTextContent.textContent.trim();
      const ctaLink = children[0]?.querySelector('a');
      if (ctaLink && mobileText) {
        ctaLink.setAttribute('data-mobile-text', mobileText);
        // Update button text based on viewport
        updateButtonText(ctaLink);
        window.addEventListener('resize', () => updateButtonText(ctaLink));
      }
    }
  }

  // Fourth child: CTA Subtitle
  if (children[3]) {
    children[3].classList.add('sticky-cta-subtitle');
    const subtitleContent = children[3].querySelector('p');
    if (subtitleContent) {
      subtitleContent.classList.add('sticky-cta-subtitle-content');
    }
  }
}
