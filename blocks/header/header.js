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

  // Debug: log what we got from the fragment
  // eslint-disable-next-line no-console
  console.log('Fragment:', fragment);
  // eslint-disable-next-line no-console
  console.log('ContentWrapper:', contentWrapper);

  // Get sections from the fragment
  const sections = fragment.querySelectorAll(':scope > .section');
  // eslint-disable-next-line no-console
  console.log('Found sections:', sections.length, sections);

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

  // Build nav-tools section - look for tools/customer-service section
  const navToolsWrapper = document.createElement('div');
  navToolsWrapper.classList.add('default-content-wrapper');

  // Find the tools section (could be "tools", "customer service", "customer-service", etc.)
  const toolsSection = Array.from(sections).find((section) => {
    const sectionId = section.getAttribute('data-id');
    return sectionId && (
      sectionId.toLowerCase().includes('tool')
      || sectionId.toLowerCase().includes('customer')
      || sectionId.toLowerCase().includes('service')
    );
  });

  let searchP;
  let toolsUl;

  if (toolsSection) {
    // Get content from the tools section
    const toolsContent = toolsSection.querySelector('.default-content');
    if (toolsContent) {
      // Find search bar text
      searchP = Array.from(toolsContent.querySelectorAll('p')).find((p) => {
        const strong = p.querySelector('strong');
        return strong && strong.textContent.toLowerCase().includes('what are you looking for');
      });

      // Find the tools list (Customer Service items + Login)
      toolsUl = toolsContent.querySelector('ul');
    }
  }

  // Add search bar with icon (created programmatically)
  if (searchP) {
    // Extract just the text content from the authored paragraph
    const searchText = searchP.textContent.trim();
    // Create new search element with icon
    const searchElement = document.createElement('p');
    searchElement.innerHTML = `<span class="icon icon-search"></span><strong>${searchText}</strong>`;
    navToolsWrapper.appendChild(searchElement);
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

      // Add login icon to the Login li (should now be the last child)
      if (loginLi && loginLi.textContent.toLowerCase().includes('login')) {
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

  // Assemble the navigation
  nav.appendChild(navBrand);
  nav.appendChild(navSections);
  nav.appendChild(navTools);

  /**
   * Load fragment content and build structure based on viewport
   * Desktop: Flat list of all content
   * Mobile: Nested accordion by section
   */
  async function loadNavFragmentContent(navSection, isMobile = false) {
    const fragmentPath = navSection.getAttribute('data-fragment-path');
    if (!fragmentPath || navSection.getAttribute('data-fragment-loaded') === 'true') {
      return true;
    }

    try {
      const fragmentContent = await loadFragment(fragmentPath);
      if (fragmentContent) {
        const fragmentSections = fragmentContent.querySelectorAll('.section');
        const ul = document.createElement('ul');
        ul.classList.add('nav-fragment-content');

        if (isMobile) {
          // Mobile: Create nested accordion structure
          fragmentSections.forEach((section) => {
            const defaultContent = section.querySelector('.default-content');
            if (!defaultContent) return;

            // Check if this section has a category-nav block (special case for ccnav)
            const categoryNavBlock = section.querySelector('.category-nav.block');

            let titleText;
            let contentToAdd;

            if (categoryNavBlock) {
              // Special handling for category-nav sections
              // Get title from default-content
              const titleP = defaultContent.querySelector('p');
              if (!titleP) return;
              titleText = titleP.textContent.trim();

              // Use the entire category-nav block as content
              contentToAdd = categoryNavBlock.cloneNode(true);
            } else {
              // Standard handling for regular sections with H3 titles
              const children = Array.from(defaultContent.children);
              if (children.length === 0) return;

              const titleElement = children.find((child) => child.tagName === 'H3');
              if (!titleElement) return;

              titleText = titleElement.textContent;

              // Create wrapper for non-title children
              contentToAdd = document.createElement('div');
              children.forEach((child) => {
                if (child.tagName !== 'H3') {
                  contentToAdd.appendChild(child.cloneNode(true));
                }
              });
            }

            if (!titleText) return;

            // Create accordion item for this section
            const sectionLi = document.createElement('li');
            sectionLi.classList.add('nav-fragment-section');
            sectionLi.setAttribute('aria-expanded', 'false');

            // Create clickable title
            const titleWrapper = document.createElement('p');
            titleWrapper.classList.add('nav-fragment-section-title');
            titleWrapper.textContent = titleText;
            sectionLi.appendChild(titleWrapper);

            // Create container for section content
            const sectionUl = document.createElement('ul');
            sectionUl.classList.add('nav-fragment-section-content');

            const contentLi = document.createElement('li');
            contentLi.appendChild(contentToAdd);
            sectionUl.appendChild(contentLi);

            sectionLi.appendChild(sectionUl);
            ul.appendChild(sectionLi);
          });
        } else {
          // Desktop: Flat list of all content
          fragmentSections.forEach((section) => {
            const defaultContent = section.querySelector('.default-content');
            if (!defaultContent) return;

            // Check if this section has a category-nav block
            const categoryNavBlock = section.querySelector('.category-nav.block');

            if (categoryNavBlock) {
              // For category-nav sections, add the entire block
              const li = document.createElement('li');
              li.appendChild(categoryNavBlock.cloneNode(true));
              ul.appendChild(li);
            } else {
              // For regular sections, add all children from default-content
              const children = Array.from(defaultContent.children);
              children.forEach((child) => {
                const li = document.createElement('li');
                li.appendChild(child.cloneNode(true));
                ul.appendChild(li);
              });
            }
          });
        }

        if (ul.children.length > 0) {
          navSection.appendChild(ul);
          navSection.setAttribute('data-fragment-loaded', 'true');
          navSection.classList.add('nav-drop');

          // Decorate any category-nav blocks that were added
          const categoryNavBlocks = ul.querySelectorAll('.category-nav.block');
          if (categoryNavBlocks.length > 0) {
            // Dynamically import and decorate category-nav blocks
            import('../category-nav/category-nav.js').then((module) => {
              categoryNavBlocks.forEach((navBlock) => {
                // Mark as fragment block to prevent duplicate decoration
                navBlock.setAttribute('data-fragment-block', 'true');
                module.default(navBlock);
              });
            }).catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Failed to load category-nav module:', error);
            });
          }

          // Setup mobile accordion behavior for section items
          if (isMobile) {
            ul.querySelectorAll('.nav-fragment-section').forEach((sectionItem) => {
              sectionItem.addEventListener('click', (e) => {
                // Only toggle if clicking on the title, not on links
                if (e.target.closest('.nav-fragment-section-content')) return;

                const subUl = sectionItem.querySelector('.nav-fragment-section-content');
                if (subUl) {
                  const { scrollHeight } = subUl;
                  sectionItem.style.setProperty('--section-scroll-height', `${scrollHeight}px`);
                  const expanded = sectionItem.getAttribute('aria-expanded') === 'true';
                  sectionItem.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                }
              });
            });
          }

          return true;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load fragment:', error);
    }
    return false;
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
    });

    // Hide dropdown when mouse leaves
    navSection.addEventListener('mouseleave', () => {
      navSection.setAttribute('aria-expanded', 'false');
    });

    // Title link navigates normally (no preventDefault)
    // This allows desktop users to click to go to the parent page
  }

  /**
   * Mobile: Click to expand accordion-style with nested sections
   */
  function setupMobileNavigation(navSection) {
    const titleLink = navSection.querySelector('.nav-title-link');

    navSection.addEventListener('click', async (e) => {
      // Don't handle clicks on nested section items
      if (e.target.closest('.nav-fragment-section')) return;

      // Prevent title link navigation on mobile
      if (e.target === titleLink) {
        e.preventDefault();
      }

      // Load fragment if needed (with mobile structure)
      await loadNavFragmentContent(navSection, true); // true = mobile

      // Toggle accordion with height animation
      const subUl = navSection.querySelector('ul');
      if (subUl) {
        const { scrollHeight } = subUl;
        navSection.style.setProperty('--scroll-height', `${scrollHeight}px`);
        const expanded = navSection.getAttribute('aria-expanded') === 'true';
        toggleAllNavSections(navSections);
        navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }
    });
  }

  /**
   * Initialize navigation behavior based on viewport
   */
  navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
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

  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
