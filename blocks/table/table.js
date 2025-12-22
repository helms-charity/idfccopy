/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = Array.from(block.children);
  let metadataCount = 0;

  // Extract ID from first single-cell row if present
  if (rows[0]?.children.length === 1) {
    const cell = rows[0].children[0];
    const text = cell.textContent?.trim();
    if (text && !cell.querySelector('img, picture')) {
      block.id = text;
      metadataCount = 1;
      // Skip filter/columns row if present
      if (rows[1]?.children.length === 1 && !rows[1].children[0].querySelector('img, picture')) {
        metadataCount = 2;
      }
    }
  }

  // Extract noHeader boolean field (rendered as "true" or "false" text)
  // Check after ID and filter rows
  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    const text = cell.textContent?.trim();
    if (text === 'true' || text === 'false') {
      if (text === 'true') {
        block.classList.add('no-header');
      }
      metadataCount += 1;
    }
  }

  // Build table
  const table = document.createElement('table');
  const hasHeader = !block.classList.contains('no-header');
  const thead = hasHeader ? document.createElement('thead') : null;
  const tbody = document.createElement('tbody');

  // Process table rows (skip metadata rows)
  rows.slice(metadataCount).forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);

    [...row.children].forEach((cell) => {
      const td = document.createElement(i === 0 && hasHeader ? 'th' : 'td');
      if (i === 0) td.setAttribute('scope', 'column');
      td.innerHTML = cell.innerHTML;
      tr.append(td);
    });

    if (i === 0 && hasHeader) thead.append(tr);
    else tbody.append(tr);
  });

  if (thead) table.append(thead);
  table.append(tbody);
  block.replaceChildren(table);
}
