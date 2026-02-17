/**
 * Section Title block: apply author-selected text size and alignment as block classes.
 * Title and subtitle share the same alignment (row3). Subtitle size uses block class
 * (subtitle-size-*) so CSS can reuse the same pattern as title (size on block).
 * EDS DOM order: row0=title, row1=title_type, row2=title_size, row3=classes;
 * optional subtitle: row4=subtitle, row5=subtitle_type, row6=subtitle_size.
 */
const SIZE_CLASSES = {
  xxl: 'size-xxl',
  xl: 'size-xl',
  l: 'size-l',
  m: 'size-m',
  s: 'size-s',
  xs: 'size-xs',
};

function toSizeClass(val) {
  if (!val || typeof val !== 'string') return '';
  const n = val.trim().toLowerCase();
  if (!n) return '';
  if (n.startsWith('size-')) {
    const key = n.slice(5).split(/\s/)[0];
    return SIZE_CLASSES[key] || '';
  }
  if (SIZE_CLASSES[n]) return SIZE_CLASSES[n];
  if (n.includes('xxl')) return 'size-xxl';
  if (n.includes('xs')) return 'size-xs';
  if (n.includes('xl')) return 'size-xl';
  return '';
}

function cellText(row) {
  if (!row) return '';
  const col = row.children.length >= 2 ? row.children[1] : row;
  return (col.textContent || '').trim();
}

const SUBTITLE_TAG = /^h[1-6]|p$/i;

function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');
  const titleSizeRowIndex = 2;
  if (rows.length > titleSizeRowIndex) {
    const sizeClass = toSizeClass(cellText(rows[titleSizeRowIndex]));
    if (sizeClass) block.classList.add(sizeClass);
  }

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6, p');
  if (heading && block.children.length > 1) {
    block.innerHTML = '';
    heading.classList.add('title');
    block.appendChild(heading);

    const subtitleTextRowIndex = 4;
    const subtitleTypeRowIndex = 5;
    const subtitleSizeRowIndex = 6;
    if (rows.length > subtitleTextRowIndex) {
      const subtitleText = cellText(rows[subtitleTextRowIndex]);
      if (subtitleText) {
        let tagName = 'p';
        if (rows.length > subtitleTypeRowIndex) {
          const typeVal = cellText(rows[subtitleTypeRowIndex]);
          if (typeVal && SUBTITLE_TAG.test(typeVal)) tagName = typeVal.toLowerCase();
        }
        const subtitle = document.createElement(tagName);
        subtitle.className = 'subtitle';
        if (rows.length > subtitleSizeRowIndex) {
          const sizeClass = toSizeClass(cellText(rows[subtitleSizeRowIndex]));
          if (sizeClass) block.classList.add(`subtitle-${sizeClass}`);
        }
        subtitle.textContent = subtitleText;
        block.appendChild(subtitle);
      }
    }
  }
}

export default decorate;
