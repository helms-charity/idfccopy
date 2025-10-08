export default function decorate(block) {
  const items = Array.from(block.children);

  items.forEach((item) => {
    item.classList.add('git-lists');
  });
}
