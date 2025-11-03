export default function decorate(block) {
  Array.from(block.children).forEach((card) => {
    card.classList.add('mb-card');

    const [imgDiv, textDiv] = card.children;
    if (imgDiv) imgDiv.classList.add('mb-img');
    if (textDiv) textDiv.classList.add('mb-text');
  });
}
