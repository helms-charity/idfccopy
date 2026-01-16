import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';
import { parseCategoryNavBlock, buildDropdown } from '../category-nav/category-nav.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// Cache for dynamically imported block modules (performance optimization)
const blockModuleCache = new Map();

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

  // Reset tab view when closing menu
  if (expanded) {
    navSections.classList.remove('tab-view-active');
    const tabBar = navSections.querySelector('.nav-tab-bar');
    if (tabBar) {
      tabBar.remove();
    }
    // Reset all sections display
    const sectionsUl = navSections.querySelector('.default-content-wrapper > ul');
    const allSections = sectionsUl ? Array.from(sectionsUl.querySelectorAll(':scope > li')) : [];
    allSections.forEach((section) => {
      section.style.display = '';
      section.classList.remove('active-tab-content');
      section.setAttribute('aria-expanded', 'false');
      // Remove explore links
      const exploreLink = section.querySelector('.explore-section-link');
      if (exploreLink) {
        exploreLink.remove();
      }
    });
  }

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
  const contentWrapper = fragment.querySelector('.default-content');
  if (!contentWrapper) return;

  // Create the three main sections
  const navBrand = document.createElement('div');
  navBrand.classList.add('nav-brand', 'section');

  const navSections = document.createElement('div');
  navSections.classList.add('nav-sections', 'section');

  const navTools = document.createElement('div');
  navTools.classList.add('nav-tools', 'section');

  // Extract logo from fragment (if exists) or use default
  // Authoring contract: Logo should be in a section with data-id="logo"
  let logoImgSrc = './media_104481e8050954141720a87a3e4a576a65e2e8774.png';
  let logoImgAlt = 'IDFC FIRST Bank';

  const logoSection = fragment.querySelector('.section[data-id="logo"]');
  if (logoSection) {
    const logoImg = logoSection.querySelector('img');
    if (logoImg) {
      const srcFromFragment = logoImg.getAttribute('src');
      logoImgAlt = logoImg.getAttribute('alt') || logoImgAlt;

      if (srcFromFragment) {
        logoImgSrc = srcFromFragment;
      }
    }
  } else {
    // Fallback: Look for the last image in the fragment (backward compatibility)
    const allImages = fragment.querySelectorAll('img');
    if (allImages.length > 0) {
      const lastImg = allImages[allImages.length - 1];
      const srcFromFragment = lastImg.getAttribute('src');
      logoImgAlt = lastImg.getAttribute('alt') || logoImgAlt;

      if (srcFromFragment) {
        logoImgSrc = srcFromFragment;
      }
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

  // Get sections from the fragment
  const sections = fragment.querySelectorAll(':scope > .section');

  sections.forEach((section) => {
    // Get section data-id as title
    const sectionId = section.getAttribute('data-id');
    if (!sectionId) return;

    // Get H2 and links from section
    const h2 = section.querySelector('h2');
    const links = section.querySelectorAll('a');
    if (!h2 || links.length === 0) return;

    let title;
    let titleUrl = null;
    let fragmentPath;

    if (links.length >= 2) {
      // Has both title link and fragment path
      const titleLink = links[0];
      const fragmentLink = links[1];
      title = titleLink.textContent.trim();
      titleUrl = titleLink.getAttribute('href');
      fragmentPath = fragmentLink.getAttribute('href');
    } else {
      // Only has fragment path, title is plain text in H2
      title = h2.textContent.trim();
      fragmentPath = links[0].getAttribute('href');
    }

    if (!fragmentPath) return;

    // Create nav item
    const li = document.createElement('li');
    li.setAttribute('data-fragment-path', fragmentPath);
    if (titleUrl) {
      li.setAttribute('data-title-url', titleUrl);
    }
    li.setAttribute('aria-expanded', 'false');

    const titleP = document.createElement('p');
    const titleA = document.createElement('a');
    titleA.textContent = title;
    titleA.href = titleUrl || '#';
    titleA.classList.add('nav-title-link');

    // If no URL, prevent navigation on both desktop and mobile
    if (!titleUrl) {
      titleA.addEventListener('click', (e) => e.preventDefault());
    }

    titleP.appendChild(titleA);
    li.appendChild(titleP);

    navSectionsUl.appendChild(li);
  });

  navSectionsWrapper.appendChild(navSectionsUl);
  navSections.appendChild(navSectionsWrapper);

  // Cache frequently accessed DOM elements for performance
  const domCache = {
    navSectionsUl,
    get allNavSections() {
      // Lazy getter that returns fresh array each time (in case DOM changes)
      return Array.from(this.navSectionsUl.querySelectorAll(':scope > li'));
    },
  };

  // Build nav-tools section
  // Authoring contract: Section must have data-id="nav-tools"
  const navToolsWrapper = document.createElement('div');
  navToolsWrapper.classList.add('default-content-wrapper');

  // Find the nav-tools section by exact ID match
  const toolsSection = Array.from(sections).find((section) => {
    const sectionId = section.getAttribute('data-id');
    return sectionId === 'nav-tools';
  });

  let searchP;
  let toolsUl;

  if (toolsSection) {
    // Get content from the tools section
    const toolsContent = toolsSection.querySelector('.default-content');
    if (toolsContent) {
      // Authoring contract: First <p> with <strong> is the search bar text
      searchP = toolsContent.querySelector('p strong')?.parentElement;

      // Authoring contract: First <ul> is the tools list (odometer items + login)
      toolsUl = toolsContent.querySelector('ul');
    }
  }

  // Add search bar with icon and input field (created programmatically)
  if (searchP) {
    // Extract just the text content from the authored paragraph
    const searchText = searchP.textContent.trim();
    // Create new search element with icon and input
    const searchElement = document.createElement('p');
    searchElement.id = 'search-box';
    searchElement.innerHTML = `<span class="icon icon-search"></span><input type="text" placeholder="${searchText}" class="search-input" />`;
    navToolsWrapper.appendChild(searchElement);
  }

  // Extract odometer items from original list (before cloning/modifying)
  let odometerItemTexts = [];
  if (toolsUl) {
    const originalLis = Array.from(toolsUl.querySelectorAll('li'));
    if (originalLis.length > 1) {
      // Get all items except the last one (Login)
      odometerItemTexts = originalLis.slice(0, -1).map((li) => li.textContent.trim());
    }
  }

  // Build the tools list with dynamic odometer
  if (toolsUl) {
    const toolsUlClone = toolsUl.cloneNode(true);
    const allLis = Array.from(toolsUlClone.querySelectorAll('li'));

    if (allLis.length > 1) {
      // Get all items except the last one (Login)
      const odometerItems = allLis.slice(0, -1);
      const loginLi = allLis[allLis.length - 1];

      // Build odometer HTML from the list items
      const odometerSpans = odometerItems.map((li) => `<span>${li.textContent.trim()}</span>`).join('');
      // Add first item again at the end for seamless loop
      const firstItemText = odometerItems[0].textContent.trim();
      const odometerHTML = `
        <div class="grnt-animation-odometer">
          <div class="grnt-odometer-track">
            ${odometerSpans}
            <span>${firstItemText}</span>
          </div>
        </div>
      `;

      // Replace the first LI with the odometer
      const firstLi = toolsUlClone.querySelector('li:first-child');
      if (firstLi) {
        firstLi.innerHTML = odometerHTML;
      }

      // Remove the middle items (they're now in the odometer)
      odometerItems.slice(1).forEach((li) => li.remove());

      // Add login icon to the last <li> (authoring contract: last item is always Login)
      if (loginLi) {
        const existingIcon = loginLi.querySelector('.icon-login_header');
        if (!existingIcon) {
          const loginIcon = document.createElement('span');
          loginIcon.classList.add('icon', 'icon-login_header');
          loginLi.prepend(loginIcon);
        }
      }
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

  // Customer service dropdown - shared reference for both desktop and mobile
  let csDropdownOpen = null;

  // Customer service dropdown
  const odometerEl = navTools.querySelector('.grnt-animation-odometer');
  const odometerLi = odometerEl?.closest('li');
  if (odometerLi) {
    const dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';
    document.body.appendChild(dropdown);

    let loaded = false;
    let closeTimeout = null;
    odometerLi.style.cursor = 'pointer';

    const openDropdown = async () => {
      clearTimeout(closeTimeout);
      if (!loaded) {
        const csFragment = await loadFragment('/fragments/customer-service-dropdown');
        if (csFragment) dropdown.append(...csFragment.childNodes);
        loaded = true;
      }
      dropdown.classList.add('open');
    };

    const closeDropdown = () => {
      dropdown.classList.remove('open');
    };

    const scheduleClose = () => {
      clearTimeout(closeTimeout);
      closeTimeout = setTimeout(closeDropdown, 100);
    };

    // Desktop: hover behavior
    odometerLi.addEventListener('mouseenter', () => {
      if (isDesktop.matches) openDropdown();
    });
    dropdown.addEventListener('mouseenter', () => {
      clearTimeout(closeTimeout);
    });
    dropdown.addEventListener('mouseleave', (e) => {
      if (isDesktop.matches && !odometerLi.contains(e.relatedTarget)) scheduleClose();
    });
    odometerLi.addEventListener('mouseleave', (e) => {
      if (isDesktop.matches && !dropdown.contains(e.relatedTarget)) scheduleClose();
    });

    // Store openDropdown function for mobile odometer use
    csDropdownOpen = openDropdown;

    // Mobile: click behavior, close on click outside
    odometerLi.addEventListener('click', () => {
      if (!isDesktop.matches) openDropdown();
    });
    document.addEventListener('click', (e) => {
      const clickedMobileOdometer = e.target.closest('.mobile-customer-service-odometer');
      const isOutsideClick = !dropdown.contains(e.target)
        && !odometerLi.contains(e.target)
        && !clickedMobileOdometer;
      if (!isDesktop.matches && isOutsideClick) {
        closeDropdown();
      }
    });
  }

  // Search dropdown
  const searchBox = navToolsWrapper.querySelector('#search-box');
  if (searchBox) {
    const searchDropdown = document.createElement('div');
    searchDropdown.className = 'search-dropdown';
    document.body.appendChild(searchDropdown);

    // Create invisible bridge element to keep dropdown open when moving mouse
    const searchBridge = document.createElement('div');
    searchBridge.className = 'search-dropdown-bridge';
    document.body.appendChild(searchBridge);

    let searchLoaded = false;
    let searchCloseTimeout = null;

    const openSearchDropdown = async () => {
      clearTimeout(searchCloseTimeout);
      if (!searchLoaded) {
        const searchFragment = await loadFragment('/fragments/search-dropdown');
        if (searchFragment) searchDropdown.append(...searchFragment.childNodes);
        searchLoaded = true;
      }
      searchDropdown.classList.add('open');
      searchBridge.classList.add('open');
    };

    const closeSearchDropdown = () => {
      searchDropdown.classList.remove('open');
      searchBridge.classList.remove('open');
    };

    const scheduleSearchClose = () => {
      clearTimeout(searchCloseTimeout);
      searchCloseTimeout = setTimeout(closeSearchDropdown, 100);
    };

    // Click to open (on the search box container, not just the input)
    searchBox.addEventListener('click', () => {
      openSearchDropdown();
    });

    // Keep open when mouse enters dropdown or bridge
    searchDropdown.addEventListener('mouseenter', () => {
      clearTimeout(searchCloseTimeout);
    });

    searchBridge.addEventListener('mouseenter', () => {
      clearTimeout(searchCloseTimeout);
    });

    // Close when mouse leaves dropdown (not going to search box or bridge)
    searchDropdown.addEventListener('mouseleave', (e) => {
      if (!searchBox.contains(e.relatedTarget) && !searchBridge.contains(e.relatedTarget)) {
        scheduleSearchClose();
      }
    });

    // Close when mouse leaves bridge (not going to search box or dropdown)
    searchBridge.addEventListener('mouseleave', (e) => {
      if (!searchBox.contains(e.relatedTarget) && !searchDropdown.contains(e.relatedTarget)) {
        scheduleSearchClose();
      }
    });

    // Close when mouse leaves search box (not going to dropdown or bridge)
    searchBox.addEventListener('mouseleave', (e) => {
      if (!searchDropdown.contains(e.relatedTarget) && !searchBridge.contains(e.relatedTarget)) {
        scheduleSearchClose();
      }
    });

    // Close on click outside (header or below modal)
    document.addEventListener('click', (e) => {
      const isOutsideClick = !searchDropdown.contains(e.target)
        && !searchBox.contains(e.target)
        && !searchBridge.contains(e.target);
      if (isOutsideClick && searchDropdown.classList.contains('open')) {
        closeSearchDropdown();
      }
    });
  }

  // Create mobile odometer for Customer Service (displayed at top when nav expanded)
  const mobileOdometerContainer = document.createElement('div');
  mobileOdometerContainer.className = 'mobile-customer-service-odometer';

  // Use the same odometer items extracted above
  if (odometerItemTexts.length > 0) {
    const mobileOdometerSpans = odometerItemTexts.map((text) => `<span>${text}</span>`).join('');
    const firstItemText = odometerItemTexts[0];

    mobileOdometerContainer.innerHTML = `
      <div class="grnt-animation-odometer">
        <div class="grnt-odometer-track">
          ${mobileOdometerSpans}
          <span>${firstItemText}</span>
        </div>
      </div>
    `;
  }

  // Mobile odometer click handler - open customer service dropdown
  if (mobileOdometerContainer) {
    mobileOdometerContainer.style.cursor = 'pointer';
    mobileOdometerContainer.addEventListener('click', () => {
      if (!isDesktop.matches && csDropdownOpen) {
        csDropdownOpen();
      }
    });
  }

  // Start mobile odometer animation (only when nav is first expanded)
  let mobileOdometerStarted = false;
  function startMobileOdometerAnimation() {
    if (mobileOdometerStarted) return;
    mobileOdometerStarted = true;

    const mobileOdometerTrack = mobileOdometerContainer.querySelector('.grnt-odometer-track');
    if (!mobileOdometerTrack) return;

    const spans = mobileOdometerTrack.querySelectorAll('span');
    const spanHeight = 20;
    const totalItems = spans.length - 1;
    let currentIndex = 0;

    // Ensure we start at the first item
    mobileOdometerTrack.style.transform = 'translateY(0)';

    setInterval(() => {
      currentIndex += 1;
      const translateY = currentIndex * spanHeight;
      mobileOdometerTrack.style.transform = `translateY(-${translateY}px)`;

      if (currentIndex >= totalItems) {
        setTimeout(() => {
          mobileOdometerTrack.style.transition = 'none';
          mobileOdometerTrack.style.transform = 'translateY(0)';
          currentIndex = 0;
          setTimeout(() => {
            mobileOdometerTrack.style.transition = 'transform 0.6s ease-in-out';
          }, 50);
        }, 600);
      }
    }, 1500);
  }

  // Watch for nav expansion to start mobile odometer
  const navObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'aria-expanded') {
        const isExpanded = nav.getAttribute('aria-expanded') === 'true';
        if (isExpanded && !mobileOdometerStarted) {
          setTimeout(startMobileOdometerAnimation, 100);
        }
      }
    });
  });
  navObserver.observe(nav, { attributes: true });

  // Assemble the navigation
  nav.appendChild(navBrand);
  nav.appendChild(mobileOdometerContainer); // Add mobile odometer
  nav.appendChild(navSections);
  nav.appendChild(navTools);

  /**
   * Process category-nav section content
   */
  function processCategoryNavSection(section) {
    const defaultContent = section.querySelector('.default-content');
    if (!defaultContent) return null;

    const categoryNavBlock = section.querySelector('.category-nav.block');
    if (!categoryNavBlock) return null;

    const titleP = defaultContent.querySelector('p');
    if (!titleP) return null;

    return {
      titleText: titleP.textContent.trim(),
      content: categoryNavBlock.cloneNode(true),
    };
  }

  /**
   * Process standard section content for mobile accordion view
   */
  function processStandardSectionMobile(section) {
    const defaultContent = section.querySelector('.default-content');
    if (!defaultContent) return null;

    const children = Array.from(defaultContent.children);
    if (children.length === 0) return null;

    // Check for Cards blocks at the section level (they're siblings of default-content)
    const cardsBlocks = section.querySelectorAll('.cards.block');

    const titleElement = children.find((child) => child.tagName === 'H3');
    if (!titleElement) return null;

    const titleText = titleElement.textContent;

    // Extract "View All" link from H3 if it exists
    let viewAllLink = null;
    const h3Link = titleElement.querySelector('a');
    if (h3Link) {
      viewAllLink = {
        text: 'View All',
        url: h3Link.href,
      };
    }

    // Create wrapper for non-title children
    const sectionContent = document.createElement('div');

    // Always add section title at the top, with optional "View All" button
    const viewAllWrapper = document.createElement('div');
    viewAllWrapper.classList.add('nav-view-all-wrapper');

    const sectionTitle = document.createElement('span');
    sectionTitle.classList.add('nav-view-all-section-title');
    sectionTitle.textContent = titleText;
    viewAllWrapper.appendChild(sectionTitle);

    // Add "View All" button only if link exists
    if (viewAllLink) {
      const viewAllBtn = document.createElement('a');
      viewAllBtn.href = viewAllLink.url;
      viewAllBtn.classList.add('nav-view-all-btn');
      viewAllBtn.innerHTML = `${viewAllLink.text} <span class="icon icon-arrow-right-alt"></span>`;
      viewAllWrapper.appendChild(viewAllBtn);
      // Decorate the icon we just created (it wasn't in the fragment)
      decorateIcons(viewAllBtn);
    }

    sectionContent.appendChild(viewAllWrapper);

    // Process children and handle H4 subsections
    let currentH4Section = null;
    let currentH4Content = null;

    children.forEach((child) => {
      if (child.tagName === 'H3') {
        return; // Skip H3, we already processed it
      }

      // Check if this is a block element (like Cards, etc.)
      const isBlock = child.classList && (child.classList.contains('block') || child.classList.contains('cards'));

      if (child.tagName === 'H4') {
        // Close previous H4 section if exists
        if (currentH4Section) {
          sectionContent.appendChild(currentH4Section);
        }

        // Create new H4 section (not an accordion, just a header with content)
        currentH4Section = document.createElement('div');
        currentH4Section.classList.add('nav-h4-section');

        const h4Title = document.createElement('p');
        h4Title.classList.add('nav-h4-section-title');
        h4Title.textContent = child.textContent.trim();
        currentH4Section.appendChild(h4Title);

        currentH4Content = document.createElement('ul');
        currentH4Content.classList.add('nav-h4-section-content');
        currentH4Section.appendChild(currentH4Content);
      } else if (isBlock) {
        // Blocks should ALWAYS be top-level, never nested under H4
        // Close current H4 section if exists
        if (currentH4Section) {
          sectionContent.appendChild(currentH4Section);
          currentH4Section = null;
          currentH4Content = null;
        }
        // Add block at top level
        sectionContent.appendChild(child.cloneNode(true));
      } else if (currentH4Section) {
        // Add content under current H4
        const li = document.createElement('li');
        li.appendChild(child.cloneNode(true));
        currentH4Content.appendChild(li);
      } else {
        // Top-level content (no H4)
        sectionContent.appendChild(child.cloneNode(true));
      }
    });

    // Don't forget to append the last H4 section if exists
    if (currentH4Section) {
      sectionContent.appendChild(currentH4Section);
    }

    // Add any Cards blocks from the section (they're siblings of default-content)
    cardsBlocks.forEach((cardsBlock) => {
      // Wrap the cards block in a container with "Discover" heading
      const discoverContainer = document.createElement('div');
      discoverContainer.classList.add('nav-discover-section');

      const discoverHeading = document.createElement('p');
      discoverHeading.classList.add('nav-discover-heading');
      discoverHeading.textContent = 'Discover';

      discoverContainer.appendChild(discoverHeading);
      discoverContainer.appendChild(cardsBlock.cloneNode(true));

      sectionContent.appendChild(discoverContainer);
    });

    return {
      titleText,
      content: sectionContent,
    };
  }

  /**
   * Decorate category-nav blocks after adding to DOM
   */
  function decorateCategoryNavBlocks(ul) {
    const categoryNavBlocks = ul.querySelectorAll('.category-nav.block');
    if (categoryNavBlocks.length === 0) return;

    // Load category-nav CSS if not already loaded
    const cssPath = '/blocks/category-nav/category-nav.css';
    if (!document.querySelector(`link[href="${cssPath}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      document.head.appendChild(link);
    }

    // Decorate category-nav blocks
    categoryNavBlocks.forEach((navBlock) => {
      // Mark as fragment block to prevent duplicate decoration
      navBlock.setAttribute('data-fragment-block', 'true');

      // For fragment blocks, we need to manually parse and build the dropdown
      // instead of using the full decorate() function which builds a unified nav
      const categoryData = parseCategoryNavBlock(navBlock);
      const dropdown = buildDropdown(categoryData);

      if (dropdown) {
        // Replace the raw block content with the styled dropdown
        navBlock.innerHTML = '';
        navBlock.appendChild(dropdown);
      }
    });
  }

  /**
   * Setup mobile accordion behavior using event delegation
   */
  function setupMobileAccordionBehavior(ul) {
    ul.addEventListener('click', (e) => {
      // Find the closest nav-fragment-section
      const sectionItem = e.target.closest('.nav-fragment-section');

      // Only process if we're inside a section but not clicking content links
      if (!sectionItem || e.target.closest('.nav-fragment-section-content')) return;

      const subUl = sectionItem.querySelector('.nav-fragment-section-content');
      if (subUl) {
        const expanded = sectionItem.getAttribute('aria-expanded') === 'true';

        // Close all other sections first (accordion behavior)
        const allSections = ul.querySelectorAll('.nav-fragment-section');
        allSections.forEach((section) => {
          if (section !== sectionItem) {
            section.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle the clicked section
        const { scrollHeight } = subUl;
        sectionItem.style.setProperty('--section-scroll-height', `${scrollHeight}px`);
        sectionItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }
    });
  }

  /**
   * Setup desktop accordion behavior - click section titles to show content in column 2
   */
  function setupDesktopAccordionBehavior(ul) {
    ul.addEventListener('click', (e) => {
      // Find the closest nav-fragment-section
      const sectionItem = e.target.closest('.nav-fragment-section');

      // Only process clicks on the title (column 1)
      if (!sectionItem || !e.target.closest('.nav-fragment-section-title')) return;

      const expanded = sectionItem.getAttribute('aria-expanded') === 'true';

      // Close all other sections first (accordion behavior)
      const allSections = ul.querySelectorAll('.nav-fragment-section');
      allSections.forEach((section) => {
        if (section !== sectionItem) {
          section.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle the clicked section
      sectionItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');

      // Auto-expand first section on load (for desktop)
      if (!expanded && allSections.length > 0 && sectionItem === allSections[0]) {
        sectionItem.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /**
   * Load fragment content and build structure based on viewport
   * Both Desktop and Mobile: Use nested accordion structure
   * Desktop has different visual presentation via CSS
   */
  async function loadNavFragmentContent(navSection, isMobile = false) {
    const fragmentPath = navSection.getAttribute('data-fragment-path');
    if (!fragmentPath || navSection.getAttribute('data-fragment-loaded') === 'true') {
      return true;
    }

    try {
      const fragmentContent = await loadFragment(fragmentPath);
      if (!fragmentContent) return false;

      const fragmentSections = fragmentContent.querySelectorAll('.section');
      const ul = document.createElement('ul');
      ul.classList.add('nav-fragment-content');

      // Both mobile and desktop use nested accordion structure now
      fragmentSections.forEach((section) => {
        // Try category-nav first, then standard processing
        const processed = processCategoryNavSection(section)
          || processStandardSectionMobile(section);

        if (!processed) return;

        // Create accordion item for this section
        const sectionLi = document.createElement('li');
        sectionLi.classList.add('nav-fragment-section');
        sectionLi.setAttribute('aria-expanded', 'false');

        // Create clickable title
        const titleWrapper = document.createElement('p');
        titleWrapper.classList.add('nav-fragment-section-title');
        titleWrapper.textContent = processed.titleText;
        sectionLi.appendChild(titleWrapper);

        // Create container for section content
        const sectionUl = document.createElement('ul');
        sectionUl.classList.add('nav-fragment-section-content');

        const contentLi = document.createElement('li');
        contentLi.appendChild(processed.content);
        sectionUl.appendChild(contentLi);

        sectionLi.appendChild(sectionUl);
        ul.appendChild(sectionLi);
      });

      if (ul.children.length > 0) {
        navSection.appendChild(ul);
        navSection.setAttribute('data-fragment-loaded', 'true');
        navSection.classList.add('nav-drop');

        // Note: Fragment content icons are already decorated by loadFragment()
        // Only newly created elements (like View All buttons) need decoration

        // Decorate any category-nav blocks that were added dynamically
        decorateCategoryNavBlocks(ul);

        // Decorate any other blocks (like Cards) that were added dynamically
        // Using cached imports for better performance
        const otherBlocks = ul.querySelectorAll('.block:not(.category-nav)');
        // eslint-disable-next-line no-restricted-syntax
        for (const blockElement of otherBlocks) {
          const blockName = Array.from(blockElement.classList).find((c) => c !== 'block');
          if (blockName) {
            try {
              // Check cache first
              let mod = blockModuleCache.get(blockName);
              if (!mod) {
                // Import and cache the module
                // eslint-disable-next-line no-await-in-loop
                mod = await import(`../${blockName}/${blockName}.js`);
                blockModuleCache.set(blockName, mod);
              }
              if (mod.default) {
                // eslint-disable-next-line no-await-in-loop
                await mod.default(blockElement);
              }
            } catch (error) {
              // Block doesn't have a JS file, that's ok
            }
          }
        }

        // Setup accordion behavior using event delegation
        if (isMobile) {
          setupMobileAccordionBehavior(ul);
        } else {
          setupDesktopAccordionBehavior(ul);
        }

        return true;
      }

      return false;
    } catch (error) {
      // Silently fail - fragment loading is optional
      return false;
    }
  }

  /**
   * Desktop: Hover shows dropdown, click on title navigates to page
   */
  function setupDesktopNavigation(navSection) {
    // Load and show dropdown on hover
    navSection.addEventListener('mouseenter', async () => {
      await loadNavFragmentContent(navSection, false); // false = desktop
      toggleAllNavSections(navSections);
      navSection.setAttribute('aria-expanded', 'true');

      // Auto-expand first section in the dropdown
      const firstSection = navSection.querySelector('.nav-fragment-section:first-child');
      if (firstSection) {
        firstSection.setAttribute('aria-expanded', 'true');
      }
    });

    // Hide dropdown when mouse leaves
    navSection.addEventListener('mouseleave', () => {
      navSection.setAttribute('aria-expanded', 'false');
      // Reset all inner sections
      const allInnerSections = navSection.querySelectorAll('.nav-fragment-section');
      allInnerSections.forEach((section) => {
        section.setAttribute('aria-expanded', 'false');
      });
    });

    // Title link navigates normally (no preventDefault)
    // This allows desktop users to click to go to the parent page
  }

  /**
   * Create "Explore" link for a section (DRY helper)
   */
  function createExploreLinkIfNeeded(section) {
    let exploreLink = section.querySelector('.explore-section-link');
    if (!exploreLink) {
      const titleUrl = section.getAttribute('data-title-url');
      const titleText = section.querySelector('.nav-title-link')?.textContent || '';

      if (titleUrl) {
        exploreLink = document.createElement('a');
        exploreLink.classList.add('explore-section-link');
        exploreLink.href = titleUrl;
        exploreLink.innerHTML = `Explore ${titleText} <span class="arrow">→</span>`;

        // Insert before the fragment content
        const fragmentContent = section.querySelector('.nav-fragment-content');
        if (fragmentContent) {
          fragmentContent.before(exploreLink);
        }
      }
    }
  }

  /**
   * Update tab bar active state (DRY helper)
   */
  function updateTabBarActiveState(selectedSection) {
    const tabBar = navSections.querySelector('.nav-tab-bar');
    if (tabBar) {
      const tabs = tabBar.querySelectorAll('.nav-tab');
      const selectedPath = selectedSection.getAttribute('data-fragment-path');
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.getAttribute('data-section-id') === selectedPath);
      });
    }
  }

  /**
   * Switch displayed tab content
   */
  async function switchTabContent(selectedSection) {
    const allSections = domCache.allNavSections;

    await loadNavFragmentContent(selectedSection, true);

    allSections.forEach((section) => {
      const isSelected = section === selectedSection;
      section.style.display = isSelected ? 'block' : 'none';
      section.classList.toggle('active-tab-content', isSelected);
      section.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
    });

    updateTabBarActiveState(selectedSection);
    createExploreLinkIfNeeded(selectedSection);
  }

  /**
   * Create tab bar (DRY helper)
   */
  function createTabBar() {
    const sectionsUl = domCache.navSectionsUl;
    const allSections = domCache.allNavSections;
    const tabBar = document.createElement('div');
    tabBar.classList.add('nav-tab-bar');

    allSections.forEach((section) => {
      const titleLink = section.querySelector('.nav-title-link');
      const titleText = titleLink ? titleLink.textContent : '';

      const tab = document.createElement('button');
      tab.classList.add('nav-tab');
      tab.textContent = titleText;
      tab.setAttribute('data-section-id', section.getAttribute('data-fragment-path'));
      tab.setAttribute('data-title-url', section.getAttribute('data-title-url') || '');

      tab.addEventListener('click', () => switchTabContent(section));
      tabBar.appendChild(tab);
    });

    sectionsUl.before(tabBar);
    return tabBar;
  }

  /**
   * Mobile: Switch to tab view when a nav section is clicked
   */
  function switchToTabView(selectedSection) {
    navSections.classList.add('tab-view-active');

    if (!navSections.querySelector('.nav-tab-bar')) {
      createTabBar();
    }

    switchTabContent(selectedSection);
  }

  /**
   * Mobile: Click to switch to tab view
   */
  function setupMobileNavigation(navSection) {
    const titleLink = navSection.querySelector('.nav-title-link');

    navSection.addEventListener('click', async (e) => {
      // Don't handle clicks if already in tab view
      if (navSections.classList.contains('tab-view-active')) {
        return;
      }

      // Don't handle clicks on nested section items
      if (e.target.closest('.nav-fragment-section')) return;

      // Prevent title link navigation on mobile
      if (e.target === titleLink) {
        e.preventDefault();
      }

      // Switch to tab view
      switchToTabView(navSection);
    });
  }

  /**
   * Initialize navigation behavior based on viewport
   */
  domCache.allNavSections.forEach((navSection) => {
    const fragmentPath = navSection.getAttribute('data-fragment-path');
    if (!fragmentPath) return;

    if (isDesktop.matches) {
      setupDesktopNavigation(navSection);
    } else {
      setupMobileNavigation(navSection);
    }
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

  // prevent mobile nav behavior on window resize - always start collapsed
  toggleMenu(nav, navSections, false);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
