export default function decorate(block) {
  // Move the picture element to be positioned absolutely
  const picture = block.querySelector('picture');
  if (picture) {
    const pictureParent = picture.parentElement;
    pictureParent.remove();
    block.appendChild(picture);
  }
}
