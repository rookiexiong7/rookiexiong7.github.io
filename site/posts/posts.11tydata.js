const { isPublished, validate } = require('../../lib/blog.cjs');
module.exports = {
  layout: 'post.njk',
  eleventyComputed: {
    permalink: data => {
      validate(data, data.page.fileSlug);
      return isPublished(data) ? `/blog/posts/${data.page.fileSlug}/` : false;
    },
  },
};
