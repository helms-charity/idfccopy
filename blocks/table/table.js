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
  if (element.tagName === 'IMG') return element.src;
  if (element.tagName === 'PICTURE') return element.querySelector('img')?.src || null;
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
  const defaultImgUrl = mobileUrl || desktopUrl;

  if (desktopUrl) {
    picture.appendChild(createSource(desktopUrl, 1920, '(min-width: 900px)'));
    picture.appendChild(createSource(desktopUrl, 899, '(min-width: 600px) and (max-width: 899px)'));
  }

  if (mobileUrl) {
    picture.appendChild(createSource(mobileUrl, 600, '(max-width: 599px)'));
  }

  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';
  if (defaultImgUrl) img.src = defaultImgUrl;

  picture.appendChild(img);
  return picture;
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const rows = Array.from(block.children);
  let metadataCount = 0;
  let backgroundColor = '';
  let desktopImageUrl = null;
  let mobileImageUrl = null;
  let imageAlt = '';
  let tableRowMaxWidth = '';

  if (rows[0]?.children.length === 1) {
    const cell = rows[0].children[0];
    const text = cell.textContent?.trim();
    if (text && !cell.querySelector('img, picture')) {
      block.id = text;
      metadataCount = 1;
    }
  }

  if (rows[1]?.children.length === 1) {
    const cell = rows[1].children[0];
    if (!cell.querySelector('img, picture')) {
      const text = cell.textContent?.trim();
      const isColorOrGradient = text && (text.startsWith('var(') || text.startsWith('#')
        || text.includes('gradient') || text.includes('rgb')
        || text.match(/^[0-9a-fA-F]{3,6}$/i)
        || text.match(/^(transparent|inherit|initial|unset)$/i));

      if (isColorOrGradient) {
        backgroundColor = text;
        metadataCount = 2;
      } else if (text) {
        metadataCount = 2;
      }
    }
  }

  for (let i = 0; i < 2; i += 1) {
    let foundImage = false;
    for (let j = metadataCount; j < rows.length; j += 1) {
      if (rows[j]?.children.length === 1) {
        const cell = rows[j].children[0];
        const imageElement = cell.querySelector('picture, img');
        if (imageElement) {
          const url = extractImageUrl(imageElement);
          if (i === 0) desktopImageUrl = url;
          else mobileImageUrl = url;
          metadataCount = j + 1;
          foundImage = true;
          break;
        } else if (cell.textContent?.trim()) {
          break;
        }
      }
    }
    if (!foundImage) {
      break;
    }
  }

  for (let j = metadataCount; j < rows.length; j += 1) {
    if (rows[j]?.children.length === 1) {
      const cell = rows[j].children[0];
      if (!cell.querySelector('img, picture')) {
        const text = cell.textContent?.trim();
        if (text) {
          const isColorPattern = text.startsWith('var(') || text.startsWith('#') || text.includes('gradient');
          if (text !== 'true' && text !== 'false' && !text.match(/^\d+px$/) && !isColorPattern) {
            imageAlt = text;
            metadataCount = j + 1;
            break;
          } else {
            break;
          }
        }
      } else {
        break;
      }
    }
  }

  for (let j = metadataCount; j < rows.length; j += 1) {
    if (rows[j]?.children.length === 1) {
      const cell = rows[j].children[0];
      const text = cell.textContent?.trim();
      if (text) {
        if (text.match(/^\d+px$/)) {
          tableRowMaxWidth = text;
          metadataCount = j + 1;
          break;
        } else if (!cell.querySelector('img, picture')) {
          break;
        }
      }
    }
  }

  if (rows[metadataCount]?.children.length === 1) {
    const cell = rows[metadataCount].children[0];
    const text = cell.textContent?.trim();
    if (text === 'true' || text === 'false') {
      metadataCount += 1;
    }
  }

  const table = document.createElement('table');
  const thead = block.id === 'fees-and-charges' ? null : document.createElement('thead');
  const tbody = document.createElement('tbody');

  if (tableRowMaxWidth) {
    table.style.maxWidth = tableRowMaxWidth;
  }

  const dataRows = rows.slice(metadataCount);
  dataRows.forEach((row, i) => {
    if (!row.children?.length) return;

    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);

    const isFirstRow = i === 0;
    const isLastRow = i === dataRows.length - 1;
    const isHeaderRow = isFirstRow && thead;
    const cells = Array.from(row.children);
    const firstCell = cells[0];
    const secondCell = cells[1];

    const isEmptySecondCell = isLastRow && secondCell && !secondCell.textContent?.trim();
    if (isEmptySecondCell) {
      const cell = document.createElement(isHeaderRow ? 'th' : 'td');
      if (isHeaderRow) cell.setAttribute('scope', 'column');
      cell.setAttribute('colspan', '2');
      cell.innerHTML = firstCell.innerHTML;
      tr.append(cell);
    } else {
      cells.forEach((cell) => {
        const td = document.createElement(isHeaderRow ? 'th' : 'td');
        if (isHeaderRow) td.setAttribute('scope', 'column');
        td.innerHTML = cell.innerHTML;
        tr.append(td);
      });
    }

    (isHeaderRow ? thead : tbody).append(tr);
  });

  block.textContent = '';

  if (backgroundColor || desktopImageUrl || mobileImageUrl) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'table-background-image';

    if (backgroundColor) {
      const isHex = backgroundColor.match(/^[0-9a-fA-F]{3,6}$/);
      const isGradient = backgroundColor.startsWith('var(') || backgroundColor.includes('gradient');
      const prop = isGradient ? 'background-image' : 'background';
      const value = isHex ? `#${backgroundColor}` : backgroundColor;
      imageWrapper.style.setProperty(prop, value, 'important');
    }

    if (desktopImageUrl || mobileImageUrl) {
      const responsivePicture = createResponsivePicture(desktopImageUrl, mobileImageUrl, imageAlt);
      imageWrapper.append(responsivePicture);
    }

    block.append(imageWrapper);
  }

  if (thead) table.append(thead);
  table.append(tbody);
  block.append(table);
}
