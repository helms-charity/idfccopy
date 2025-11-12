import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Reads a block property value by name from the block's rows
 * @param {Element} block - The block element
 * @param {string} propName - The property name to read
 * @returns {string|null} The property value or null if not found
 */
function readBlockConfig(block, propName) {
  const rows = [...block.children];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const cells = [...row.children];
    if (cells.length === 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (key === propName.toLowerCase()) {
        return value;
      }
    }
  }
  return null;
}

export default function decorate(block) {
  // Extract configuration from block properties (stored in AEM but not rendered)
  const title = readBlockConfig(block, 'title');
  const componentId = readBlockConfig(block, 'componentId');
  const animation = readBlockConfig(block, 'animation');
  const animationDuration = readBlockConfig(block, 'animationDuration');

  // Store config as data attributes on the block for CSS/JS use
  if (componentId) block.dataset.componentId = componentId;
  if (animation) block.dataset.animation = animation;
  if (animationDuration) block.dataset.animationDuration = animationDuration;

  // Build UL structure - only process rows that are actual step items (have picture or rich text)
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cells = [...row.children];

    // Skip configuration rows (2 cells with key-value pairs)
    const isConfigRow = cells.length === 2
      && cells[0].textContent.trim()
      && !cells[0].querySelector('picture')
      && cells[1].textContent.trim().length < 100;

    if (isConfigRow) {
      return; // Skip this row
    }

    // Process actual step item rows
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'steps-item-image';
      } else {
        div.className = 'steps-item-body';
      }
    });
    ul.append(li);
  });

  // Append UL to block
  block.textContent = '';
  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'steps-title';
    titleEl.textContent = title;
    block.append(titleEl);
  }
  ul.classList.add('grid-steps');
  block.append(ul);

  // === View All / View Less Toggle (Mobile Only) ===
  const steps = ul.querySelectorAll('li');
  const maxVisible = 3;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function toggleView(btn, expand) {
    steps.forEach((stepsItem, index) => {
      if (index >= maxVisible) {
        stepsItem.style.display = expand ? 'flex' : 'none';
      }
    });
    btn.textContent = expand ? 'View Less' : 'View All';
  }

  function setupToggleButton() {
    if (steps.length > maxVisible && isMobile()) {
      // Hide extra steps
      steps.forEach((stepsItem, index) => {
        stepsItem.style.display = index >= maxVisible ? 'none' : 'flex';
      });

      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = 'View All';
      toggleBtn.className = 'view-toggle';
      block.appendChild(toggleBtn);

      toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.textContent === 'View Less';
        toggleView(toggleBtn, !isExpanded);
      });
    }
  }

  // Initial setup
  setupToggleButton();

  // Reapply toggle if screen resizes
  window.addEventListener('resize', () => {
    const existingBtn = block.querySelector('.view-toggle');
    if (existingBtn) existingBtn.remove();
    steps.forEach((stepsItem) => { stepsItem.style.display = 'flex'; });
    setupToggleButton();
  });
}
