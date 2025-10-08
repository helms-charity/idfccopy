export default function decorate(block) {
  // const isMobile = window.matchMedia('(max-width: 767px)').matches;
  // if (!isMobile) return; // Skip accordion transformation on desktop
  [...block.children].forEach((row) => {
    const children = [...row.children];
    // only process rows with exactly 2 children (question + answer)
    if (children.length === 2) {
      const label = children[0];
      const summary = document.createElement('summary');
      summary.className = 'accordion-item-label';
      summary.append(...label.childNodes);
      const body = children[1];
      body.className = 'accordion-item-body';
      const details = document.createElement('details');
      details.className = 'accordion-item';
      details.append(summary, body);
      row.replaceWith(details);
    } else {
      // remove or ignore malformed rows (like dummy divs)
      row.remove();
    }
  });
  // Optional: Only one open at a time
  const footerAccordion = document.querySelector(".footer-accordion")
  block.querySelectorAll('details').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      // if (detail.open) {
      //   block.querySelectorAll('details').forEach((el) => {
      //     if (el !== detail) el.removeAttribute('open');
      //   });
      // }
    });
  });
}