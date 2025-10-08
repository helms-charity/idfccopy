export default function decorate(block) {
  const isDesktop = window.matchMedia('(min-width: 900px)').matches;

  const tabPane = document.createElement('div');
  tabPane.className = 'tab-pane top-second-nav-js active';
  tabPane.id = 'personal'; // Replace with dynamic logic if needed

  const navList = document.createElement('ul');
  navList.className = 'top-nav-left';

  [...block.children].forEach((item) => {
    const li = document.createElement('li');
    li.className = 'drop-down all-drop-down';

    const children = [...item.children];
    const title = children[0]?.textContent?.trim() || 'Menu';
    const viewAllLink = children[1]?.querySelector('a')?.getAttribute('href') || '#';
    const subTitle = children[2]?.textContent?.trim() || '';
    const cardItems = [...children[3]?.querySelectorAll('li') || []];

    // Top tab link
    const topLink = document.createElement('a');
    topLink.href = viewAllLink;
    topLink.textContent = title;
    li.appendChild(topLink);

    // Add dropdown icon
    const dropdownIcon = document.createElement('span');
    dropdownIcon.className = 'dropdown-arrow';
    li.appendChild(dropdownIcon);

    // Dropdown content
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-content animated fadeIn menu-cardList-cnt';

    // Header box
    const hdBx = document.createElement('div');
    hdBx.className = 'hd-bx';

    if (isDesktop) {
      // Desktop view: subtitle and "View all"
      const subtitleEl = document.createElement('p');
      subtitleEl.className = 'hd-bx-h4';
      subtitleEl.textContent = subTitle;

      const viewAllEl = document.createElement('a');
      viewAllEl.className = 'link';
      viewAllEl.href = viewAllLink;
      viewAllEl.setAttribute('data-gtm-l3-alllinkcta', '');
      viewAllEl.textContent = `View all ${title}`;

      hdBx.append(subtitleEl, viewAllEl);
    } else {
      // Mobile view: subtitle becomes a single link
      const subtitleLink = document.createElement('a');
      subtitleLink.className = 'hd-bx-h4 link';
      subtitleLink.href = viewAllLink;
      subtitleLink.setAttribute('data-gtm-l3-alllinkcta', '');
      subtitleLink.textContent = subTitle;

      hdBx.append(subtitleLink);
    }

    dropdown.append(hdBx);

    // Menu cards
    const menuCards = document.createElement('div');
    menuCards.className = 'menu-cardList MT15';

    cardItems.forEach((liItem, i) => {
      const cardTitle = liItem.textContent?.trim() || 'Card';
      const card = document.createElement('div');
      card.className = `grdiantCard grdP${(i % 3) + 1}`;

      const anchor = document.createElement('a');
      anchor.href = '#'; // Replace with real URL if possible
      anchor.setAttribute('data-gtm-desk-l3cards-click', '');

      const tags = document.createElement('div');
      tags.className = 'tags';
      tags.style.display = 'none';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.innerHTML = `${cardTitle} <span class="icon-Right"></span>`;

      anchor.append(tags, titleDiv);
      card.append(anchor);
      menuCards.append(card);
    });

    dropdown.append(menuCards);
    li.append(dropdown);
    navList.append(li);
  });

  tabPane.append(navList);
  block.textContent = '';
  block.append(tabPane);
}