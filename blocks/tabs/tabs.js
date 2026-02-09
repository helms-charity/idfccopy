// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { getBlockId } from '../../scripts/scripts.js';

function fetchTabName(tab) {
  const tabTextWrapper = document.createElement('div');
  const tabName = tab.getAttribute('data-tabname');
  if (tabName) {
    const tabText = document.createElement('p');
    tabText.textContent = tabName;
    tabTextWrapper.append(tabText);
  }
  return tabTextWrapper;
}

function createTabButton(block, tab, tabpanel, tablist, index) {
  const button = document.createElement('button');
  button.className = 'tabs-tab';
  button.id = `${block.id}_tab_${index}`;
  button.innerHTML = fetchTabName(tab).innerHTML;
  button.setAttribute('aria-controls', tabpanel.id);
  button.setAttribute('aria-selected', !index);
  button.setAttribute('role', 'tab');
  button.setAttribute('type', 'button');
  button.addEventListener('click', () => {
    block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
      panel.setAttribute('aria-hidden', true);
    });
    tablist.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-selected', false);
    });
    tabpanel.setAttribute('aria-hidden', false);
    button.setAttribute('aria-selected', true);
  });
  return button;
}

export default async function decorate(block) {
  block.id = getBlockId('tabs');

  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // decorate tabs and tabpanels
  const tabs = [...block.children];
  const sectionTitles = [];
  if (tabs.length > 0) {
    // Collect all .tab-section-title elements from all tabs
    tabs.forEach((tab) => {
      const titles = tab.querySelectorAll('.tab-section-title');
      titles.forEach((title) => {
        if (!sectionTitles.includes(title)) {
          sectionTitles.push(title);
        }
      });
    });

    // add tab style (horizontal or vertical)
    const headers = tabs[0];
    const tabStyle = headers.getAttribute('data-category');
    if (tabStyle) {
      block.classList.add(tabStyle);
    }

    tabs.forEach((tab, i) => {
      const id = toClassName(tab.getAttribute('data-tabname'));
      // decorate tabpanel
      const tabpanel = block.children[i];
      tabpanel.classList.add('tabs-panel');
      tabpanel.id = `${block.id}_tabPane_${i}`;
      tabpanel.setAttribute('aria-hidden', !!i);
      tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
      tabpanel.setAttribute('role', 'tabpanel');

      // build tab button
      const button = createTabButton(block, tab, tabpanel, tablist, i);
      tablist.append(button);
    });
  }
  block.prepend(tablist);
  // Prepend all sectionTitles after tablist so they appear first
  // Reverse order to maintain original DOM order when prepending
  sectionTitles.reverse().forEach((sectionTitle) => {
    block.prepend(sectionTitle);
  });
}
