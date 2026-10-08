const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { checkFiles } = require('../scripts/check-blog.cjs');
const root = path.resolve(__dirname, '..');

test('Blog rejects large images and paper/video attachments', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-budget-'));
  try {
    for (const name of ['paper.pdf', 'video.MP4']) {
      const file = path.join(temp, name);
      fs.writeFileSync(file, 'test');
      assert.throws(() => checkFiles([file]), /externally/);
    }
    const image = path.join(temp, 'cover.webp');
    fs.writeFileSync(image, Buffer.alloc(301 * 1024));
    assert.throws(() => checkFiles([image]), /exceeds/);
    fs.writeFileSync(image, Buffer.alloc(200 * 1024));
    assert.equal(checkFiles([image]), 200 * 1024);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('A real build paginates, hides drafts, renders math, and keeps only metadata in search', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-build-'));
  try {
    for (const file of ['.eleventy.js', 'lib', 'site', 'index.html', 'jemdoc.css']) {
      fs.cpSync(path.join(root, file), path.join(temp, file), {
        recursive: true,
        // Keep fixture counts independent of the real articles in the blog.
        filter: source => !source.startsWith(path.join(root, 'site/posts') + path.sep)
          || !source.endsWith('.md') || path.basename(source) === 'writing-template.md',
      });
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
    for (const directory of ['data', 'projects', 'static']) fs.mkdirSync(path.join(temp, directory));
    const writePost = (slug, { title = `Fixture ${slug}`, date = '2020-01-01', category = 'papers', draft = false } = {}) => {
      fs.writeFileSync(path.join(temp, 'site/posts', `${slug}.md`), `---\ntitle: ${JSON.stringify(title)}\ndate: "${date}"\ncategory: ${category}\nsummary: "A summary with <script>markup</script> & quotes."\ndraft: ${draft}\ntags: [Vision]\n---\n\n## A heading\n\nBODY_ONLY_MARKER\n\n$$\nx^2 + y^2 = 1\n$$\n\n| A | B |\n|---|---|\n| 1 | 2 |\n`);
    };
    for (let i = 1; i <= 13; i++) writePost(`paper-${i}`, { date: `2020-01-${String(i).padStart(2, '0')}` });
    writePost('research-one', { category: 'research', title: 'Research <script>alert(1)</script>' });
    writePost('private-draft', { draft: true });
    writePost('future-post', { date: '2999-01-01' });
    const build = () => execFileSync(process.execPath, [path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs')], { cwd: temp, encoding: 'utf8', stdio: 'pipe' });
    try { build(); } catch (error) { throw new Error(`${error.stdout}\n${error.stderr}`); }
    const output = path.join(temp, '_site');
    const read = file => fs.readFileSync(path.join(output, file), 'utf8');
    assert.equal((read('blog/index.html').match(/class="post-card"/g) || []).length, 10);
    assert.equal((read('blog/page/2/index.html').match(/class="post-card"/g) || []).length, 4);
    assert.equal((read('blog/category/papers/page/2/index.html').match(/class="post-card"/g) || []).length, 3);
    assert.match(read('blog/category/notes/index.html'), /下一篇笔记/);
    assert.equal(fs.existsSync(path.join(output, 'blog/posts/private-draft')), false);
    assert.equal(fs.existsSync(path.join(output, 'blog/posts/future-post')), false);
    assert.equal(fs.existsSync(path.join(output, 'blog/posts/writing-template')), false);
    const index = JSON.parse(read('blog/search.json'));
    assert.equal(index.length, 14);
    assert.equal(index[0].url, '/blog/posts/paper-13/');
    assert.doesNotMatch(read('blog/search.json'), /BODY_ONLY_MARKER|private-draft|future-post/);
    assert.equal(read('index.html'), fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
    const article = read('blog/posts/research-one/index.html');
    assert.match(article, /class="katex"/);
    assert.match(article, /<table>/);
    assert.match(article, /id="a-heading"/);
    assert.match(article, /&lt;script&gt;/);
    assert.doesNotMatch(article, /<script>alert/);
    assert.match(article, /katex.min.css/);
    assert.doesNotMatch(read('blog/feed.xml'), /private-draft|future-post/);
    // All generated blog links and asset URLs must resolve without JavaScript.
    const htmlFiles = fs.readdirSync(output, { recursive: true }).filter(file => file.endsWith('.html'));
    for (const file of htmlFiles) {
      for (const match of read(file).matchAll(/(?:href|src)="(\/blog\/[^"?#]*)/g)) {
        const target = path.join(output, match[1], match[1].endsWith('/') ? 'index.html' : '');
        assert.ok(fs.existsSync(target), `${file}: missing ${match[1]}`);
      }
    }
    // Turning a published article into a draft must remove stale output and indexes.
    writePost('paper-13', { draft: true });
    build();
    assert.equal(fs.existsSync(path.join(output, 'blog/posts/paper-13')), false);
    assert.doesNotMatch(read('blog/search.json'), /paper-13/);
    // Metadata mistakes should stop publishing instead of producing broken navigation.
    writePost('invalid-category', { category: 'typo' });
    assert.throws(build, /Command failed/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
