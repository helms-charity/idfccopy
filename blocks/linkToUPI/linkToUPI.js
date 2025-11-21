export default function decorate(block) {
  const rows = Array.from(block.children);

  // Extract block-level fields from single-cell rows
  let title = '';
  let text = '';
  let image = null;
  let imageAlt = '';

  // Row 0: title (1 cell, plain text)
  if (rows.length > 0 && rows[0].children.length === 1) {
    title = rows[0].children[0]?.textContent?.trim() || '';
  }

  // Row 1: text (1 cell, richtext)
  if (rows.length > 1 && rows[1].children.length === 1) {
    const textDiv = rows[1].children[0];
    text = textDiv?.innerHTML || '';
  }

  // Row 2: image (1 cell, reference)
  if (rows.length > 2 && rows[2].children.length === 1) {
    const imageDiv = rows[2].children[0];
    const imgElement = imageDiv?.querySelector('img');
    if (imgElement) {
      image = imgElement;
    }
  }

  // Row 3: imageAlt (1 cell, plain text)
  if (rows.length > 3 && rows[3].children.length === 1) {
    imageAlt = rows[3].children[0]?.textContent?.trim() || '';
  }

  // Build the structure
  block.textContent = '';

  // Create container
  const container = document.createElement('div');
  container.className = 'linkToUPI-container';

  // Create left content section
  const leftContent = document.createElement('div');
  leftContent.className = 'linkToUPI-content';

  // Add title
  if (title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'linkToUPI-title';
    titleEl.textContent = title;
    leftContent.append(titleEl);
  }

  // Add text content
  if (text) {
    const textEl = document.createElement('div');
    textEl.className = 'linkToUPI-text';
    textEl.innerHTML = text;
    leftContent.append(textEl);
  }

  // Create right image section
  const rightContent = document.createElement('div');
  rightContent.className = 'linkToUPI-image';

  if (image) {
    if (imageAlt) {
      image.alt = imageAlt;
    }
    rightContent.append(image);
  }

  // Append both sections to container
  container.append(leftContent);
  container.append(rightContent);

  // Append container to block
  block.append(container);
}
