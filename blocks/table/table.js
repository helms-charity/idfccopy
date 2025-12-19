/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 */

import { moveInstrumentation, createSource } from '../../scripts/scripts.js';

/**
 * Extracts image URL from picture or img element
 * @param {Element} element - Picture or img element
 * @returns {string|null} - Image URL or null
 */
function extractImageUrl(element) {
  if (!element) return null;

  if (element.tagName === 'IMG') {
    return element.src;
  }

  if (element.tagName === 'PICTURE') {
    const img = element.querySelector('img');
    return img?.src || null;
  }

  return null;
}

/**
 * Creates a responsive picture element with optimized sources
 * @param {string} desktopUrl - Desktop image URL
 * @param {string|null} mobileUrl - Mobile image URL (optional)
 * @param {string} alt - Alt text for the image
 * @returns {Element} - Picture element with optimized sources
 */
function createResponsivePicture(desktopUrl, mobileUrl = null, alt = '') {
  const picture = document.createElement('picture');
  let defaultImgUrl = null;

  // Desktop image: desktop and tablet breakpoints
  if (desktopUrl) {
    picture.appendChild(createSource(desktopUrl, 1920, '(min-width: 900px)'));
    picture.appendChild(createSource(desktopUrl, 899, '(min-width: 600px) and (max-width: 899px)'));
    defaultImgUrl = desktopUrl;
  }

  // Mobile image: mobile breakpoint
  if (mobileUrl) {
    picture.appendChild(createSource(mobileUrl, 600, '(max-width: 599px)'));
    defaultImgUrl = mobileUrl;
  }

  // Create img element
  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';

  if (defaultImgUrl) {
    img.src = defaultImgUrl;
  }

  picture.appendChild(img);
  return picture;
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = Array.from(block.children);
  let metadataCount = 0;
  let desktopImageUrl = null;
  let mobileImageUrl = null;
  let imageAlt = '';
  let tableRowMaxWidth = '';
  let noHeader = false;

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

  // Extract desktop and mobile images (reference fields)
  for (let i = 0; i < 2; i += 1) {
    if (rows[metadataCount]?.children.length === 1) {
      const cell = rows[metadataCount].children[0];
      const imageElement = cell.querySelector('picture, img');
      if (imageElement) {
        const url = extractImageUrl(imageElement);
        if (i === 0) desktopImageUrl = url;
        else mobileImageUrl = url;
        metadataCount += 1;
      } else {
        break; // Stop if no image found
      }
    }
  }

  // Extract imageAlt (text field) - optional
  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    if (!cell.querySelector('img, picture')) {
      const text = cell.textContent?.trim();
      if (text && text !== 'true' && text !== 'false' && !text.match(/^\d+px$/)) {
        imageAlt = text;
        metadataCount += 1;
      }
    }
  }

  // Extract tableRowMaxWidth (text field)
  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    const text = cell.textContent?.trim();
    if (text && text.match(/^\d+px$/)) {
      tableRowMaxWidth = text;
      metadataCount += 1;
    }
  }

  // Extract noHeader boolean field (rendered as "true" or "false" text)
  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    const text = cell.textContent?.trim();
    if (text === 'true' || text === 'false') {
      noHeader = text === 'true';
      if (noHeader) {
        block.classList.add('no-header');
      }
      metadataCount += 1;
    }
  }

  // Build table structure
  const table = document.createElement('table');
  const hasHeader = !noHeader;
  const thead = hasHeader ? document.createElement('thead') : null;
  const tbody = document.createElement('tbody');

  // Apply max-width to table if specified
  if (tableRowMaxWidth) {
    table.style.maxWidth = tableRowMaxWidth;
  }

  // Process table rows (skip metadata rows)
  const dataRows = rows.slice(metadataCount);
  dataRows.forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);

    const isLastRow = i === dataRows.length - 1;
    const cells = [...row.children];
    const firstCell = cells[0];
    const secondCell = cells[1];

    // Check if last row has empty second cell - if so, make first cell span both columns
    const isEmptySecondCell = isLastRow && secondCell && !secondCell.textContent?.trim();
    if (isEmptySecondCell) {
      const td = document.createElement(i === 0 && hasHeader ? 'th' : 'td');
      if (i === 0 && hasHeader) td.setAttribute('scope', 'column');
      td.setAttribute('colspan', '2');
      td.innerHTML = firstCell.innerHTML;
      tr.append(td);
    } else {
      cells.forEach((cell) => {
        const td = document.createElement(i === 0 && hasHeader ? 'th' : 'td');
        if (i === 0 && hasHeader) td.setAttribute('scope', 'column');
        td.innerHTML = cell.innerHTML;
        tr.append(td);
      });
    }

    if (i === 0 && hasHeader) thead.append(tr);
    else tbody.append(tr);
  });

  // Build final structure
  block.textContent = '';

  // Create and add responsive background image if present
  if (desktopImageUrl || mobileImageUrl) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'table-background-image';
    const responsivePicture = createResponsivePicture(desktopImageUrl, mobileImageUrl, imageAlt);
    imageWrapper.append(responsivePicture);
    block.append(imageWrapper);
  }

  // Add table
  if (thead) table.append(thead);
  table.append(tbody);
  block.append(table);
}
