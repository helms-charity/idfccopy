/**
 * Anchor Navigation - Desktop-only sticky navigation bar
 * Links to sections on the same page
 */

/**
 * Build navigation from block content
 */
function buildNavigation(navItems) {
  const nav = document.createElement('nav');
  nav.classList.add('anchor-nav-container');

  const navList = document.createElement('ul');
  navList.classList.add('anchor-nav-list');

  navItems.forEach((item) => {
    const li = document.createElement('li');
    li.classList.add('anchor-nav-item');

    const link = document.createElement('a');
    link.textContent = item.title;
    link.href = item.href;
    link.classList.add('anchor-nav-link');
    link.setAttribute('data-text', item.title);

    // Handle anchor link scrolling with offset for fixed header
    link.addEventListener('click', (e) => {
      if (item.href.startsWith('#')) {
        e.preventDefault();
        const targetId = item.href.substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          const yOffset = -200; // Offset for fixed header
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    });

    li.appendChild(link);
    navList.appendChild(li);
  });

  nav.appendChild(navList);
  return nav;
}

/**
 * Parse block content to extract navigation items
 */
function parseBlockContent(block) {
  const navItems = [];
  const rows = block.querySelectorAll(':scope > div');

  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length >= 2) {
      const title = cells[0].textContent.trim();
      const link = cells[1].querySelector('a');
      const href = link ? link.getAttribute('href') : '#';

      if (title) {
        navItems.push({ title, href });
      }
    }
  });

  return navItems;
}

/**
 * Setup sticky behavior - switch to fixed positioning when scrolled to top
 */
function setupStickyBehavior(wrapper) {
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10) || 64;

  // Calculate the original offset position (when NOT stuck)
  const getOriginalOffset = () => wrapper.getBoundingClientRect().top + window.scrollY;
  let originalOffsetTop = getOriginalOffset();

  const updateSticky = () => {
    const { scrollY } = window;

    // If currently stuck, use the stored original position
    // Otherwise, recalculate it (in case page layout changed)
    if (!wrapper.classList.contains('stuck')) {
      originalOffsetTop = getOriginalOffset();
    }

    // Should stick when the wrapper would naturally reach the header position
    const shouldStick = scrollY > (originalOffsetTop - headerHeight);

    if (shouldStick) {
      wrapper.classList.add('stuck');
    } else {
      wrapper.classList.remove('stuck');
    }
  };

  // Use requestAnimationFrame for smooth performance
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateSticky();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Don't run initial check - let it stay in natural position until user scrolls
}

export default function decorate(block) {
  // Parse navigation items from block content
  const navItems = parseBlockContent(block);

  if (navItems.length === 0) {
    // No navigation items found, hide the block
    block.style.display = 'none';
    return;
  }

  // Build navigation
  const nav = buildNavigation(navItems);

  // Replace block content with navigation
  block.innerHTML = '';
  block.appendChild(nav);

  // Setup sticky behavior
  const wrapper = block.closest('.anchor-nav-wrapper');
  if (wrapper) {
    setupStickyBehavior(wrapper);
  }
}
