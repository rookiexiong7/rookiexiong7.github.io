const { searchIndex } = require('../../lib/blog.cjs');
module.exports = class {
  data() { return { permalink: '/blog/search.json', eleventyExcludeFromCollections: true }; }
  render({ collections }) { return JSON.stringify(searchIndex(collections.posts)); }
};
