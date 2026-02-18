/**
 * Section Title block: apply author-selected text size and alignment as block classes.
 * Uses readBlockConfig (aem.js) so content is read by label like other EDS blocks;
 * supports both existing semantic heading in DOM and building from config when
 * title is only in table cells (e.g. UE rendering).
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

const SUBTITLE_TAG = /^h[1-6]|p$/i;

function decorate(block) {
  const config = readBlockConfig(block);

  const titleText = config['title-text'] ?? config.title ?? '';
  const titleType = (config['title-type'] ?? config.titleType ?? 'h2').trim().toLowerCase();
  const tagName = SUBTITLE_TAG.test(titleType) ? titleType : 'h2';

  const sizeVal = config['text-size'] ?? config.textSize ?? '';
  const sizeClass = toSizeClass(sizeVal);
  if (sizeClass) block.classList.add(sizeClass);

  const alignment = config.classes ?? config['text-alignment'] ?? '';
  const validAlignment = ['left', 'center', 'right'];
  if (alignment) {
    const classes = typeof alignment === 'string' ? alignment.split(',').map((c) => c.trim()) : [alignment];
    classes.forEach((c) => c && validAlignment.includes(c) && block.classList.add(c));
  }

  let heading = block.querySelector('h1, h2, h3, h4, h5, h6, p');
  if (!heading && titleText) {
    heading = document.createElement(tagName);
    heading.textContent = titleText;
  }

  if (heading) {
    block.innerHTML = '';
    heading.classList.add('title');
    block.appendChild(heading);

    const subtitleText = (config.subtitle ?? '').trim();
    if (subtitleText) {
      const subType = (config['subtitle-type'] ?? config.subtitleType ?? 'p').trim().toLowerCase();
      const subTagName = SUBTITLE_TAG.test(subType) ? subType : 'p';
      const subtitle = document.createElement(subTagName);
      subtitle.className = 'subtitle';
      subtitle.textContent = subtitleText;
      const subSizeVal = config['subtitle-size'] ?? config.subtitle_size ?? '';
      const subSizeClass = toSizeClass(subSizeVal);
      if (subSizeClass) block.classList.add(`subtitle-${subSizeClass}`);
      block.appendChild(subtitle);
    }
  }
}

export default decorate;
