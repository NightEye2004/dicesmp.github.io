(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Page entrance: never hold the page hostage waiting for large images.
     --------------------------------------------------------------------- */
  function hidePageLoader() {
    const loader = $('#pageLoader');
    if (!loader || loader.classList.contains('hidden')) return;
    loader.classList.add('hidden');
    window.setTimeout(() => loader.remove(), prefersReducedMotion ? 0 : 700);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.setTimeout(hidePageLoader, 150);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      window.setTimeout(hidePageLoader, prefersReducedMotion ? 0 : 180);
    }, { once: true });
  }
  window.setTimeout(hidePageLoader, 2600);

  /* ---------------------------------------------------------------------
     Scroll reveals and ambient particles.
     --------------------------------------------------------------------- */
  function initReveals() {
    const selector = [
      '.intro-copy', '.intro-note', '.intro-tags', '.feature-card', '.world-copy',
      '.world-stats article', '.custom-head', '.custom-grid article', '.crossplay-art',
      '.crossplay-copy', '.join-card', '.streamer-card', '.discord-inner', '.vote-card',
      '.vote-note', '.technical-section details', '.wiki-hero > *', '.wiki-section',
      '.wiki-help', '.wiki-quick-links'
    ].join(', ');
    const targets = $$(selector);

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });

    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
      target.classList.add('will-reveal');
      observer.observe(target);
    });

    // Catch anything already above the fold or revealed during a fast jump.
    const showPassedContent = () => {
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top < window.innerHeight + 60) {
          target.classList.add('is-visible');
          observer.unobserve(target);
        }
      });
    };
    showPassedContent();
  }

  function initParticles() {
    if (prefersReducedMotion) return;
    const field = $('.particle-field');
    if (!field) return;

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'ambient-particle';
      particle.style.setProperty('--particle-x', `${4 + Math.random() * 92}%`);
      particle.style.setProperty('--particle-y', `${8 + Math.random() * 84}%`);
      particle.style.setProperty('--particle-delay', `${Math.random() * -18}s`);
      particle.style.setProperty('--particle-duration', `${13 + Math.random() * 13}s`);
      fragment.append(particle);
    }
    field.append(fragment);
  }

  initReveals();
  initParticles();

  /* ---------------------------------------------------------------------
     Technical plugin list: visually redact private plugins.
     --------------------------------------------------------------------- */
  function initPluginVisibility() {
    const pluginList = $('.plugin-list p');
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

  /* ---------------------------------------------------------------------
     Mobile navigation: escape, outside click, scroll lock, and focus return.
     --------------------------------------------------------------------- */
  const menuToggle = $('.menu-toggle');
  const navLinks = $('.nav-links');
  const navScrim = $('[data-nav-close]');
  const mobileNav = window.matchMedia('(max-width: 820px)');

  function setMenu(open, returnFocus = false) {
    if (!menuToggle || !navLinks) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    if (navScrim) {
      navScrim.hidden = !open;
      navScrim.setAttribute('aria-hidden', String(!open));
    }
    if (!open && returnFocus) menuToggle.focus();
  }

  menuToggle?.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  navLinks?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  navScrim?.addEventListener('click', () => setMenu(false, true));

  document.addEventListener('click', (event) => {
    if (!navLinks?.classList.contains('open')) return;
    if (navLinks.contains(event.target) || menuToggle?.contains(event.target)) return;
    setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks?.classList.contains('open')) {
      setMenu(false, true);
    }
  });

  mobileNav.addEventListener('change', (event) => {
    if (!event.matches) setMenu(false);
  });

  /* ---------------------------------------------------------------------
     Header state, reading progress, active section, and back-to-top.
     --------------------------------------------------------------------- */
  const header = $('[data-header]');
  const progressBar = $('[data-scroll-progress]');
  const toTop = $('[data-to-top]');
  const sectionLinks = $$('#primary-navigation a[href^="#"]');

  const sectionTargets = sectionLinks
    .map((link) => ({ link, section: $(link.getAttribute('href')) }))
    .filter((item) => item.section);

  let scrollTicking = false;

  function updateSectionLinks() {
    if (!sectionTargets.length) return;
    const marker = window.scrollY + (header?.offsetHeight || 0) + 90;
    let active = sectionTargets[0];
    sectionTargets.forEach((item) => {
      if (item.section.offsetTop <= marker) active = item;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = sectionTargets[sectionTargets.length - 1];
    }
    sectionTargets.forEach(({ link }) => {
      const isActive = link === active.link;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function updateScrollUI() {
    const scrollTop = window.scrollY;
    header?.classList.toggle('is-scrolled', scrollTop > 12);

    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(scrollTop / max, 1) : 0})`;
    }

    toTop?.classList.toggle('is-visible', scrollTop > 720);
    updateSectionLinks();

    scrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUI);
  }, { passive: true });

  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /* ---------------------------------------------------------------------
     Wiki table of contents follows the reader.
     --------------------------------------------------------------------- */
  const toc = $('[data-toc]');
  if (toc) {
    const tocLinks = $$('a[href^="#"]', toc)
      .map((link) => ({ link, section: $(link.getAttribute('href')) }))
      .filter((item) => item.section);

    const updateToc = () => {
      if (!tocLinks.length) return;
      const marker = window.scrollY + (header?.offsetHeight || 0) + 120;
      let active = tocLinks[0];
      tocLinks.forEach((item) => {
        if (item.section.offsetTop <= marker) active = item;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        active = tocLinks[tocLinks.length - 1];
      }
      tocLinks.forEach(({ link }) => {
        const isActive = link === active.link;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    let tocTicking = false;
    window.addEventListener('scroll', () => {
      if (tocTicking) return;
      tocTicking = true;
      window.requestAnimationFrame(() => {
        updateToc();
        tocTicking = false;
      });
    }, { passive: true });
    updateToc();
  }

  /* ---------------------------------------------------------------------
     Copy-to-clipboard: server addresses, join cards, and wiki commands.
     --------------------------------------------------------------------- */
  const toast = $('.toast');
  const toastText = $('.toast-text');
  let toastTimer;

  function showToast(message, success = true) {
    if (!toast) return;
    if (toastText) toastText.textContent = message;
    toast.classList.toggle('is-error', !success);
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // Fall through to the selection-based fallback.
      }
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.style.cssText = 'position:fixed;inset:auto auto 0 0;width:1px;height:1px;opacity:0;';
    document.body.append(area);
    area.select();
    area.setSelectionRange(0, area.value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    area.remove();
    return copied;
  }

  function markCopied(trigger) {
    trigger.classList.add('is-copied');
    const glyph = trigger.querySelector('.copy-glyph use');
    const previousHref = glyph?.getAttribute('href');
    if (glyph) glyph.setAttribute('href', '#icon-check');
    window.setTimeout(() => {
      trigger.classList.remove('is-copied');
      if (glyph && previousHref) glyph.setAttribute('href', previousHref);
    }, 1800);
  }

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-copy]');
    if (!trigger) return;
    if (trigger.tagName === 'A') event.preventDefault();

    const value = trigger.getAttribute('data-copy')?.trim();
    if (!value) return;

    const copied = await copyText(value);
    if (copied) {
      markCopied(trigger);
      showToast(`Copied ${value}`);
    } else {
      showToast('Copy failed — select the address and copy it manually.', false);
    }
  });

  // Make command references keyboard-copyable without changing the guide markup.
  $$('.command-row code').forEach((code) => {
    const command = code.textContent.trim();
    if (!command.startsWith('/') || command.includes(' · ')) return;

    code.dataset.copy = command;
    code.classList.add('command-copy');
    code.tabIndex = 0;
    code.setAttribute('role', 'button');
    code.setAttribute('title', 'Copy command');
    code.setAttribute('aria-label', `Copy command ${command}`);
    code.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        code.click();
      }
    });
  });

  /* ---------------------------------------------------------------------
     Live server status from mcsrvstat.us, with a graceful cached fallback.
     --------------------------------------------------------------------- */
  const statusElements = $$('[data-server-status]');
  if (statusElements.length) {
    const versionElements = $$('[data-server-version]');
    const ENDPOINT = 'https://api.mcsrvstat.us/3/play.dicesmp.online';
    const CACHE_KEY = 'dicesmp:server-status:v1';
    const CACHE_TTL = 5 * 60 * 1000;
    const REFRESH_INTERVAL = 90 * 1000;
    let lastFetch = 0;
    let latestSnapshot = null;

    const readCache = () => {
      try {
        const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && cached.savedAt && Date.now() - cached.savedAt < CACHE_TTL) return cached;
      } catch (error) {
        // Storage can be unavailable in private browsing; live status still works.
      }
      return null;
    };

    const writeCache = (snapshot) => {
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
      } catch (error) {
        // Cache is an enhancement, not a requirement.
      }
    };

    const renderStatus = (snapshot) => {
      if (!snapshot) return;
      latestSnapshot = snapshot;
      const isOnline = snapshot.online === true;
      const isOffline = snapshot.online === false;
      const state = isOnline ? 'online' : isOffline ? 'offline' : 'unknown';
      const players = snapshot.players || {};
      const onlineCount = Number.isFinite(players.online) ? players.online : null;
      const maxCount = Number.isFinite(players.max) ? players.max : null;
      const statusText = isOnline
        ? `${onlineCount ?? '—'} / ${maxCount ?? '—'} players online`
        : isOffline
          ? 'Server is offline right now'
          : 'Live status unavailable';

      statusElements.forEach((element) => {
        element.dataset.state = state;
        const text = $('[data-status-text]', element);
        if (text) text.textContent = statusText;
        element.title = isOnline
          ? 'Live status from mcsrvstat.us'
          : 'Live status could not be retrieved. Check the Discord for updates.';
      });

      versionElements.forEach((element) => {
        if (snapshot.software || snapshot.version) {
          element.textContent = [snapshot.software || '', snapshot.version || ''].filter(Boolean).join(' ');
        }
      });
    };

    const cache = readCache();
    if (cache) renderStatus(cache);

    const fetchStatus = async () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) return;
      if (Date.now() - lastFetch < 30 * 1000) return;
      lastFetch = Date.now();

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(ENDPOINT, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
        const data = await response.json();
        const snapshot = {
          online: Boolean(data.online),
          players: {
            online: Number.isFinite(data.players?.online) ? data.players.online : null,
            max: Number.isFinite(data.players?.max) ? data.players.max : null
          },
          version: typeof data.version === 'string' ? data.version : '',
          software: typeof data.software === 'string' ? data.software : ''
        };
        renderStatus(snapshot);
        writeCache(snapshot);
      } catch (error) {
        if (!latestSnapshot) {
          renderStatus({ online: null, players: {}, version: '', software: '' });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    window.setTimeout(fetchStatus, 700);
    window.setInterval(fetchStatus, REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > REFRESH_INTERVAL) {
        fetchStatus();
      }
    });
  }
})();
