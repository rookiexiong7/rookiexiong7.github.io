const fs = require('node:fs');

const categories = [
  { id: 'papers', label: '论文解读', labelEn: 'Paper Notes', description: '拆解问题、方法与实验，留下值得继续追问的线索。' },
  { id: 'research', label: '研究笔记', labelEn: 'Research Notes', description: '记录实验过程、实现细节，以及研究中的新想法。' },
  { id: 'notes', label: '随记', labelEn: 'Notes', description: '一些学习记录，也留一点空间给日常。' },
];
const PAGE_SIZE = 10;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoDate = value => new Date(value).toISOString().slice(0, 10);
const category = id => categories.find(item => item.id === id);
const isPublished = data => data.draft !== true && new Date(data.date).getTime() <= Date.now();

function validate(data, fileSlug) {
  for (const field of ['title', 'summary']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${fileSlug}: ${field} is required`);
  }
  if (!category(data.category)) throw new Error(`${fileSlug}: category must be papers, research, or notes`);
  if (!data.date || !Number.isFinite(new Date(data.date).getTime())) throw new Error(`${fileSlug}: valid date is required`);
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${fileSlug}: draft must be true or false`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fileSlug)) throw new Error(`${fileSlug}: use a lowercase, hyphenated filename`);
  if (data.tags && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) throw new Error(`${fileSlug}: tags must be a list of strings`);
  if (data.paper && !/^https:\/\//.test(data.paper)) throw new Error(`${fileSlug}: paper must be an HTTPS link`);
  if (data.cover && !/^(https:\/\/|\/blog\/assets\/)/.test(data.cover)) throw new Error(`${fileSlug}: cover must use HTTPS or /blog/assets/`);
}

function publishedPosts(items) {
  const slugs = new Set();
  for (const item of items) {
    validate(item.data, item.fileSlug);
    if (slugs.has(item.fileSlug)) throw new Error(`Duplicate article filename: ${item.fileSlug}`);
    slugs.add(item.fileSlug);
  }
  return items.filter(item => isPublished(item.data)).sort((a, b) => b.date - a.date || a.fileSlug.localeCompare(b.fileSlug));
}

function archives(posts) {
  return [{ id: '', label: '全部文章', labelEn: 'All Posts' }, ...categories].flatMap(topic => {
    const items = topic.id ? posts.filter(post => post.data.category === topic.id) : posts;
    const base = topic.id ? `/blog/category/${topic.id}/` : '/blog/';
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const urlFor = page => page === 1 ? base : `${base}page/${page}/`;
    return Array.from({ length: totalPages }, (_, index) => ({
      topic, posts: items.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE), count: items.length,
      page: index + 1, totalPages, url: urlFor(index + 1),
      previous: index ? urlFor(index) : null, next: index + 1 < totalPages ? urlFor(index + 2) : null,
    }));
  });
}

function searchIndex(posts) {
  return posts.map(({ data, url }) => ({
    title: data.title, summary: data.summary, date: isoDate(data.date), url,
    category: data.category, categoryLabel: category(data.category).label, tags: data.tags || [],
  }));
}

function homepageChrome() {
  // Keep the homepage as the single source for the site's navigation.
  const source = fs.readFileSync('index.html', 'utf8');
  const navigation = source.match(/<nav class="top-nav">[\s\S]*?<\/nav>/)?.[0];
  if (!navigation) throw new Error('Homepage navigation is required for the Blog layout');
  const absoluteLinks = html => html.replace(/\b(src|href)="([^"]*)"/g, (match, attribute, url) => {
    return /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(url) ? match : `${attribute}="/${url}"`;
  });
  return {
    navigation: absoluteLinks(navigation)
      .replace('<nav class="top-nav">', '<nav class="top-nav" aria-label="主导航">')
      .replace('href="/blog/"', 'href="/blog/" class="active" aria-current="true"'),
  };
}

module.exports = { categories, PAGE_SIZE, escape, isoDate, category, isPublished, validate, publishedPosts, archives, searchIndex, homepageChrome };
