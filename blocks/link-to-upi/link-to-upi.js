export default function decorate(block) {
  const rows = Array.from(block.children);

  // Extract block-level fields from rows
  // Each row is a div containing a single div with the actual content
  let title = '';
  let text = '';
  let image = null;
  let imageAlt = '';

  // Row 0: title (plain text)
  if (rows.length > 0) {
    const firstCell = rows[0].querySelector(':scope > div');
    if (firstCell) {
      title = firstCell.textContent?.trim() || '';
    }
  }

  // Row 1: text (richtext)
  if (rows.length > 1) {
    const secondCell = rows[1].querySelector(':scope > div');
    if (secondCell) {
      text = secondCell.innerHTML || '';
    }
  }

  // Row 2: image (reference)
  if (rows.length > 2) {
    const thirdCell = rows[2].querySelector(':scope > div');
    if (thirdCell) {
      const imgElement = thirdCell.querySelector('img');
      if (imgElement) {
        image = imgElement.cloneNode(true);
      }
      // Also clone the picture element if it exists
      const pictureElement = thirdCell.querySelector('picture');
      if (pictureElement) {
        image = pictureElement.cloneNode(true);
      }
    }
  }

  // Row 3: imageAlt (plain text, optional)
  if (rows.length > 3) {
    const fourthCell = rows[3].querySelector(':scope > div');
    if (fourthCell) {
      imageAlt = fourthCell.textContent?.trim() || '';
    }
  }

  // Build the new structure
  block.innerHTML = '';

  // Create container
  const container = document.createElement('div');
  container.className = 'link-to-upi-container';

  // Add title
  if (title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'link-to-upi-title';
    titleEl.textContent = title;
    container.append(titleEl);
  }

  // Create image section
  const imageSection = document.createElement('div');
  imageSection.className = 'link-to-upi-image';

  if (image) {
    // Update alt text if provided
    if (imageAlt) {
      const img = image.tagName === 'IMG' ? image : image.querySelector('img');
      if (img) {
        img.alt = imageAlt;
      }
    }
    imageSection.append(image);
  }
  container.append(imageSection);

  // Add text content
  if (text) {
    const textEl = document.createElement('div');
    textEl.className = 'link-to-upi-text';
    textEl.innerHTML = text;
    container.append(textEl);
  }

  // Append container to block
  block.append(container);
}
