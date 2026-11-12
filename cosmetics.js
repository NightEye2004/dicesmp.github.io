(() => {
  'use strict';

  const grid = document.querySelector('[data-cosmetic-grid]');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.cosmetic-card'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const search = document.querySelector('[data-cosmetic-search]');
  const results = document.querySelector('[data-cosmetic-results]');
  const empty = document.querySelector('[data-cosmetic-empty]');
  const reset = document.querySelector('[data-cosmetic-reset]');

  let activeFilter = 'all';

  const normalize = (value) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  function setFilter(filter) {
    activeFilter = filter;
    filters.forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function applyFilters() {
    const query = normalize(search ? search.value.trim() : '');
    let visible = 0;

    cards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/);
      const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);
      const matchesSearch = !query || normalize(card.textContent).includes(query);
      const show = matchesFilter && matchesSearch;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (results) {
      results.textContent = `Showing ${visible} of ${cards.length} sets`;
    }
    if (empty) {
      empty.hidden = visible !== 0;
    }
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      setFilter(button.dataset.filter || 'all');
      applyFilters();
    });
  });

  search?.addEventListener('input', applyFilters);

  search?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      search.value = '';
      applyFilters();
    }
  });

  reset?.addEventListener('click', () => {
    if (search) search.value = '';
    setFilter('all');
    applyFilters();
    search?.focus();
  });

  applyFilters();
})();
