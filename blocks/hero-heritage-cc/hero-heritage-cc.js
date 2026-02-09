import { decorateButtons } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/**
 * Checks if a string is a valid CSS color or gradient value
 * Accepts: hex, rgb/rgba, hsl/hsla, explicit gradients, design tokens, or web colors
 * - If value contains hyphens: treated as design token
 * - If value is letters only (no hyphens): treated as web color keyword
 * @param {string} value - The string to check
 * @returns {boolean} - True if the value is a color/gradient
 */
function isCssColorOrGradient(value) {
  if (!value) return false;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Check for hex color (#fff, #ffffff, #ffffffff)
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;

  // Check for rgb/rgba
  if (lower.startsWith('rgb(') || lower.startsWith('rgba(')) return true;

  // Check for hsl/hsla
  if (lower.startsWith('hsl(') || lower.startsWith('hsla(')) return true;

  // Check for explicit gradient definitions
  if (lower.startsWith('linear-gradient(')
      || lower.startsWith('radial-gradient(')
      || lower.startsWith('conic-gradient(')
      || lower.startsWith('repeating-linear-gradient(')
      || lower.startsWith('repeating-radial-gradient(')
      || lower.startsWith('repeating-conic-gradient(')) return true;

  // Check for design tokens (contains hyphens)
  // Accepts: var(--token-name), --token-name, or token-name
  if (trimmed.includes('-')) return true;

  // Check for web color keywords (letters only, no hyphens)
  // e.g., red, navy, transparent, rebeccapurple
  if (/^[a-z]+$/i.test(trimmed)) return true;

  return false;
}

/**
 * Normalizes a color/gradient value to proper CSS format
 * Converts design tokens to var(--token-name) format
 * @param {string} value - The raw value
 * @returns {string} - The normalized CSS value
 */
function normalizeCssColorValue(value) {
  if (!value) return value;
  const trimmed = value.trim();

  // Already a var() - return as-is
  if (trimmed.toLowerCase().startsWith('var(')) return trimmed;

  // If it contains hyphens, treat as design token and wrap in var()
  if (trimmed.includes('-')) {
    // Remove leading -- if present, then add var(--)
    const tokenName = trimmed.startsWith('--') ? trimmed.slice(2) : trimmed;
    return `var(--${tokenName})`;
  }

  // Otherwise return as-is (hex, rgb, hsl, gradient, web color)
  return trimmed;
}

export default function decorate(block) {
  // Check if we're in Universal Editor
  const mainElement = document.querySelector('main');
  const hasAueResource = mainElement?.hasAttribute('data-aue-resource');

  // Set modal theme for any modal links within this block (e.g., fees link)
  // These match the styling used by the cards/key-benefits modals on Mayura pages
  block.dataset.modalTheme = 'modal-mayura-blue';
  block.dataset.modalDialogBackgroundImageTexture = '/credit-card/metal-credit-card/media_15a8f844f87bf985cbf4471803bc87278ff6daa36.png';
  block.dataset.modalPageBackgroundImage = '/credit-card/metal-credit-card/media_1aa917044ef2aa165adb54e6ecc718b1cd83e80a4.png';
  block.dataset.modalPageDecorationImage = '/credit-card/metal-credit-card/media_13f68aa7e19d4532ae6d8a784fb5c4e140fb55d3e.svg';

  // Get all direct child divs (the three main sections)
  const rows = [...block.children].filter((child) => child.tagName === 'DIV');

  // Section 1: Header CTA (Apply Now button + link)
  if (rows[0]) {
    rows[0].classList.add('hero-heritage-cc-header-cta');

    const ctaContent = rows[0].querySelector(':scope > div');
    if (ctaContent) {
      // Get the button text from the first paragraph (headerCta_text field)
      const textParagraph = ctaContent.querySelector('p:not(:has(a))');
      const buttonText = textParagraph?.textContent?.trim() || 'Apply Now';

      // Find the link paragraph and the link itself
      const linkParagraph = ctaContent.querySelector('p:has(a)');
      const ctaLink = linkParagraph?.querySelector('a');

      if (ctaLink && linkParagraph) {
        // Set the link text to the button text (not the URL)
        ctaLink.textContent = buttonText;
        ctaLink.classList.add('hero-heritage-cc-header-cta-link');

        // Apply primary button classes manually (decorateButtons skips links with images)
        ctaLink.classList.add('button', 'primary');
        linkParagraph.classList.add('button-container');

        // Add arrow icon to Apply Now button (must be after button classes are set)
        const ctaArrowSpan = document.createElement('span');
        ctaArrowSpan.className = 'icon icon-arrow-right-white';
        const ctaArrowImg = document.createElement('img');
        ctaArrowImg.setAttribute('data-icon-name', 'arrow-right-white');
        ctaArrowImg.src = '/icons/arrow-right-white.svg';
        ctaArrowImg.alt = '';
        ctaArrowImg.loading = 'lazy';
        ctaArrowSpan.appendChild(ctaArrowImg);
        ctaLink.appendChild(ctaArrowSpan);

        // Remove the separate text paragraph since text is now in the button
        if (textParagraph) textParagraph.remove();

        // Add secondary "Fees and charges" link with arrow icon
        const feesLink = document.createElement('a');
        feesLink.href = '/credit-card/metal-credit-card/mayura/modals/fee-and-charges-modal';
        feesLink.textContent = 'Fees and charges on Mayura Metal Card ';
        feesLink.classList.add('hero-heritage-cc-header-cta-fees-link');

        // Custom click handler to strip inline background from table-container
        feesLink.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
          await openModal(feesLink.href, {
            modalTheme: block.dataset.modalTheme,
            textureImage: block.dataset.modalDialogBackgroundImageTexture,
            pageBackgroundImage: block.dataset.modalPageBackgroundImage,
            decorationImage: block.dataset.modalPageDecorationImage,
          });

          // After modal opens, strip inline background from table-container sections
          setTimeout(() => {
            const modalDialog = document.querySelector('dialog.modal-mayura-blue[open]');
            if (modalDialog) {
              modalDialog.querySelectorAll('.section.table-container').forEach((section) => {
                section.style.removeProperty('background');
              });
            }
          }, 50);
        });

        // Create arrow icon
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'icon icon-arrow-right-white';
        const arrowImg = document.createElement('img');
        arrowImg.setAttribute('data-icon-name', 'arrow-right-white');
        arrowImg.src = '/icons/arrow-right-white.svg';
        arrowImg.alt = '';
        arrowImg.loading = 'lazy';
        arrowSpan.appendChild(arrowImg);
        feesLink.appendChild(arrowSpan);

        // Add to a new paragraph after the button
        const feesP = document.createElement('p');
        feesP.appendChild(feesLink);
        linkParagraph.parentNode.appendChild(feesP);

        // Call decorateButtons to apply button styling (runs after page decoration)
        decorateButtons(rows[0]);
      }
    }
  }

  // Section 2: Intro (text, background image, logos, credit card name)
  if (rows[1]) {
    rows[1].classList.add('hero-heritage-cc-intro');

    // Find elements within intro section
    const introContent = rows[1].querySelector(':scope > div');
    if (introContent) {
      // First heading is the intro text
      const introHeading = introContent.querySelector('h1, h2, h3, h4, h5, h6');
      if (introHeading) {
        introHeading.classList.add('hero-heritage-cc-intro-text-top');
      }

      // Get all pictures in intro (order follows model field order)
      const pictures = introContent.querySelectorAll('picture');

      // First picture is the background image
      if (pictures[0]) {
        const bgPicture = pictures[0];
        const bgPictureWrapper = bgPicture.closest('p');
        const bgImg = bgPicture.querySelector('img');

        // Check if we're in Universal Editor
        const isInUE = !!document.querySelector('main[data-aue-resource]');

        if (isInUE) {
          // In UE: Show as a clickable thumbnail for easy content authoring
          bgPicture.classList.add('hero-heritage-cc-intro-bg-preview');
          if (bgPictureWrapper) {
            bgPictureWrapper.classList.add('hero-heritage-cc-intro-bg-preview-wrapper');
          }
        } else {
          // On live pages: Apply as section background and remove from DOM
          const webpSource = bgPicture.querySelector('source[type="image/webp"]');
          const bgUrl = webpSource?.srcset?.split(',')[0]?.trim()?.split(' ')[0]
            || bgImg?.src;

          if (bgUrl) {
            const sectionContainer = block.closest('.section');
            if (sectionContainer) {
              sectionContainer.style.backgroundImage = `url(${bgUrl})`;
              sectionContainer.style.backgroundSize = 'cover';
              sectionContainer.style.backgroundRepeat = 'repeat';
              sectionContainer.style.backgroundPosition = 'center center';
              sectionContainer.style.backgroundAttachment = 'fixed';

              // Add preload link for LCP optimization with WebP
              const preloadLink = document.createElement('link');
              preloadLink.rel = 'preload';
              preloadLink.as = 'image';
              preloadLink.href = bgUrl;
              preloadLink.fetchPriority = 'high';
              if (webpSource) preloadLink.type = 'image/webp';
              document.head.appendChild(preloadLink);
            }
          }

          // Remove from DOM on live pages
          bgPicture.remove();
          if (bgPictureWrapper) bgPictureWrapper.remove();
        }
      }

      // Second picture is decoration image top-right
      if (pictures[1]) {
        const decorTopRight = pictures[1];
        const decorTopRightImg = decorTopRight.querySelector('img');
        if (decorTopRightImg?.src) {
          const sectionContainer = block.closest('.section');
          if (sectionContainer) {
            sectionContainer.style.setProperty(
              '--hero-heritage-cc-decoration-top-right',
              `url(${decorTopRightImg.src})`,
            );
          }
        }
        const decorTopRightWrapper = decorTopRight.closest('p');
        decorTopRight.remove();
        if (decorTopRightWrapper) decorTopRightWrapper.remove();
      }

      // Third picture is decoration image bottom-left
      if (pictures[2]) {
        const decorBottomLeft = pictures[2];
        const decorBottomLeftImg = decorBottomLeft.querySelector('img');
        if (decorBottomLeftImg?.src) {
          const sectionContainer = block.closest('.section');
          if (sectionContainer) {
            sectionContainer.style.setProperty(
              '--hero-heritage-cc-decoration-bottom-left',
              `url(${decorBottomLeftImg.src})`,
            );
          }
        }
        const decorBottomLeftWrapper = decorBottomLeft.closest('p');
        decorBottomLeft.remove();
        if (decorBottomLeftWrapper) decorBottomLeftWrapper.remove();
      }

      // Fourth and fifth pictures are the logos - wrap them in a container for stacking
      const hindiLogoP = pictures[3]?.closest('p');
      const englishLogoP = pictures[4]?.closest('p');

      if (hindiLogoP && englishLogoP) {
        hindiLogoP.classList.add('hero-heritage-cc-intro-logo-hindi');
        englishLogoP.classList.add('hero-heritage-cc-intro-logo-english');

        // Create wrapper to contain both logos in document flow
        const logoWrapper = document.createElement('div');
        logoWrapper.classList.add('hero-heritage-cc-intro-logo-wrapper');
        hindiLogoP.parentNode.insertBefore(logoWrapper, hindiLogoP);
        logoWrapper.appendChild(hindiLogoP);
        logoWrapper.appendChild(englishLogoP);
      }

      // Find the gradient/color text (plain text paragraph that's not a picture/button)
      const paragraphs = introContent.querySelectorAll('p');
      paragraphs.forEach((p) => {
        // Skip paragraphs that contain pictures or links
        if (p.querySelector('picture, a')) return;

        const text = p.textContent.trim();
        if (isCssColorOrGradient(text)) {
          // Normalize the value (convert design tokens to var(--token) format)
          const normalizedValue = normalizeCssColorValue(text);
          // Store the value as a data attribute and CSS custom property
          block.dataset.gradientColor = normalizedValue;
          block.style.setProperty('--hero-heritage-cc-intro-gradient', normalizedValue);

          // In UE mode, keep visible for editing; on live pages, remove
          if (hasAueResource) {
            p.classList.add('hero-heritage-cc-intro-gradient-preview');
          } else {
            p.remove();
          }
        }
      });

      // Remaining headings are the credit card name
      const allHeadings = introContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
      allHeadings.forEach((heading, index) => {
        if (index > 0) {
          heading.classList.add('hero-heritage-cc-intro-credit-card-name');
        }
      });
    }
  }

  // Section 3: Banner (logo, text, image, CTAs)
  if (rows[2]) {
    rows[2].classList.add('hero-heritage-cc-banner');

    const bannerContent = rows[2].querySelector(':scope > div');
    if (bannerContent) {
      // First picture is the top logo
      const pictures = bannerContent.querySelectorAll('picture');
      if (pictures[0]) pictures[0].closest('p')?.classList.add('hero-heritage-cc-banner-top-logo');
      if (pictures[1]) pictures[1].closest('p')?.classList.add('hero-heritage-cc-banner-image');

      // Heading is the banner text
      const bannerHeading = bannerContent.querySelector('h1, h2, h3, h4, h5, h6');
      if (bannerHeading) {
        bannerHeading.classList.add('hero-heritage-cc-banner-text');
      }

      // Button containers are the CTAs - wrap them for side-by-side layout
      const buttonContainers = bannerContent.querySelectorAll('.button-container');
      if (buttonContainers.length > 0) {
        const ctaWrapper = document.createElement('div');
        ctaWrapper.classList.add('hero-heritage-cc-banner-cta-group');
        buttonContainers[0].parentNode.insertBefore(ctaWrapper, buttonContainers[0]);
        buttonContainers.forEach((btn) => {
          btn.classList.add('hero-heritage-cc-banner-cta');
          ctaWrapper.appendChild(btn);
        });
      }
    }

    // Add click handler for "The Concept" button to swap banner content
    const bannerDiv = rows[2];
    const bannerInner = bannerDiv.querySelector(':scope > div');

    // Create a separate container for concept content (keeps original intact)
    let conceptContainer = null;

    // Create div to hide/show the banner content
    const bannerCurtain = document.createElement('div');
    bannerCurtain.classList.add('hero-heritage-cc-banner-curtain');
    bannerCurtain.style.clipPath = 'inset(0 0 0 0)';
    bannerCurtain.style.transition = 'clip-path 0.35s ease-out 0s forwards';
    bannerInner.appendChild(bannerCurtain);

    const bannerImage = bannerInner.querySelector('.hero-heritage-cc-banner-image');
    const bannerCtaGroup = bannerInner.querySelector('.hero-heritage-cc-banner-cta-group');
    bannerCurtain.appendChild(bannerImage);
    bannerCurtain.appendChild(bannerCtaGroup);

    // Function to show original banner, hide concept
    const showOriginalBanner = () => {
      if (!conceptContainer) return;

      // Show banner elements first (before concept slides down)
      // Override the CSS animation on bannerInner to prevent 6s delay
      bannerInner.style.animation = 'none';
      bannerInner.style.opacity = '1';
      bannerInner.style.visibility = 'visible';

      // Slide down concept
      conceptContainer.style.transform = 'translateY(100%)';
      conceptContainer.style.visibility = 'hidden';
      conceptContainer.style.opacity = '0';
      bannerCurtain.style.clipPath = 'inset(0 0 0 0)';

      setTimeout(() => {
        conceptContainer.style.display = 'none';
        conceptContainer.style.opacity = '';
        conceptContainer.style.transform = '';
        bannerDiv.classList.remove('hero-heritage-cc-banner-swapped');
      }, 350);
    };

    // Function to show concept, hide original banner
    const showConceptView = () => {
      // Show concept starting below (banner stays visible underneath)
      conceptContainer.style.display = '';
      conceptContainer.style.visibility = 'hidden';
      conceptContainer.style.opacity = '0';
      conceptContainer.style.transform = 'translateY(100%)';
      bannerCurtain.style.clipPath = 'inset(0 0 0 0)';

      // Force reflow
      // eslint-disable-next-line no-unused-expressions
      conceptContainer.offsetHeight;

      // Slide up over the banner
      conceptContainer.style.visibility = 'visible';
      conceptContainer.style.opacity = '1';
      conceptContainer.style.transform = 'translateY(0)';
      bannerCurtain.style.clipPath = 'inset(0 0 100% 0)';
      bannerDiv.classList.add('hero-heritage-cc-banner-swapped');
    };

    bannerDiv.addEventListener('click', async (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      // Handle "Go back" button (href="#")
      if (link.href.endsWith('#') || link.getAttribute('href') === '#') {
        e.preventDefault();
        e.stopPropagation();
        showOriginalBanner();
        return;
      }

      // Only handle modal links for concept swap
      if (!link.href.includes('/modals/')) return;

      // Only handle non-primary buttons (The Concept is secondary)
      if (link.classList.contains('primary')) return;

      e.preventDefault();
      e.stopPropagation();

      // If concept is already loaded, just show it
      if (conceptContainer) {
        showConceptView();
        return;
      }

      // Fetch the content from the modal page
      const path = new URL(link.href).pathname;
      const fragment = await loadFragment(path);

      if (fragment) {
        // Get ALL sections from the fragment (modal may have multiple concept sections)
        const fragmentSections = fragment.querySelectorAll('.section');
        if (fragmentSections.length > 0) {
          // Create concept container
          conceptContainer = document.createElement('div');
          conceptContainer.classList.add('hero-heritage-cc-concept-container');
          conceptContainer.style.display = 'none';

          fragmentSections.forEach((section, index) => {
            // Hide all sections except the first one
            if (index > 0) {
              section.style.display = 'none';
            }
            conceptContainer.appendChild(section);
          });

          // Add concept container to banner
          bannerDiv.appendChild(conceptContainer);

          // Setup modal interactivity (hotspots, connectors, etc.)
          const { setupModalInteractivity } = await import('../modal/modal.js');
          await setupModalInteractivity(conceptContainer);

          // Show concept view with transition
          showConceptView();
        }
      }
    });
  }
}
