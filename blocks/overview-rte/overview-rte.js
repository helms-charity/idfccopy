/*eslint-disable */
export default function decorate(block) {
  block.id = "overview";
  const heading = block.querySelector('h2');
  const paragraphs = block.querySelectorAll('p');
  // Apply class to heading and first paragraph
  if (heading) heading.classList.add('overview-rte-title');
  if (paragraphs[0]) paragraphs[0].classList.add('overview-rte-para');
  // If there's more than one paragraph, create hidden container and button
  if (paragraphs.length > 1) {
    // Create the hidden container
    const hiddenWrapper = document.createElement('div');
    hiddenWrapper.classList.add('overview-rte-hiddenPara');
    hiddenWrapper.style.display = 'none';
    // Move all paragraphs after the first into the hidden wrapper
    paragraphs.forEach((p, i) => {
      if (i > 0) hiddenWrapper.appendChild(p);
    });
    // Add hidden wrapper after the first paragraph
    paragraphs[0].insertAdjacentElement('afterend', hiddenWrapper);
    // Create the Read More button
    const readMoreBtn = document.createElement('p');
    readMoreBtn.className = 'overview-rte-readMore';
    readMoreBtn.textContent = 'Read more';
    readMoreBtn.addEventListener('click', () => {
      const expanded = hiddenWrapper.style.display === 'none';
      hiddenWrapper.style.display = expanded ? 'block' : 'none';
      readMoreBtn.textContent = expanded ? 'Read less' : 'Read more';
    });
    // Insert the button after the hidden content
    hiddenWrapper.insertAdjacentElement('afterend', readMoreBtn);
  }
}