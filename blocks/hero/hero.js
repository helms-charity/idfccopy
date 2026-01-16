export default function decorate(block) {
  if (!window.matchMedia('(min-width: 900px)').matches) {
    return;
  }

  if (block.dataset.heroPrepared === 'true') {
    return;
  }

  // Move the picture element to be positioned absolutely on the right
  const picture = block.querySelector('picture');
  if (picture) {
    const pictureParent = picture.parentElement;
    pictureParent.remove();
    block.appendChild(picture);
  }

  // Wrap button groups in a container for flexbox layout
  // Button groups are already created by global decorateButtonGroups() in scripts.js
  const buttonGroups = block.querySelectorAll('.button-group');
  if (buttonGroups.length > 0) {
    const buttonGroupsWrapper = document.createElement('div');
    buttonGroupsWrapper.className = 'button-groups-wrapper';

    // Insert wrapper before the first button group
    const firstGroup = buttonGroups[0];
    firstGroup.parentElement.insertBefore(buttonGroupsWrapper, firstGroup);

    // Move all button groups into the wrapper
    buttonGroups.forEach((group) => {
      buttonGroupsWrapper.appendChild(group);
    });
  }

  block.dataset.heroPrepared = 'true';
}
