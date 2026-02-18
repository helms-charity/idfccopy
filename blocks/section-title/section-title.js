/**
 * Section Title block: apply author-selected text size and alignment as block classes.
 * Primary: UE config (readBlockConfig) using JSON field names.
 * Fallback: EDS/DOM rows (row0=title, row1=titleType, row2=title_size, row3=classes,
 * row4=subtitle, row5=subtitleType, row6=subtitle_size) when config is empty.
 */
import { readBlockConfig } from '../../scripts/aem.js';

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

const HEADING_TAG = /^h[1-6]|p$/i;

function decorate(block) {
  const config = readBlockConfig(block) || {};
  const rows = block.querySelectorAll(':scope > div');

  let titleText = (config.title ?? '').trim();
  if (!titleText && rows.length > 0) {
    titleText = cellText(rows[0]);
  }

  let rawTitleType = (config.titleType ?? '').trim();
  if (!rawTitleType && rows.length > 1) {
    rawTitleType = cellText(rows[1]);
  }
  const titleType = rawTitleType || 'h2';
  const titleTag = HEADING_TAG.test(titleType) ? titleType.toLowerCase() : 'h2';

  let sizeVal = (config.title_size ?? '').trim();
  if (!sizeVal && rows.length > 2) {
    sizeVal = cellText(rows[2]);
  }
  const sizeClass = toSizeClass(sizeVal);
  if (sizeClass) block.classList.add(sizeClass);

  const alignmentVal = config.classes ?? '';
  const validAlignment = ['left', 'center', 'right'];
  if (alignmentVal) {
    let classes = [];
    if (typeof alignmentVal === 'string') {
      classes = alignmentVal.split(',').map((c) => c.trim());
    } else if (Array.isArray(alignmentVal)) {
      classes = alignmentVal;
    } else {
      classes = [alignmentVal];
    }
    classes.forEach((c) => {
      if (c && validAlignment.includes(c)) block.classList.add(c);
    });
  }

  let heading = block.querySelector('h1, h2, h3, h4, h5, h6, p');
  if (!heading && titleText) {
    heading = document.createElement(titleTag);
    heading.textContent = titleText;
  }

  if (!heading) return;

  block.innerHTML = '';
  heading.classList.add('title');
  block.appendChild(heading);

  let subtitleText = (config.subtitle ?? '').trim();
  if (!subtitleText && rows.length > 4) {
    subtitleText = cellText(rows[4]);
  }

  if (!subtitleText) return;

  let rawSubType = (config.subtitleType ?? '').trim();
  if (!rawSubType && rows.length > 5) {
    rawSubType = cellText(rows[5]);
  }
  const subType = rawSubType || 'p';
  const subTagName = HEADING_TAG.test(subType) ? subType.toLowerCase() : 'p';

  const subtitle = document.createElement(subTagName);
  subtitle.className = 'subtitle';
  subtitle.textContent = subtitleText;

  let subSizeVal = (config.subtitle_size ?? '').trim();
  if (!subSizeVal && rows.length > 6) {
    subSizeVal = cellText(rows[6]);
  }
  const subSizeClass = toSizeClass(subSizeVal);
  if (subSizeClass) block.classList.add(`subtitle-${subSizeClass}`);

  block.appendChild(subtitle);
}

export default decorate;
