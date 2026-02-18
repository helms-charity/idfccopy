/**
 * Section Title block: minimal decorate — add size/alignment classes and .title on heading.
 * Does not clear or replace content; only decorates what’s already in the block.
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

export default function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');

  if (rows.length > 2) {
    const sizeClass = toSizeClass(cellText(rows[2]));
    if (sizeClass) block.classList.add(sizeClass);
  }
  if (rows.length > 3) {
    const align = cellText(rows[3]).toLowerCase();
    if (align === 'center' || align === 'right' || align === 'left') block.classList.add(align);
  }

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6, p');
  if (heading) heading.classList.add('title');
}
