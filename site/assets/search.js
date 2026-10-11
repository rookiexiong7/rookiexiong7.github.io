(() => {
  const archive = document.querySelector('[data-archive]');
  if (!archive) return;
  const form = archive.querySelector('.search-form');
  const input = form.querySelector('input');
  const filters = archive.querySelector('.archive-filters');
  const from = filters?.querySelector('[name="from"]');
  const to = filters?.querySelector('[name="to"]');
  const tag = filters?.querySelector('[name="tag"]');
  const order = filters?.querySelector('[name="order"]');
  const original = archive.querySelector('[data-default-results]');
  const results = archive.querySelector('[data-search-results]');
  const status = archive.querySelector('.search-status');
  const pagination = archive.querySelector('.pagination');
  const more = archive.querySelector('.load-more');
  const hasPagination = !pagination.hidden;
  let indexPromise, matches = [], displayed = 0, request = 0, timer;
  form.hidden = false;
  if (filters) filters.hidden = false;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function appendResults() {
    for (const post of matches.slice(displayed, displayed + 10)) {
      const card = node('article', 'post-card');
      const main = node('div', 'post-card-main');
      const meta = node('div', 'post-meta');
      const date = node('time', '', post.date.replaceAll('-', '.'));
      date.dateTime = post.date;
      const category = node('a', '', post.categoryLabel);
      category.href = `/blog/category/${post.category}/`;
      meta.append(date, node('span', '', '/'), category);
      const title = node('h2', '');
      const link = node('a', '', post.title);
      link.href = post.url;
      title.append(link);
      main.append(meta, title, node('p', 'post-summary', post.summary));
      if (post.tags.length) {
        const tags = node('ul', 'post-tags');
        tags.setAttribute('aria-label', '标签');
        for (const tag of post.tags) {
          const item = node('li', '');
          const link = node('a', '', tag);
          link.href = `/blog/category/${post.category}/?tag=${encodeURIComponent(tag)}`;
          item.append(link);
          tags.append(item);
        }
        main.append(tags);
      }
      card.append(main);
      if (post.cover) {
        const cover = node('img', 'post-cover');
        cover.src = post.cover;
        cover.alt = '';
        cover.width = 160;
        cover.height = 112;
        cover.loading = 'lazy';
        cover.decoding = 'async';
        card.append(cover);
      }
      results.append(card);
    }
    displayed = Math.min(displayed + 10, matches.length);
    more.hidden = displayed >= matches.length;
  }

  function options() {
    return {
      category: archive.dataset.category, featured: archive.dataset.featured === 'true',
      query: input.value.trim(), from: from?.value || '', to: to?.value || '',
      tag: tag?.value || '', order: order?.value || 'newest',
    };
  }

  function restoreFilters() {
    const params = new URL(location.href).searchParams;
    input.value = params.get('q') || '';
    if (filters) {
      from.value = params.get('from') || '';
      to.value = params.get('to') || '';
      tag.value = params.get('tag') || '';
      order.value = params.get('order') === 'oldest' ? 'oldest' : 'newest';
    }
  }

  async function search(updateUrl = true) {
    const current = ++request;
    const state = options();
    const active = Boolean(state.query || state.from || state.to || state.tag || state.order === 'oldest');
    if (updateUrl) {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries({ q: state.query, from: state.from, to: state.to, tag: state.tag, order: state.order === 'oldest' ? 'oldest' : '' })) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
    original.hidden = active;
    pagination.hidden = active || !hasPagination;
    results.hidden = !active;
    status.hidden = !active;
    more.hidden = true;
    results.replaceChildren();
    if (!active) return;
    if (state.from && state.to && state.from > state.to) {
      status.textContent = '开始日期不能晚于结束日期。';
      return;
    }
    status.textContent = '正在筛选…';
    try {
      // Load only compact metadata, only when a visitor actually searches.
      indexPromise ||= fetch('/blog/search.json', { cache: 'no-cache' }).then(response => {
        if (!response.ok) throw new Error('Search unavailable');
        return response.json();
      }).catch(error => { indexPromise = undefined; throw error; });
      const posts = await indexPromise;
      if (current !== request) return;
      matches = window.BlogArchiveFilters.filterPosts(posts, state);
      status.textContent = matches.length ? `找到 ${matches.length} 篇文章` : '没有符合条件的文章，试试其他日期、标签或关键词。';
      displayed = 0;
      appendResults();
    } catch {
      if (current !== request) return;
      status.textContent = '筛选暂时不可用，可以继续浏览下方文章，或调整条件重试。';
      original.hidden = false;
      pagination.hidden = !hasPagination;
    }
  }
  input.addEventListener('input', () => {
    ++request;
    clearTimeout(timer);
    timer = setTimeout(search, 180);
  });
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });
  filters?.addEventListener('change', () => { clearTimeout(timer); search(); });
  filters?.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); search(); });
  filters?.querySelector('.reset-filters').addEventListener('click', () => {
    clearTimeout(timer);
    input.value = '';
    filters.reset();
    search();
  });
  more.addEventListener('click', appendResults);
  window.addEventListener('popstate', () => { clearTimeout(timer); restoreFilters(); search(false); });
  restoreFilters();
  const initial = options();
  if (initial.query || initial.from || initial.to || initial.tag || initial.order === 'oldest') search();
})();
