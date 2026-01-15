export default function decorate(block) {
  // Keep picture in place to avoid layout shifts; style via CSS
  const picture = block.querySelector('picture');
  if (picture) {
    picture.parentElement?.classList.add('hero-picture-wrapper');
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
}
