/**
 * Section Title: 4-cell contract.
 * Cell 0: title (tag+text). 1: title size. 2: subtitle (tag+text). 3: subtitle size.
 * Only title and subtitle are rendered; size/alignment are block classes only.
 */
import { readBlockConfig } from '../../scripts/aem.js';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, p';
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
const ALIGNMENTS = ['left', 'center', 'right'];

const SIZE_MAP = {
  xxl: 'size-xxl',
  xl: 'size-xl',
  l: 'size-l',
  m: 'size-m',
  s: 'size-s',
  xs: 'size-xs',
};

function normalizeSize(val) {
  if (!val || typeof val !== 'string') return '';
  const n = val.trim().toLowerCase();
  if (!n) return '';
  if (SIZE_MAP[n]) return SIZE_MAP[n];
  if (n.startsWith('size-')) return n;
  const order = ['xxl', 'xs', 'xl', 'l', 'm', 's'];
  const key = order.find((k) => n.includes(k));
  return key ? SIZE_MAP[key] : '';
}

function cellText(row) {
  if (!row?.children?.length) return '';
  const col = row.children.length >= 2 ? row.children[1] : row.children[0];
  return (col?.textContent ?? '').trim();
}

function get(config, ...keys) {
  const v = keys.reduce((acc, k) => acc ?? config[k], undefined);
  return typeof v === 'string' ? v.trim() : '';
}

function hasValue(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function validTag(t) {
  if (!t || typeof t !== 'string') return '';
  const lower = t.trim().toLowerCase();
  return (HEADING_TAGS.includes(lower)) ? lower : '';
}

function parseFromId(id) {
  const out = { type: '', sizeClass: '', alignment: '' };
  if (!id || typeof id !== 'string') return out;
  const parts = id.split('---');
  if (parts[1] && HEADING_TAGS.includes(parts[1].toLowerCase())) {
    out.type = parts[1].toLowerCase();
  }
  const rest = (parts[2] ?? '').toLowerCase();
  const sizePart = (rest.split('-and-')[0] ?? '').replace(/^size-/, '');
  out.sizeClass = normalizeSize(sizePart) || normalizeSize(rest);
  if (rest.includes('right')) out.alignment = 'right';
  else if (rest.includes('center')) out.alignment = 'center';
  return out;
}

function getHeadingFromCell(cell) {
  const heading = cell?.querySelector?.(HEADING_SELECTOR);
  if (heading) {
    return {
      text: (heading.textContent ?? '').trim(),
      tag: heading.tagName.toLowerCase(),
      id: heading.id ?? '',
    };
  }
  return { text: cellText(cell), tag: 'h2', id: '' };
}

function createHeading(tag, text, className, id = '') {
  const el = document.createElement(HEADING_TAGS.includes(tag) ? tag : 'p');
  el.classList.add(className);
  el.textContent = text;
  if (hasValue(id)) el.id = id;
  return el;
}

export default function decorate(block) {
  const config = readBlockConfig(block) ?? {};
  const rows = Array.from(block.querySelectorAll(':scope > div')).slice(0, 4);

  let titleText = '';
  let titleTag = 'h2';
  let titleSizeClass = '';
  let titleId = '';
  let subtitleText = '';
  let subtitleTag = 'p';
  let subtitleSizeClass = '';
  let alignVal = '';

  const titleSource = rows.length >= 1 ? rows[0] : block;
  const titleInfo = getHeadingFromCell(titleSource);
  if (hasValue(titleInfo.text)) {
    titleText = titleInfo.text;
    titleTag = titleInfo.tag;
    titleId = titleInfo.id;
    const fromId = parseFromId(titleInfo.id);
    if (fromId.type) titleTag = fromId.type;
    if (rows.length === 0) {
      titleSizeClass = fromId.sizeClass;
      alignVal = fromId.alignment;
    }
  }

  if (rows.length >= 2) titleSizeClass = normalizeSize(cellText(rows[1])) || titleSizeClass;
  if (rows.length >= 3) {
    const sub = getHeadingFromCell(rows[2]);
    if (hasValue(sub.text)) {
      subtitleText = sub.text;
      subtitleTag = sub.tag;
    }
  }
  if (rows.length >= 4) subtitleSizeClass = normalizeSize(cellText(rows[3]));
  if (rows.length === 0) {
    const dataSub = block.getAttribute?.('data-subtitle');
    if (hasValue(dataSub)) subtitleText = dataSub;
  }

  const cfg = (key, ...alt) => get(config, key, ...alt);
  const titleCfg = cfg('title-text', 'title') || cfg('title');
  if (hasValue(titleCfg)) titleText = titleCfg;
  const tType = validTag(cfg('title-type', 'titleType'));
  if (tType) titleTag = tType;
  if (hasValue(cfg('title-size', 'titleSize'))) titleSizeClass = normalizeSize(cfg('title-size', 'titleSize'));
  const align = cfg('classes', 'alignment') || cfg('alignment');
  if (ALIGNMENTS.includes(align)) alignVal = align;
  if (hasValue(cfg('subtitle'))) subtitleText = cfg('subtitle');
  const sType = validTag(cfg('subtitle-type', 'subtitleType'));
  if (sType) subtitleTag = sType;
  if (hasValue(cfg('subtitle-size', 'subtitleSize'))) subtitleSizeClass = normalizeSize(cfg('subtitle-size', 'subtitleSize'));

  if (!hasValue(titleText)) return;

  block.innerHTML = '';
  block.appendChild(createHeading(titleTag, titleText, 'title', titleId));

  if (hasValue(titleSizeClass)) block.classList.add(titleSizeClass);
  if (ALIGNMENTS.includes(alignVal)) block.classList.add(alignVal);

  if (hasValue(subtitleText)) {
    block.appendChild(createHeading(subtitleTag, subtitleText, 'subtitle'));
    if (hasValue(subtitleSizeClass)) block.classList.add(`subtitle-${subtitleSizeClass}`);
  }
}
