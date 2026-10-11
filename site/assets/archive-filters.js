(() => {
  function filterPosts(posts, { category = '', featured = false, query = '', from = '', to = '', tag = '', order = 'newest' } = {}) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = posts.filter(post => {
      if (category && post.category !== category) return false;
      if (featured && post.featured !== true) return false;
      if (from && post.date < from) return false;
      if (to && post.date > to) return false;
      if (tag && !post.tags.includes(tag)) return false;
      const text = [post.title, post.summary, post.categoryLabel, ...post.tags, ...(post.keywords || [])].join(' ').toLocaleLowerCase();
      return terms.every(term => text.includes(term));
    });
    // The index already follows the site's date and publication-date order.
    return order === 'oldest' ? matches.reverse() : matches;
  }

  if (typeof module === 'object' && module.exports) module.exports = { filterPosts };
  else window.BlogArchiveFilters = { filterPosts };
})();
