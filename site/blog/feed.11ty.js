const { escape } = require('../../lib/blog.cjs');
module.exports = class {
  data() { return { permalink: '/blog/feed.xml', eleventyExcludeFromCollections: true }; }
  render({ collections, site }) {
    return `<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escape(site.name)} · Blog</title><link>${site.url}/blog/</link><description>论文解读、研究笔记，以及一路上的所思所想。</description><language>zh-cn</language><atom:link href="${site.url}/blog/feed.xml" rel="self" type="application/rss+xml"/>${collections.posts.slice(0, 20).map(post => `<item><title>${escape(post.data.title)}</title><link>${site.url}${post.url}</link><guid>${site.url}${post.url}</guid><pubDate>${post.date.toUTCString()}</pubDate><description>${escape(post.data.summary)}</description></item>`).join('')}</channel></rss>`;
  }
};
