#!/usr/bin/env node
/*
 * Build the homepage:
 *   - read src/index.template.html
 *   - render content/about.md, news.md, friends.md, publications/*.md
 *   - copy assets/ → dist/assets/
 *   - write dist/index.html
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// ---------- helpers ----------

function read(p) { return fs.readFileSync(p, 'utf8'); }

function parseFrontmatter(text) {
  // Expects: ---\n<yaml>\n---\n<body>
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  return {
    fm: yaml.load(m[1]) || {},
    body: (m[2] || '').trim(),
  };
}

function md(text)       { return marked.parse(text || ''); }
function mdInline(text) { return marked.parseInline(text || ''); }

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  // Accept Date objects (js-yaml auto-parses ISO dates) or strings
  const d = iso instanceof Date ? iso : new Date(String(iso) + 'T00:00:00');
  if (isNaN(d)) return String(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${months[d.getUTCMonth()]} ${dd}, ${d.getUTCFullYear()}`;
}

function isoKey(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(String(iso) + 'T00:00:00');
  return isNaN(d) ? String(iso) : d.toISOString().slice(0, 10);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---------- renderers ----------

function renderAbout() {
  const { fm, body } = parseFrontmatter(read(path.join(ROOT, 'content/about.md')));

  const topics = (fm.topics || []).map(t => `<li>${mdInline(t)}</li>`).join('');
  const socials = (fm.social || []).map(s => {
    // Items with `popup: <image>` open the image in the lightbox instead of navigating.
    if (s.popup) {
      return `<button type="button" class="social-popup" data-zoom-src="${esc(s.popup)}" data-zoom-alt="${esc(s.title || '')}" data-zoom-kind="qr" title="${esc(s.title || '')}" aria-label="${esc(s.title || '')}"><i class="${esc(s.icon)}"></i></button>`;
    }
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title || '')}"><i class="${esc(s.icon)}"></i></a>`;
  }).join('');

  const [emailUser, emailDomain] = (fm.email || '').split('@');

  return `
      <div class="hero-text">
        <h1>${esc(fm.name || '')} ${fm.name_cn ? `<span class="cn">${esc(fm.name_cn)}</span>` : ''}</h1>
        <p class="tagline">${mdInline(fm.tagline || '')}</p>
        ${md(body)}
        ${topics ? `<ul class="topic-list">${topics}</ul>` : ''}
      </div>
      <aside class="hero-photo">
        <img src="${esc(fm.photo)}" alt="Photo of ${esc(fm.name)}" />
        ${fm.email ? `<p class="photo-caption">${esc(emailUser)}<span class="at">[at]</span>${esc(emailDomain)}</p>` : ''}
        ${socials ? `<div class="social-row">${socials}</div>` : ''}
      </aside>
  `.trim();
}

function renderNews() {
  // Format: "## YYYY-MM-DD\n<body>\n\n## YYYY-MM-DD\n<body>"
  // Anything before the first "## " (e.g., a top-level # title) is ignored.
  const raw = read(path.join(ROOT, 'content/news.md'));
  const chunks = raw.split(/^##\s+/m).slice(1); // drop preamble
  const items = chunks.map(chunk => {
    const nl = chunk.indexOf('\n');
    const date = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = (nl === -1 ? '' : chunk.slice(nl + 1)).trim();
    return { date, body };
  });
  items.sort((a, b) => (isoKey(a.date) < isoKey(b.date) ? 1 : -1));

  return items.map(d => `
        <li>
          <span class="news-date">${esc(formatDate(d.date))}</span>
          <span class="news-body">${mdInline(d.body)}</span>
        </li>`).join('').trim();
}

function renderFriends() {
  const { fm, body } = parseFrontmatter(read(path.join(ROOT, 'content/friends.md')));
  // body is a markdown list; render and strip the outer <ul>
  const html = md(body);
  const inner = html.replace(/^\s*<ul>\s*/, '').replace(/\s*<\/ul>\s*$/, '');
  return { sub: fm.description || '', list: inner };
}

function renderPublications() {
  const listPath = path.join(ROOT, 'content/publications/_list.json');
  const list = JSON.parse(read(listPath));
  const files = list.publications || [];

  const visible = files
    .map(f => parseFrontmatter(read(path.join(ROOT, 'content/publications', f))).fm)
    .filter(p => p && p.selected === true);

  if (visible.length === 0) {
    return `<p class="loading">No publications marked as <code>selected: true</code>.</p>`;
  }

  return visible.map(p => {
    const badges = (p.badges || []).map(b =>
      `<span class="badge${b.accent ? ' badge-accent' : ''}">${esc(b.text)}</span>`
    ).join('');
    const links = (p.links || []).map(l =>
      `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.text)}</a>`
    ).join(' · ');
    return `
      <article class="pub">
        ${p.thumb
          ? `<button class="pub-thumb" type="button" data-zoom-src="${esc(p.thumb)}" data-zoom-alt="${esc(p.title || '')}" aria-label="Enlarge thumbnail"><img src="${esc(p.thumb)}" alt="" loading="lazy"/></button>`
          : `<div class="pub-thumb"></div>`}
        <div class="pub-body">
          ${badges ? `<div class="pub-venue">${badges}</div>` : ''}
          <h3 class="pub-title">${esc(p.title || '')}</h3>
          <p class="pub-authors">${mdInline(p.authors || '')}</p>
          ${links ? `<p class="pub-links">${links}</p>` : ''}
        </div>
      </article>`;
  }).join('').trim();
}

// ---------- main ----------

function build() {
  const tStart = Date.now();
  console.log('▶ building…');

  // Page-level metadata pulled from about.md frontmatter (with sensible fallbacks)
  const aboutFm = parseFrontmatter(read(path.join(ROOT, 'content/about.md'))).fm;
  const meta = {
    title:       aboutFm.page_title       || (aboutFm.name || 'Homepage'),
    description: aboutFm.page_description  || `Personal homepage of ${aboutFm.name || ''}.`,
    author:      aboutFm.name              || '',
  };

  const tmpl = read(path.join(ROOT, 'src/index.template.html'));
  const friends = renderFriends();

  const rendered = tmpl
    .replace('{{title}}',        esc(meta.title))
    .replace('{{description}}',  esc(meta.description))
    .replace('{{author}}',       esc(meta.author))
    .replace('{{about}}',        renderAbout())
    .replace('{{news}}',         renderNews())
    .replace('{{publications}}', renderPublications())
    .replace('{{friends_sub}}',  esc(friends.sub))
    .replace('{{friends}}',      friends.list);

  // Reset & populate dist/
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), rendered);
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  // GitHub Pages: this file disables Jekyll processing on the deployed site.
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

  console.log(`✔ built dist/ in ${Date.now() - tStart}ms`);
}

if (require.main === module) build();

module.exports = { build };
