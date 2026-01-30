export default function decorate(block) {
  // Get all direct child divs of the block
  const children = Array.from(block.children);

  // First child: CTA content
  if (children[0]) {
    children[0].classList.add('cta-sticky-desktop-content');
  }

  // secondchild: CTA Mobile content
  if (children[1]) {
    children[1].classList.add('cta-sticky-mobile-content');
  }

  // third child: CTA Tracking ID (extract and remove)
  if (children[2]) {
    const ctaId = children[2].textContent.trim();
    if (ctaId) {
      block.id = ctaId;
    }
    children[2].remove();
  }

  // Hide the CTA initially
  const stickyContainer = block.closest('.cta-sticky-container');
  if (stickyContainer) {
    stickyContainer.classList.add('hidden');
  }

  // Show CTA after user starts scrolling
  let hasScrolled = false;
  const showCtaOnScroll = () => {
    if (!hasScrolled && window.scrollY > 50) {
      hasScrolled = true;
      if (stickyContainer) {
        stickyContainer.classList.remove('hidden');
        stickyContainer.classList.add('slide-in');
      }
      // Remove the listener once shown to improve performance
      window.removeEventListener('scroll', showCtaOnScroll);
    }
  };

  // Add scroll listener
  window.addEventListener('scroll', showCtaOnScroll, { passive: true });
}
