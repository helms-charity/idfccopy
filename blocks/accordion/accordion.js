import { moveInstrumentation, getBlockId } from '../../scripts/scripts.js';

export default function decorate(block) {
  block.id = getBlockId('accordion');
  let noSchema = false;
  let ctaUrl = null;
  let ctaText = null;
  let ctaLocation = null;
  let openItemConfig = null;
  let isInitialLoad = true;

  // Check if this is a multisection accordion (items have data-multisection)
  const isMultiSection = [...block.children].some((child) => child.hasAttribute('data-multisection'));

  const accordionItems = [];

  if (isMultiSection) {
    // Multisection mode: treat each direct child as an accordion item
    // Each item should have data-tabname for the label and content as children
    // No schema.org attributes for multisection accordions

    // Collect all section titles from accordion items before processing
    const sectionTitles = [];
    [...block.children].forEach((item) => {
      const titles = item.querySelectorAll('.tab-section-title');
      titles.forEach((title) => {
        if (!sectionTitles.includes(title)) {
          sectionTitles.push(title);
        }
      });
    });

    [...block.children].forEach((item) => {
      const tabName = item.getAttribute('data-tabname') || '';
      const summary = document.createElement('summary');
      summary.className = 'accordion-item-label';
      summary.textContent = tabName;

      const body = document.createElement('div');
      body.className = 'accordion-item-body';
      // Move all children of the item to the body
      while (item.firstChild) {
        body.appendChild(item.firstChild);
      }

      const details = document.createElement('details');
      moveInstrumentation(item, details);
      details.className = 'accordion-item';

      details.append(summary, body);
      item.replaceWith(details);
      accordionItems.push(details);
    });

    // Prepend all sectionTitles to the block so they appear first
    // Reverse order to maintain original DOM order when prepending
    sectionTitles.reverse().forEach((sectionTitle) => {
      block.prepend(sectionTitle);
    });
  } else {
    // Standalone mode: original behavior with row-based structure
    // First pass: find if there's a CTA link to determine how to interpret numbers
    let hasCtaLink = false;
    [...block.children].forEach((row) => {
      if (row.children.length === 1) {
        const cell = row.children[0];
        const link = cell.querySelector('a');
        if (link) {
          hasCtaLink = true;
        }
      }
    });

    let foundLink = false;

    // Second pass: parse configuration rows
    [...block.children].forEach((row) => {
      if (row.children.length === 1) {
        const cell = row.children[0];
        const value = cell.textContent.trim();
        const valueLower = value.toLowerCase();

        // Check if this single cell indicates no-schema is enabled
        if (valueLower === 'true' || valueLower === 'no-schema') {
          noSchema = true;
        } else {
          // Check if it's a number
          const numValue = parseInt(value, 10);
          if (!Number.isNaN(numValue) && numValue >= 0) {
            if (hasCtaLink) {
              // If there's a CTA link, numbers before link are ctaLocation, after are openItem
              if (!foundLink) {
                ctaLocation = numValue;
              } else {
                openItemConfig = numValue;
              }
            } else {
              // No CTA link, so any number is openItem
              openItemConfig = numValue;
            }
          } else {
            // Check if it's a link element (CTA)
            const link = cell.querySelector('a');
            if (link) {
              ctaUrl = link.href;
              ctaText = link.textContent.trim();
              foundLink = true;
            }
          }
        }

        // Remove single-cell rows as they're configuration, not content
        row.remove();
      }
    });

    // Process rows with exactly 2 children (question + answer)
    [...block.children].forEach((row) => {
      const children = [...row.children];
      // only process rows with exactly 2 children (question + answer)
      if (children.length === 2) {
        const label = children[0];
        const summary = document.createElement('summary');
        summary.className = 'accordion-item-label';

        // Only add schema.org attributes if no-schema is not enabled
        if (!noSchema) {
          summary.setAttribute('itemscope', '');
          summary.setAttribute('itemprop', 'mainEntity');
          summary.setAttribute('itemtype', 'https://schema.org/Question');
        }

        summary.append(...label.childNodes);

        if (!noSchema && summary.firstElementChild) {
          summary.firstElementChild.setAttribute('itemprop', 'name');
        }

        const body = children[1];
        body.className = 'accordion-item-body';
        const details = document.createElement('details');
        moveInstrumentation(row, details);
        details.className = 'accordion-item';

        // Only add schema.org attributes if no-schema is not enabled
        if (!noSchema) {
          details.setAttribute('itemscope', '');
          details.setAttribute('itemprop', 'acceptedAnswer');
          details.setAttribute('itemtype', 'https://schema.org/Answer');
        }

        details.append(summary, body);
        row.replaceWith(details);
        accordionItems.push(details);
      } else {
        // remove or ignore malformed rows (like dummy divs)
        row.remove();
      }
    });
  }

  // Handle CTA "Show More/Less" functionality
  if (ctaLocation && ctaLocation < accordionItems.length && ctaUrl && ctaText) {
    let isExpanded = false;
    const originalText = ctaText;
    const expandedText = 'Show less';

    // Hide items after ctaLocation initially
    for (let i = ctaLocation; i < accordionItems.length; i += 1) {
      accordionItems[i].classList.add('accordion-item-hidden');
    }

    // Create CTA button
    const ctaButton = document.createElement('a');
    ctaButton.href = ctaUrl;
    ctaButton.textContent = originalText;
    ctaButton.className = 'accordion-cta button';

    // Append CTA at the end of the block
    block.appendChild(ctaButton);

    // Add click handler to toggle hidden items
    ctaButton.addEventListener('click', (e) => {
      // Check if URL ends with '#' (handles both relative '#' and absolute URLs ending with '#')
      if (ctaUrl.endsWith('#') || ctaUrl === '') {
        e.preventDefault();

        if (!isExpanded) {
          // Show all hidden items
          for (let i = ctaLocation; i < accordionItems.length; i += 1) {
            accordionItems[i].classList.remove('accordion-item-hidden');
          }
          ctaButton.textContent = expandedText;
          block.classList.add('expanded');
          isExpanded = true;
        } else {
          // Hide items after ctaLocation
          for (let i = ctaLocation; i < accordionItems.length; i += 1) {
            accordionItems[i].classList.add('accordion-item-hidden');
          }
          ctaButton.textContent = originalText;
          block.classList.remove('expanded');
          isExpanded = false;
        }
      }
    });
  }

  // Only one accordion item open at a time (default behavior)
  // Footer accordions can disable this by removing the listeners in footer.js
  block.querySelectorAll('details').forEach((detail) => {
    const toggleHandler = () => {
      if (detail.open) {
        // Close all other accordion items in this block
        block.querySelectorAll('details').forEach((el) => {
          if (el !== detail && el.open) {
            el.removeAttribute('open');
          }
        });

        // Auto-scroll to position item 100px from top of viewport
        // using the default browser's default timing
        // Only scroll on user interaction, not on initial page load
        if (!isInitialLoad) {
          const detailRect = detail.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetPosition = scrollTop + detailRect.top - 170;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }
      }
    };
    detail.addEventListener('toggle', toggleHandler);
    // Store reference to handler so it can be removed if needed
    detail.accordionToggleHandler = toggleHandler;
  });

  // Open accordion item by default based on configuration
  // Footer.js will close this if the accordion is in a footer
  if (accordionItems.length > 0) {
    let itemToOpen = 1; // Default to first item (1-indexed)

    if (openItemConfig !== null && openItemConfig !== undefined) {
      if (openItemConfig === 0) {
        // 0 means don't open any items
        itemToOpen = 0;
      } else if (openItemConfig > 0 && openItemConfig <= accordionItems.length) {
        // Valid item number (1-indexed)
        itemToOpen = openItemConfig;
      }
      // If invalid (out of range), fall back to default (1)
    }

    // Open the specified item (if itemToOpen > 0)
    if (itemToOpen > 0) {
      accordionItems[itemToOpen - 1].setAttribute('open', '');
    }

    // Mark initial load as complete after opening default item
    // Use setTimeout to ensure it happens after any toggle events
    setTimeout(() => {
      isInitialLoad = false;
    }, 100);
  }
}
