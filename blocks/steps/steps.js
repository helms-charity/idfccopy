import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  // Build UL structure
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
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
