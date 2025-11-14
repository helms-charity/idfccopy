import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Recursively animate steps in sequence
 * @param {Array<HTMLElement>} steps - Array of step li elements
 * @param {number} index - Current step index
 */
function animateStepsSequence(steps, index) {
  // Base case: all steps animated
  if (index >= steps.length) {
    return;
  }

  const currentStep = steps[index];
  const hasConnector = index < steps.length - 1; // Not the last step

  // 1. Fade in the current step (1s)
  currentStep.classList.add('step-animating');

  // Wait 1s for step fade-in to complete
  setTimeout(() => {
    currentStep.classList.remove('step-animating');
    currentStep.classList.add('step-visible');

    // 2. Animate the connector line (1s) if not the last step
    if (hasConnector) {
      currentStep.classList.add('connector-animating');

      // Wait 1s for connector animation to complete
      setTimeout(() => {
        currentStep.classList.remove('connector-animating');
        currentStep.classList.add('connector-visible');

        // 3. Move to next step
        animateStepsSequence(steps, index + 1);
      }, 1000); // Connector animation duration
    }
    // Last step, animation complete
  }, 1000); // Step fade-in duration
}

/**
 * Animate steps sequentially: fade in step, then animate connector, then next step
 * @param {HTMLElement} block - The steps block element
 * @param {HTMLElement} ul - The UL element containing step items
 * @param {string} animationDuration - Initial delay in milliseconds before animation starts
 */
function initializeStepsAnimation(block, ul, animationDuration) {
  const steps = Array.from(ul.children);
  const initialDelay = parseInt(animationDuration, 10) || 0;

  // Wait for initial delay, then start the animation sequence
  setTimeout(() => {
    animateStepsSequence(steps, 0);
  }, initialDelay);
}

export default function decorate(block) {
  const rows = Array.from(block.children);

  // Extract block-level metadata fields from single-cell rows at the top
  // Block model fields (from "steps" model) are rendered as rows with 1 cell each
  // Block item fields (from "steps-item" model) are rendered as rows with multiple cells
  let metadataRowCount = 0;
  let title = '';
  let subtitle = '';
  let componentId = '';
  let animation = '';
  let animationDuration = '';

  // Row 0: title (1 cell, plain text)
  if (rows.length > 0 && rows[0].children.length === 1) {
    title = rows[0].children[0]?.textContent?.trim() || '';
    metadataRowCount = 1;
  }

  // Row 1: subtitle (1 cell, plain text or richtext)
  if (rows.length > 1 && rows[1].children.length === 1) {
    subtitle = rows[1].children[0]?.textContent?.trim() || '';
    metadataRowCount = 2;
  }

  // Row 2: componentId (1 cell, plain text)
  if (rows.length > 2 && rows[2].children.length === 1) {
    componentId = rows[2].children[0]?.textContent?.trim() || '';
    metadataRowCount = 3;
  }

  // Row 3: animation (1 cell, boolean/select value)
  if (rows.length > 3 && rows[3].children.length === 1) {
    animation = rows[3].children[0]?.textContent?.trim() || '';
    metadataRowCount = 4;
  }

  // Row 4: animationDuration (1 cell, number)
  if (rows.length > 4 && rows[4].children.length === 1) {
    animationDuration = rows[4].children[0]?.textContent?.trim() || '';
    metadataRowCount = 5;
  }

  // Store config as data attributes on the block for CSS/JS use
  if (componentId) block.dataset.componentId = componentId;
  if (animation) block.dataset.animation = animation;
  if (animationDuration) block.dataset.animationDuration = animationDuration;

  // Build UL structure - only process rows that are actual step items
  // Skip the metadata rows and process only the item rows (which have multiple cells)
  const ul = document.createElement('ul');
  rows.slice(metadataRowCount).forEach((row) => {
    // Skip empty rows
    if (row.children.length === 0) {
      return;
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
  if (subtitle) {
    const subtitleEl = document.createElement('h3');
    subtitleEl.className = 'steps-subtitle';
    subtitleEl.textContent = subtitle;
    block.append(subtitleEl);
  }
  ul.classList.add('grid-steps');
  block.append(ul);

  // Initialize animation if enabled
  if (animation === 'true' || animation === 'True') {
    initializeStepsAnimation(block, ul, animationDuration);
  }
}
