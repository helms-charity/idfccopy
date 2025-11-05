/**
 * Top Navigation (L2 Nav) - Third row navigation with dropdowns
 * Extracts content from page section with class "mid-banner"
 */

/**
 * Build a card from a list item
 */
function buildCard(item) {
    const card = document.createElement('div');
    card.classList.add('grdiantCard', 'grdP1');
  
    const link = item.querySelector('a');
    if (!link) {
      // Handle items without links (plain text)
      const cardText = document.createElement('div');
      cardText.classList.add('title');
      cardText.textContent = item.textContent.trim();
      card.appendChild(cardText);
      return card;
    }
  
    const cardLink = document.createElement('a');
    cardLink.href = link.getAttribute('href') || '#';
    cardLink.setAttribute('data-gtm-desk-l3cards-click', '');
  
    // Tags container (hidden by default for this structure)
    const tagsContainer = document.createElement('div');
    tagsContainer.classList.add('tags');
    tagsContainer.style.display = 'none';
    cardLink.appendChild(tagsContainer);
  
    // Card title
    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = link.textContent.trim();
  
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon-Right');
    title.appendChild(iconSpan);
  
    cardLink.appendChild(title);
    card.appendChild(cardLink);
  
    return card;
  }
  
  /**
   * Build dropdown content from heading and following elements
   */
  function buildDropdownContent(headerText, elements) {
    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown-content', 'animated', 'fadeIn', 'menu-cardList-cnt');
  
    // Header box
    const hdBx = document.createElement('div');
    hdBx.classList.add('hd-bx');
  
    const h4 = document.createElement('p');
    h4.classList.add('hd-bx-h4');
    h4.textContent = headerText;
    hdBx.appendChild(h4);
  
    dropdown.appendChild(hdBx);
  
    // Build card list from all ul elements
    const menuCardList = document.createElement('div');
    menuCardList.classList.add('menu-cardList', 'MT15');
  
    elements.forEach((element) => {
      if (element.tagName === 'UL') {
        const listItems = element.querySelectorAll(':scope > li');
        listItems.forEach((item) => {
          const card = buildCard(item);
          if (card) {
            menuCardList.appendChild(card);
          }
        });
      }
    });
  
    dropdown.appendChild(menuCardList);
    return dropdown;
  }
  
  /**
   * Parse mid-banner section content
   */
  function parseMidBannerContent(midBannerSection) {
    const navItems = [];
    const contentWrapper = midBannerSection.querySelector('.default-content-wrapper');
  
    if (!contentWrapper) return navItems;
  
    const children = Array.from(contentWrapper.children);
    let currentGroup = null;
  
    children.forEach((child) => {
      if (child.tagName === 'H1') {
        // Start a new group
        if (currentGroup) {
          navItems.push(currentGroup);
        }
  
        currentGroup = {
          title: child.textContent.trim().replace(/^&nbsp;/, ''),
          id: child.id || child.textContent.trim().toLowerCase().replace(/\s+/g, '-'),
          elements: [],
        };
      } else if (currentGroup) {
        // Add element to current group
        currentGroup.elements.push(child);
      }
    });
  
    // Add last group
    if (currentGroup) {
      navItems.push(currentGroup);
    }
  
    return navItems;
  }
  
  /**
   * Build navigation from parsed content
   */
  function buildNavigation(navItems) {
    const topNav = document.createElement('div');
    topNav.classList.add('top-nav', 'bg-light-white');
  
    const tabsPane = document.createElement('div');
    tabsPane.classList.add('tabs-pane-js');
  
    const tabPane = document.createElement('div');
    tabPane.classList.add('tab-pane', 'top-second-nav-js', 'active');
  
    const navList = document.createElement('ul');
    navList.classList.add('top-nav-left');
  
    navItems.forEach((item) => {
      const li = document.createElement('li');
      li.classList.add('drop-down', 'all-drop-down');
      li.setAttribute('data-header-gtm', item.title);
  
      const link = document.createElement('a');
      link.textContent = item.title;
      link.href = `#${item.id}`;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(item.id);
        if (target) {
          const yOffset = -200;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
      li.appendChild(link);
  
      // Find header text from first p element
      const firstP = item.elements.find((el) => el.tagName === 'P' && !el.classList.contains('button-container'));
      const headerText = firstP ? firstP.textContent.trim() : item.title;
  
      // Build dropdown
      const dropdown = buildDropdownContent(headerText, item.elements);
      if (dropdown) {
        li.appendChild(dropdown);
      }
  
      navList.appendChild(li);
    });
  
    tabPane.appendChild(navList);
    tabsPane.appendChild(tabPane);
    topNav.appendChild(tabsPane);
  
    return topNav;
  }
  
  export default function decorate(block) {
    // Find the mid-banner section on the page
    const midBannerSection = document.querySelector('.section.mid-banner');
  
    if (!midBannerSection) {
      // No mid-banner section found, hide the block
      block.style.display = 'none';
      return;
    }
  
    // Parse content from mid-banner section
    const navItems = parseMidBannerContent(midBannerSection);
  
    if (navItems.length === 0) {
      // No navigation items found
      block.style.display = 'none';
      return;
    }
  
    // Build navigation
    const topNav = buildNavigation(navItems);
  
    // Replace block content
    block.innerHTML = '';
    block.appendChild(topNav);
  
  // Move the anchor nav to the header section
  // Note: Header is guaranteed to be loaded first (see loadLazy in scripts.js)
  const anchorNavWrapper = block.closest('.anchor-nav-wrapper');
  const navWrapper = document.querySelector('header.header-wrapper .nav-wrapper');

  if (anchorNavWrapper && navWrapper) {
    // Move the wrapper from main to inside nav-wrapper (as sibling of <nav>)
    navWrapper.appendChild(anchorNavWrapper);

    // Add a class to identify it as part of the header
    anchorNavWrapper.classList.add('header-anchor-nav');
  }
  
    // Optionally hide the mid-banner section since we've extracted its content
    // midBannerSection.style.display = 'none';
  }
  