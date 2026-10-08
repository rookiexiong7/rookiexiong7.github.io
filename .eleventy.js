const fs = require('node:fs');
const markdownIt = require('markdown-it');
const blog = require('./lib/blog.cjs');

module.exports = function (config) {
  const markdown = markdownIt({ html: false, linkify: true, typographer: true })
    .use(require('markdown-it-anchor'))
    .use(require('@vscode/markdown-it-katex').default, { throwOnError: true, trust: false });
  const image = markdown.renderer.rules.image;
  markdown.renderer.rules.image = (tokens, index, options, env, self) => {
    tokens[index].attrSet('loading', 'lazy');
    tokens[index].attrSet('decoding', 'async');
    return image(tokens, index, options, env, self);
  };
  config.setLibrary('md', markdown);
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  config.addGlobalData('site', { name: 'Zhixiong Zhang', url: 'https://rookiexiong7.github.io' });
  config.addGlobalData('categories', blog.categories);
  config.addGlobalData('homepageChrome', blog.homepageChrome);
  config.addCollection('posts', collection => blog.publishedPosts(collection.getFilteredByGlob('./site/posts/**/*.md')));
  config.addCollection('archives', collection => blog.archives(blog.publishedPosts(collection.getFilteredByGlob('./site/posts/**/*.md'))));
  config.addFilter('dateISO', blog.isoDate);
  config.addFilter('dateDisplay', value => blog.isoDate(value).replaceAll('-', '.'));
  config.addFilter('categoryLabel', id => blog.category(id)?.label || id);
  config.addFilter('categoryCount', (posts, id) => posts.filter(post => post.data.category === id).length);
  config.addPassthroughCopy({ 'index.html': 'index.html', 'jemdoc.css': 'jemdoc.css', 'data': 'data', 'projects': 'projects', 'static': 'static' });
  config.addPassthroughCopy({ 'site/assets': 'blog/assets' });
  config.addPassthroughCopy({ 'node_modules/katex/dist/katex.min.css': 'blog/assets/katex/katex.min.css', 'node_modules/katex/dist/fonts': 'blog/assets/katex/fonts' });
  if (fs.existsSync('cv.pdf')) config.addPassthroughCopy('cv.pdf');
  config.addWatchTarget('index.html');
  config.addWatchTarget('jemdoc.css');
  config.ignores.add('site/posts/**/README.md');
  config.on('eleventy.before', () => {
    // A clean output prevents a deleted article or a newly private draft remaining public.
    fs.rmSync('_site', { recursive: true, force: true });
  });
  config.on('eleventy.after', () => fs.writeFileSync('_site/.nojekyll', ''));
  return { dir: { input: 'site', output: '_site', includes: '_includes' }, markdownTemplateEngine: false, htmlTemplateEngine: 'njk' };
};
