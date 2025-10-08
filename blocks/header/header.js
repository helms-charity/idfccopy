import { getMetadata } from '../../scripts/aem.js';
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
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  // Get logo image src and alt from nav-brand
  let logoImgSrc = '/content/dam/idfcfirstbank/images/n1/IDFC-logo-website.svg';
  let logoImgAlt = 'Logo';
  const navBrandImg = navBrand ? navBrand.querySelector('img') : null;
  if (navBrandImg) {
    logoImgSrc = navBrandImg.getAttribute('src') || logoImgSrc;
    logoImgAlt = navBrandImg.getAttribute('alt') || logoImgAlt;
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    // Inject custom mobile HTML if not desktop and not already present
    if (!isDesktop.matches && !navSections.querySelector('.container.mm-top-in')) {
      const mobileContainer = document.createElement('div');
      mobileContainer.className = 'container';
      mobileContainer.innerHTML = `
        <div class="mm-top-in">
          <div class="logo"> <a href="//www.idfcfirstbank.com" aria-label="Menu"> <img src="${logoImgSrc}" alt="${logoImgAlt}"> </a> </div>
          <a href="javascript:void(0)" class="cls-mm" aria-label="Close Icon"> <span id="icon-close-mobile" class="icon-close"></span>
          </a>
        </div>
      `;
      navSections.insertBefore(mobileContainer, navSections.firstChild);
      // Add close event for mobile close button
      const closeBtn = mobileContainer.querySelector('.cls-mm');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Find the nav element and navSections
          const nav = mobileContainer.closest('nav');
          const navSections = nav ? nav.querySelector('.nav-sections') : null;
          if (nav && navSections) {
            toggleMenu(nav, navSections, false);
          }
        });
      }

      // Find .sectionlast element and move it to new li after first li in mobile navigation
      const sectionLast = nav.querySelector('.sectionlast');
      if (sectionLast) {
        // Add event listener to .drop-down elements inside .sectionlast
        const dropDowns = sectionLast.querySelectorAll('.drop-down');
        dropDowns.forEach((dropDown) => {
          dropDown.addEventListener('click', function () {
            const dropdownContent = dropDown.querySelector('.dropdown-content');
            if (dropdownContent) {
              const isExpanded = dropDown.getAttribute('expanded') === 'true';
              // Collapse all other drop-downs
              const allDropDowns = sectionLast.querySelectorAll('.drop-down');
              allDropDowns.forEach(dd => {
                dd.setAttribute('expanded', 'false');
                dd.style.setProperty('--scroll-height', '0px');
              });
              if (!isExpanded) {
                // Measure the height of the .drop-down itself
                const scrollHeight = dropDown.scrollHeight;
                dropDown.style.setProperty('--scroll-height', `${scrollHeight}px`);
                dropDown.setAttribute('expanded', 'true');
              } else {
                dropDown.setAttribute('expanded', 'false');
                dropDown.style.setProperty('--scroll-height', '0px');
              }
            }
          });
        });
        const firstLi = navSections.querySelector('.default-content-wrapper > ul:first-child > li:first-child');
        if (firstLi) {
          // Create new li element
          const newLi = document.createElement('li');
          // Remove the 'section' class from the original element
          sectionLast.classList.remove('section');
          // Move the sectionlast element to the new li (cut and paste)
          newLi.appendChild(sectionLast);
          // Insert the new li after the first li
          firstLi.parentNode.insertBefore(newLi, firstLi.nextSibling);

          // Add click event listeners to li elements inside the moved .sectionlast
          const movedLiElements = sectionLast.querySelectorAll('li');
          movedLiElements.forEach((li) => {
            li.addEventListener('click', () => {
              // Get the scrollHeight value and set it as CSS custom property
              const scrollHeightValue = li.scrollHeight;
              li.style.setProperty('--scroll-height', scrollHeightValue + 'px');
            });
          });
        }
      }
    }

    // Prevent clicks inside nav-sections from closing the mobile menu
    if (!isDesktop.matches) {
      navSections.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Prevent focusout events from closing the menu when clicking inside nav-sections
      navSections.addEventListener('focusout', (e) => {
        if (navSections.contains(e.relatedTarget)) {
          e.stopPropagation();
        }
      });
    }

    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }

        if (!isDesktop.matches) {
            const scrollHeight = navSection.querySelector('ul').scrollHeight;
            navSection.style.setProperty('--scroll-height', `${scrollHeight}px`);
            const expanded = navSection.getAttribute('aria-expanded') === 'true';
            toggleAllNavSections(navSections);
            navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // Insert 'Explore Personal Banking' as second li in nav-sections
  const navSectionsUl = nav.querySelector('#nav > div.section.nav-sections > div.default-content-wrapper > ul');
  if (navSectionsUl) {
    const newLi = document.createElement('li');
    newLi.innerHTML = '<div class="main-link"><a href="//www.idfcfirstbank.com">Explore Personal Banking</a></div>';
    if (navSectionsUl.children.length > 0) {
      navSectionsUl.insertBefore(newLi, navSectionsUl.children[1] || null);
    } else {
      navSectionsUl.appendChild(newLi);
    }
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;

  // Move nav-tools li:nth-child(1) into hamburger in mobile view
  if (!isDesktop.matches) {
    const navToolsLi1 = nav.querySelector('#nav > div.section.nav-tools > div > ul > li:nth-child(1)');
    if (navToolsLi1) {
      // Convert li to button
      const button = document.createElement('button');
      
      button.textContent = navToolsLi1.textContent;
      // Copy classes (optional, or set your own)
      button.id = 'cust-service';

      // Append as first child
      nav.insertBefore(button, nav.firstChild);
    }
  }
  hamburger.addEventListener('click', () => {
    toggleMenu(nav, navSections);
    // Add click event listeners to .drop-down elements inside .sectionlast, only once
    const sectionLast = nav.querySelector('.sectionlast');
    if (sectionLast) {
      const dropDowns = sectionLast.querySelectorAll('.drop-down');
      dropDowns.forEach((dropDown) => {
        if (!dropDown.dataset.listenerAdded) {
          dropDown.addEventListener('click', function () {
            const isExpanded = dropDown.getAttribute('aria-expanded') === 'true';
            if (!isExpanded) {
              const scrollHeight = dropDown.scrollHeight;
              dropDown.style.setProperty('--scroll-height', `${scrollHeight}px`);
              dropDown.setAttribute('aria-expanded', 'true');
            } else {
              dropDown.style.setProperty('--scroll-height', '0px');
              dropDown.setAttribute('aria-expanded', 'false');
            }
          });
          dropDown.dataset.listenerAdded = 'true';
        }
      });
    }
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

  const menuItems = document.querySelectorAll('.sectionlast .default-content-wrapper ul li');
  menuItems.forEach((li, index) => {
    li.id = `fragment-item-${index + 1}`;
  });
}