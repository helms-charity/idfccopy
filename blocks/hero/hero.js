export default function decorate(block) {
  // Move the picture element to be positioned absolutely on the right
  const picture = block.querySelector('picture');
  if (picture) {
    // Remove the picture from its parent div
    const pictureParent = picture.parentElement;
    pictureParent.remove();

    // Append it directly to the hero block for absolute positioning
    block.appendChild(picture);
  }

  // Group button labels with their buttons based on HTML structure
  // After removing picture parent, find the remaining content div
  const contentDivs = Array.from(block.querySelectorAll('div > div'));
  const contentDiv = contentDivs.find((div) => div.children.length > 0);

  if (contentDiv) {
    const allParagraphs = Array.from(contentDiv.querySelectorAll('p'));
    const heading = contentDiv.querySelector('h1, h2');

    // Find button pairs by looking for <em><a> or <strong><a> patterns
    const buttonPairs = [];
    const processedIndices = new Set();

    allParagraphs.forEach((p, index) => {
      // Check if paragraph contains a link wrapped in em or strong
      const emLink = p.querySelector('em > a');
      const strongLink = p.querySelector('strong > a');

      if (emLink || strongLink) {
        const link = emLink || strongLink;
        const isSecondary = !!emLink;

        // Apply button styling
        link.classList.add('button');
        link.classList.add(isSecondary ? 'secondary' : 'primary');
        p.classList.add('button-container');

        // Find the label (previous paragraph without a link)
        let label = null;
        if (index > 0) {
          const prevP = allParagraphs[index - 1];
          if (!prevP.querySelector('a') && !processedIndices.has(index - 1)) {
            label = prevP;
            processedIndices.add(index - 1);
          }
        }

        buttonPairs.push({ label, buttonContainer: p });
        processedIndices.add(index);
      }
    });

    // Find footer paragraphs (not labels, not buttons, not headings)
    const footerParagraphs = allParagraphs.filter(
      (p, index) => !processedIndices.has(index) && !p.querySelector('a'),
    );

    if (buttonPairs.length > 0) {
      // Create wrapper for button groups
      const buttonGroupsWrapper = document.createElement('div');
      buttonGroupsWrapper.className = 'button-groups-wrapper';

      // Create button groups for each pair
      buttonPairs.forEach(({ label, buttonContainer }) => {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';

        if (label) {
          const labelClone = label.cloneNode(true);
          labelClone.removeAttribute('class');
          buttonGroup.appendChild(labelClone);
        }

        buttonGroup.appendChild(buttonContainer.cloneNode(true));
        buttonGroupsWrapper.appendChild(buttonGroup);
      });

      // Clear content and rebuild
      contentDiv.innerHTML = '';
      if (heading) contentDiv.appendChild(heading);
      contentDiv.appendChild(buttonGroupsWrapper);

      // Add footer paragraphs
      footerParagraphs.forEach((p) => {
        contentDiv.appendChild(p.cloneNode(true));
      });
    }
  }
}
