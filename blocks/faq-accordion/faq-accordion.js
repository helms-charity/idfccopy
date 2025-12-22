import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  // const isMobile = window.matchMedia('(max-width: 767px)').matches;
  // if (!isMobile) return; // Skip accordion transformation on desktop

  // First pass: collect all rows and group by tab
  const rows = [...block.children];
  const tabGroups = new Map(); // Map<tabName, Array<{row, label, body}>>
  const itemsWithoutTab = []; // items without tab configuration

  rows.forEach((row) => {
    const children = [...row.children];

    // Process rows with 2 or 3 children (question + answer + optional tab)
    if (children.length === 2 || children.length === 3) {
      const label = children[0];
      const body = children[1];
      const tabValue = children.length === 3 ? children[2].textContent.trim() : null;

      if (tabValue) {
        // Group by tab
        if (!tabGroups.has(tabValue)) {
          tabGroups.set(tabValue, []);
        }
        tabGroups.get(tabValue).push({ row, label, body });
      } else {
        // No tab, process normally
        itemsWithoutTab.push({ row, label, body });
      }
    } else {
      // remove or ignore malformed rows
      row.remove();
    }
  });

  // Clear the block
  block.innerHTML = '';

  // Process items without tabs first
  itemsWithoutTab.forEach(({ row, label, body }) => {
    const summary = document.createElement('summary');
    summary.className = 'question';
    summary.append(...label.childNodes);
    body.className = 'answer';
    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'faq-accordion-item';
    details.append(summary, body);
    block.appendChild(details);
  });

  // Process tab groups
  tabGroups.forEach((items, tabName) => {
    // Create wrapper div for this tab group
    const tabWrapper = document.createElement('div');
    tabWrapper.className = tabName;

    // Add all items for this tab
    items.forEach(({ row, label, body }) => {
      const summary = document.createElement('summary');
      summary.className = 'question';
      summary.append(...label.childNodes);
      body.className = 'answer';
      const details = document.createElement('details');
      moveInstrumentation(row, details);
      details.className = 'faq-accordion-item';
      details.append(summary, body);
      tabWrapper.appendChild(details);
    });

    block.appendChild(tabWrapper);
  });
}

/*
export default function decorate(block) {
  block.id = 'faqs';

  const items = [...block.children].filter(
    (item) => item.querySelectorAll('div').length >= 2,
  );

  // Clear block and re-structure
  block.innerHTML = '';

  const visibleCount = 3;

  items.forEach((item, index) => {
    item.classList.add('faq-accordion-item');

    const question = item.children[0];
    const answer = item.children[1];

    question.classList.add('faq-accordion-label');
    answer.classList.add('faq-accordion-body');

    // Hide content by default
    answer.style.maxHeight = '0px';
    answer.style.overflow = 'hidden';

    if (index < visibleCount) item.classList.add('visible');

    block.appendChild(item);
  });

  // Add toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'faq-accordion-toggle-btn';
  toggleBtn.textContent = 'More FAQs';
  block.appendChild(toggleBtn);

  let expanded = false;

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    items.forEach((item, i) => {
      const answer = item.querySelector('.faq-accordion-body');
      if (expanded || i < visibleCount) {
        item.classList.add('visible');
      } else {
        item.classList.remove('visible');
        item.classList.remove('open');
        answer.style.maxHeight = '0px';
      }
    });
    toggleBtn.textContent = expanded ? 'Less FAQs' : 'More FAQs';
  });

  // Accordion behavior: one open at a time
  items.forEach((item) => {
    const question = item.querySelector('.faq-accordion-label');
    const answer = item.querySelector('.faq-accordion-body');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all open items
      items.forEach((el) => {
        el.classList.remove('open');
        const body = el.querySelector('.faq-accordion-body');
        body.style.maxHeight = '0px';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = 'none'; // temporarily unset
        // const height = answer.scrollHeight + 'px';
        answer.style.maxHeight = '0'; // reset before transition
        // eslint-disable-next-line no-void
        void answer.offsetHeight; // force reflow
        answer.style.maxHeight = 'fit-content'; // animate to actual height
      }
    });
  });
}
*/
