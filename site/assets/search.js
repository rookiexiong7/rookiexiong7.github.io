(() => {
  const archive = document.querySelector('[data-archive]');
  if (!archive) return;
  const form = archive.querySelector('.search-form');
  const input = form.querySelector('input');
  const original = archive.querySelector('[data-default-results]');
  const results = archive.querySelector('[data-search-results]');
  const status = archive.querySelector('.search-status');
  const pagination = archive.querySelector('.pagination');
  const more = archive.querySelector('.load-more');
  const hasPagination = !pagination.hidden;
  let indexPromise, matches = [], displayed = 0, request = 0, timer;
  form.hidden = false;

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
      meta.append(date, node('span', '', '/'), node('span', '', post.categoryLabel));
      const title = node('h2', '');
      const link = node('a', '', post.title);
      link.href = post.url;
      title.append(link);
      main.append(meta, title, node('p', 'post-summary', post.summary));
      card.append(main);
      results.append(card);
    }
    displayed = Math.min(displayed + 10, matches.length);
    more.hidden = displayed >= matches.length;
  }

  async function search() {
    const current = ++request;
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    original.hidden = Boolean(query);
    pagination.hidden = Boolean(query) || !hasPagination;
    results.hidden = !query;
    status.hidden = !query;
    more.hidden = true;
    results.replaceChildren();
    if (!query) return;
    status.textContent = '正在搜索…';
    try {
      // Load only compact metadata, only when a visitor actually searches.
      indexPromise ||= fetch('/blog/search.json').then(response => {
        if (!response.ok) throw new Error('Search unavailable');
        return response.json();
      }).catch(error => { indexPromise = undefined; throw error; });
      const posts = await indexPromise;
      if (current !== request) return;
      const terms = query.toLocaleLowerCase().split(/\s+/);
      matches = posts.filter(post => {
        if (archive.dataset.category && post.category !== archive.dataset.category) return false;
        const text = [post.title, post.summary, post.categoryLabel, ...post.tags].join(' ').toLocaleLowerCase();
        return terms.every(term => text.includes(term));
      });
      status.textContent = matches.length ? `找到 ${matches.length} 篇文章` : '没有找到相关文章，试试其他关键词。';
      displayed = 0;
      appendResults();
    } catch {
      if (current !== request) return;
      status.textContent = '搜索暂时不可用，可以继续浏览下方文章，或重新输入关键词重试。';
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
  more.addEventListener('click', appendResults);
  input.value = new URL(location.href).searchParams.get('q') || '';
  if (input.value) search();
})();
