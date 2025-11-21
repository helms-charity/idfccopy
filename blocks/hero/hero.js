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

  // Group button labels with their buttons
  // After removing picture parent, find the remaining content div
  const contentDivs = Array.from(block.querySelectorAll('div > div'));
  const contentDiv = contentDivs.find((div) => div.children.length > 0);

  if (contentDiv) {
    const allParagraphs = Array.from(contentDiv.querySelectorAll('p'));
    const heading = contentDiv.querySelector('h1, h2');

    // Find the label and button pairs
    const label1 = allParagraphs.find((p) => !p.classList.contains('button-container')
      && p.textContent.includes("Don't have"));
    const button1Container = allParagraphs.find((p) => p.classList.contains('button-container')
      && p.querySelector('.button.secondary'));
    const label2 = allParagraphs.find((p) => !p.classList.contains('button-container')
      && p.textContent.includes('Have an'));
    const button2Container = allParagraphs.find((p) => p.classList.contains('button-container')
      && p.querySelector('.button.primary'));

    // Find footer paragraphs (the last two)
    const footerParagraphs = allParagraphs.filter(
      (p) => !p.classList.contains('button-container')
        && !p.textContent.includes("Don't have")
        && !p.textContent.includes('Have an'),
    );

    if (label1 && button1Container && label2 && button2Container) {
      // Create wrapper for button groups
      const buttonGroupsWrapper = document.createElement('div');
      buttonGroupsWrapper.className = 'button-groups-wrapper';

      // Create first button group
      const buttonGroup1 = document.createElement('div');
      buttonGroup1.className = 'button-group';
      const label1Clone = label1.cloneNode(true);
      label1Clone.removeAttribute('class');
      buttonGroup1.appendChild(label1Clone);
      buttonGroup1.appendChild(button1Container.cloneNode(true));

      // Create second button group
      const buttonGroup2 = document.createElement('div');
      buttonGroup2.className = 'button-group';
      const label2Clone = label2.cloneNode(true);
      label2Clone.removeAttribute('class');
      buttonGroup2.appendChild(label2Clone);
      buttonGroup2.appendChild(button2Container.cloneNode(true));

      // Add groups to wrapper
      buttonGroupsWrapper.appendChild(buttonGroup1);
      buttonGroupsWrapper.appendChild(buttonGroup2);

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
