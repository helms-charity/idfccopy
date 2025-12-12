import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

// function closeOnFocusLost(e) {
//   const nav = e.currentTarget;
//   const relatedTarget = e.relatedTarget;

//   // Only close mobile menu if focus is lost to something outside the nav
//   if (!isDesktop.matches && (!relatedTarget || !nav.contains(relatedTarget))) {
//     const navSections = nav.querySelector('.nav-sections');
//     // eslint-disable-next-line no-use-before-define
//     toggleMenu(nav, navSections, false);
//   }
// }

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // Always collapse all nav sections when toggling the menu
  toggleAllNavSections(navSections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    // nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    // nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';

  // Get the default-content-wrapper from fragment
  const contentWrapper = fragment.querySelector('.default-content-wrapper');
  if (!contentWrapper) return;

  // Create the three main sections
  const navBrand = document.createElement('div');
  navBrand.classList.add('nav-brand', 'section');

  const navSections = document.createElement('div');
  navSections.classList.add('nav-sections', 'section');

  const navTools = document.createElement('div');
  navTools.classList.add('nav-tools', 'section');

  // Extract logo from fragment (if exists) or use default
  let logoImgSrc = './media_104481e8050954141720a87a3e4a576a65e2e8774.png';
  let logoImgAlt = 'IDFC FIRST Bank';

  // Look for the last image in the fragment (logo should be at the bottom)
  const allImages = fragment.querySelectorAll('img');
  if (allImages.length > 0) {
    const lastImg = allImages[allImages.length - 1];
    const srcFromFragment = lastImg.getAttribute('src');
    logoImgAlt = lastImg.getAttribute('alt') || logoImgAlt;

    // Use the image from fragment if it exists and looks valid
    if (srcFromFragment) {
      logoImgSrc = srcFromFragment;
    }
  }

  // Build nav-brand
  navBrand.innerHTML = `<a href="https://www.idfcfirstbank.com" aria-label="IDFC FIRST Bank Home">
    <img src="${logoImgSrc}" alt="${logoImgAlt}">
  </a>`;

  // Parse the content and build nav-sections
  const navSectionsWrapper = document.createElement('div');
  navSectionsWrapper.classList.add('default-content-wrapper');
  const navSectionsUl = document.createElement('ul');

  // Get all children from contentWrapper
  const children = Array.from(contentWrapper.children);
  let currentLi = null;

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];

    // Personal section (first p + ul)
    if (i === 0 && child.tagName === 'P' && child.textContent.trim() === 'Personal') {
      currentLi = document.createElement('li');
      currentLi.innerHTML = `<p><a href="https://www.idfcfirstbank.com">${child.textContent}</a></p>`;
      const nextChild = children[i + 1];
      if (nextChild && nextChild.tagName === 'UL') {
        currentLi.appendChild(nextChild.cloneNode(true));
        i += 1; // Skip the next element since we've already processed it
      }
      navSectionsUl.appendChild(currentLi);
    } else if (child.classList.contains('button-container') && child.textContent.includes('Explore Personal Banking')) {
      // Explore Personal Banking button - will be added separately later
      // Skip this element as we'll add it programmatically
    } else if (child.classList.contains('button-container')) {
      // About Us, Careers, IDFC FIRST Academy, ESG
      const link = child.querySelector('a');
      if (link) {
        currentLi = document.createElement('li');
        const text = link.textContent.trim();
        currentLi.innerHTML = `<p><a href="${link.href}">${text}</a></p>`;

        // Check if next element is a ul (submenu)
        const nextChild = children[i + 1];
        if (nextChild && nextChild.tagName === 'UL') {
          currentLi.appendChild(nextChild.cloneNode(true));
          i += 1; // Skip the next element
        }
        navSectionsUl.appendChild(currentLi);
      }
    } else if (child.tagName === 'P' && child.textContent.trim() === 'Investors' && !child.classList.contains('button-container')) {
      // Investors section (p followed by ul)
      currentLi = document.createElement('li');
      currentLi.innerHTML = `<p><a href="https://www.idfcfirstbank.com/investors">${child.textContent}</a></p>`;
      const nextChild = children[i + 1];
      if (nextChild && nextChild.tagName === 'UL') {
        currentLi.appendChild(nextChild.cloneNode(true));
        i += 1; // Skip the next element
      }
      navSectionsUl.appendChild(currentLi);
    }
  }

  navSectionsWrapper.appendChild(navSectionsUl);
  navSections.appendChild(navSectionsWrapper);

  // Insert 'Explore Personal Banking' as second li in nav-sections
  const newLi = document.createElement('li');
  newLi.innerHTML = '<div class="main-link"><a href="https://www.idfcfirstbank.com">Explore Personal Banking</a></div>';
  if (navSectionsUl.children.length > 0) {
    navSectionsUl.insertBefore(newLi, navSectionsUl.children[1] || null);
  } else {
    navSectionsUl.appendChild(newLi);
  }

  // Build nav-tools section from contentWrapper
  const navToolsWrapper = document.createElement('div');
  navToolsWrapper.classList.add('default-content-wrapper');

  // Find the search bar and other tools
  const searchP = Array.from(contentWrapper.querySelectorAll('p')).find((p) => {
    const strong = p.querySelector('strong');
    return strong && strong.textContent.includes('what are you looking for');
  });

  const specialP = Array.from(contentWrapper.querySelectorAll('p')).find((p) => p.textContent.trim() === "What's special about us" && !p.querySelector('strong'));

  const toolsUl = Array.from(contentWrapper.querySelectorAll('ul')).find((ul) => {
    const firstLi = ul.querySelector('li');
    return firstLi && (firstLi.textContent.includes('Customer service') || firstLi.textContent.includes('Login'));
  });

  if (searchP) {
    navToolsWrapper.innerHTML = '<p><span class="icon icon-search"></span><strong class="typewriter-text"></strong></p>';
  }

  // Typewriter animation for "What are you looking for..."
  function startTypewriterAnimation() {
    const typewriterEl = navToolsWrapper.querySelector('.typewriter-text');
    if (!typewriterEl) return;

    const fullText = 'What are you looking for...';
    let charIndex = 0;

    function typeNextChar() {
      if (charIndex <= fullText.length) {
        typewriterEl.textContent = fullText.slice(0, charIndex);
        charIndex += 1;
        setTimeout(typeNextChar, 200); // Speed of typing (0.2s per letter)
      } else {
        // Finished typing, wait 2 seconds then restart
        setTimeout(() => {
          charIndex = 0;
          typewriterEl.textContent = '';
          typeNextChar();
        }, 2000);
      }
    }

    typeNextChar();
  }

  // Initialize typewriter after DOM is ready
  setTimeout(startTypewriterAnimation, 100);

  if (specialP) {
    const specialPClone = specialP.cloneNode(true);
    specialPClone.innerHTML = `<span class="icon icon-special"></span>${specialP.textContent}`;
    navToolsWrapper.appendChild(specialPClone);
  }

  if (toolsUl) {
    const toolsUlClone = toolsUl.cloneNode(true);
    // Add login icon to the Login li (last child)
    const loginLi = toolsUlClone.querySelector('li:last-child');
    if (loginLi && loginLi.textContent.includes('Login')) {
      const loginIcon = document.createElement('span');
      loginIcon.classList.add('icon', 'icon-login_header');
      loginLi.prepend(loginIcon);
    }

    // Add odometer animation to Customer Service li (first child)
    const customerServiceLi = toolsUlClone.querySelector('li:first-child');
    if (customerServiceLi && customerServiceLi.textContent.includes('Customer service')) {
      customerServiceLi.innerHTML = `
        <div class="grnt-animation-odometer">
          <div class="grnt-odometer-track">
            <span>Customer Service</span>
            <span>Contact us</span>
            <span>Service request</span>
            <span>Locate a branch</span>
            <span>Complaints</span>
            <span>Customer Service</span>
          </div>
        </div>
      `;
    }

    navToolsWrapper.appendChild(toolsUlClone);
  }

  navTools.appendChild(navToolsWrapper);

  // Decorate icons in nav-tools to add actual icon images
  decorateIcons(navTools);

  // Start odometer animation for Customer Service
  function startOdometerAnimation() {
    const odometerTrack = navTools.querySelector('.grnt-odometer-track');
    if (!odometerTrack) return;

    const spans = odometerTrack.querySelectorAll('span');
    const spanHeight = 20; // Height of each span in pixels
    const totalItems = spans.length - 1; // Exclude the duplicate last item
    let currentIndex = 0;

    setInterval(() => {
      currentIndex += 1;
      const translateY = currentIndex * spanHeight;
      odometerTrack.style.transform = `translateY(-${translateY}px)`;

      // Reset to first item when reaching the duplicate last item
      if (currentIndex >= totalItems) {
        setTimeout(() => {
          odometerTrack.style.transition = 'none';
          odometerTrack.style.transform = 'translateY(0)';
          currentIndex = 0;
          // Re-enable transition after reset
          setTimeout(() => {
            odometerTrack.style.transition = 'transform 0.6s ease-in-out';
          }, 50);
        }, 600); // Wait for the transition to complete
      }
    }, 1500);
  }

  // Initialize odometer after DOM is ready
  setTimeout(startOdometerAnimation, 100);

  // Assemble the navigation
  nav.appendChild(navBrand);
  nav.appendChild(navSections);
  nav.appendChild(navTools);

  // Add dropdown behavior to nav sections
  navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
    if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
    navSection.addEventListener('click', () => {
      if (isDesktop.matches) {
        const expanded = navSection.getAttribute('aria-expanded') === 'true';
        toggleAllNavSections(navSections);
        navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }

      if (!isDesktop.matches) {
        const subUl = navSection.querySelector('ul');
        if (subUl) {
          const { scrollHeight } = subUl;
          navSection.style.setProperty('--scroll-height', `${scrollHeight}px`);
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      }
    });
  });

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;

  hamburger.addEventListener('click', () => {
    toggleMenu(nav, navSections);
  });

  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // Add scroll behavior for collapsing header
  // eslint-disable-next-line no-unused-vars
  let lastScrollTop = 0;
  const scrollThreshold = 50; // Pixels to scroll before collapsing

  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > scrollThreshold) {
      navWrapper.classList.add('scrolled');
    } else {
      navWrapper.classList.remove('scrolled');
    }

    lastScrollTop = scrollTop;
  }

  // Only apply scroll behavior on desktop
  if (isDesktop.matches) {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call to set proper position
    handleScroll();
  }

  // Handle resize to add/remove scroll listener
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Call immediately on resize to desktop
    } else {
      window.removeEventListener('scroll', handleScroll);
      navWrapper.classList.remove('scrolled');
    }
  });
}
