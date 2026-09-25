const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initPageEntrance() {
  const loader = document.querySelector('#pageLoader');
  const hideLoader = () => window.setTimeout(() => loader?.classList.add('hidden'), prefersReducedMotion ? 0 : 650);
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader, { once: true });

  const revealTargets = document.querySelectorAll(
    '.intro-copy, .intro-note, .intro-tags, .feature-card, .world-copy, .world-stats article, .custom-head, .custom-grid article, .crossplay-art, .crossplay-copy, .streamer-card, .discord-inner, .vote-card, .technical-section details, .wiki-hero > *, .wiki-section, .wiki-help'
  );

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealTargets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
      target.classList.add('will-reveal');
      revealObserver.observe(target);
    });
    const revealPassedSections = () => {
      revealTargets.forEach((target) => {
        if (target.getBoundingClientRect().top < window.innerHeight + 40) {
          target.classList.add('is-visible');
          revealObserver.unobserve(target);
        }
      });
    };
    window.addEventListener('scroll', revealPassedSections, { passive: true });
    revealPassedSections();
  }

  if (!prefersReducedMotion) {
    const field = document.querySelector('.particle-field');
    for (let index = 0; index < 12; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'ambient-particle';
      particle.style.setProperty('--particle-x', `${4 + Math.random() * 92}%`);
      particle.style.setProperty('--particle-y', `${8 + Math.random() * 84}%`);
      particle.style.setProperty('--particle-delay', `${Math.random() * -16}s`);
      particle.style.setProperty('--particle-duration', `${12 + Math.random() * 12}s`);
      field?.append(particle);
    }
  }
}

initPageEntrance();

function initPluginVisibility() {
  const pluginList = document.querySelector('.plugin-list p');
  if (!pluginList) return;

  const names = pluginList.textContent.trim().split(/\s*·\s*/);
  const content = [];

  names.forEach((name, index) => {
    const item = document.createElement('span');
    if (/^REDACTED_\d{2}$/.test(name)) {
      item.className = 'plugin-item plugin-item-blurred';
      item.setAttribute('aria-hidden', 'true');
      item.style.width = `${48 + (Number(name.slice(-2)) % 5) * 12}px`;
    } else {
      item.className = 'plugin-item';
      item.textContent = name;
    }
    content.push(item);
    if (index < names.length - 1) content.push(document.createTextNode(' · '));
  });

  pluginList.replaceChildren(...content);
}

initPluginVisibility();

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  navLinks.classList.toggle('open', !isOpen);
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    navLinks.classList.remove('open');
  });
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
