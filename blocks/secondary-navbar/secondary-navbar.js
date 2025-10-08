export default function decorate(block) {
  const items = [...block.children];
  const navWrapper = document.createElement('div');
  navWrapper.classList.add('secondary-nav-links');
  navWrapper.style.position = 'relative'; // Ensure indicator positions properly

  const ctaWrapper = document.createElement('div');
  ctaWrapper.classList.add('secondary-nav-cta-wrapper');

  const sectionLinks = [];

  // Create shared underline indicator
  const indicator = document.createElement('div');
  indicator.classList.add('nav-indicator');
  navWrapper.appendChild(indicator);

  items.forEach((row) => {
    const href = row.querySelector('.button-container a')?.getAttribute('href') || '#';
    const linkTitle = row.querySelectorAll('div')[1]?.textContent?.trim() || '';
    const linkType = row.querySelectorAll('div')[2]?.textContent?.trim();

    if (href && linkTitle) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = linkTitle;
      a.classList.add('secondary-nav-item');

      if (href.startsWith('#')) {
        sectionLinks.push({ id: href.slice(1), linkEl: a });
      }

      a.addEventListener('click', (e) => {
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.slice(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            const yOffset = -250;
            const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      });

      if (linkType === 'true') {
        a.classList.add('secondary-nav-cta');
        ctaWrapper.appendChild(a);
      } else {
        navWrapper.appendChild(a);
      }
    }
  });

  block.innerHTML = '';
  block.classList.add('secondary-navbar');
  block.appendChild(navWrapper);
  block.appendChild(ctaWrapper);

  // === Active section tracking + sliding indicator ===
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 260; // match yOffset

    sectionLinks.forEach(({ id, linkEl }) => {
      const section = document.getElementById(id);
      if (section) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;

        if (scrollPos >= top && scrollPos < bottom) {
          // Add active class
          linkEl.classList.add('active');
          linkEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

          // Move indicator
          const linkRect = linkEl.getBoundingClientRect();
          const navRect = navWrapper.getBoundingClientRect();
          indicator.style.width = `${linkRect.width}px`;
          indicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
        } else {
          linkEl.classList.remove('active');
        }
      }
    });
  });
}
