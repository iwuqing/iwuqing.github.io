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
  const d = iso instanceof Date ? iso : new Date(String(iso) + 'T00:00:00Z');
  if (isNaN(d)) return String(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${months[d.getUTCMonth()]} ${dd}, ${d.getUTCFullYear()}`;
}

function isoKey(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(String(iso) + 'T00:00:00Z');
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
      return `<button type="button" class="social-popup" data-zoom-src="${esc(s.popup)}" data-zoom-alt="${esc(s.title || '')}" data-zoom-kind="qr" title="${esc(s.title || '')}" aria-label="${esc(s.title || '')}"><i class="${esc(s.icon)}" aria-hidden="true"></i></button>`;
    }
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title || '')}" aria-label="${esc(s.title || '')}"><i class="${esc(s.icon)}" aria-hidden="true"></i></a>`;
  }).join('');

  const [emailUser, emailDomain] = (fm.email || '').split('@');

  const [role, ...affiliation] = String(fm.tagline || '').split(/\s*·\s*/);
  return {
    profile: `
      <aside class="profile" aria-label="Personal profile">
        <img src="${esc(fm.photo)}" alt="Photo of ${esc(fm.name)}" />
        <div class="profile-identity">
          <h1>${esc(fm.name || '')}${fm.name_cn ? `<span class="cn">${esc(fm.name_cn)}</span>` : ''}</h1>
          <p class="profile-role">${mdInline(role)}</p>
          ${affiliation.length ? `<p class="profile-affiliation">${mdInline(affiliation.join(' · '))}</p>` : ''}
        </div>
        ${socials ? `<div class="social-row">${socials}</div>` : ''}
        ${fm.email ? `<p class="photo-caption">${esc(emailUser)}<span class="at">[at]</span>${esc(emailDomain)}</p>` : ''}
        <a class="profile-cv" href="assets/pdf/WQ_CV.pdf" target="_blank" rel="noopener"><i class="far fa-file-alt" aria-hidden="true"></i> Curriculum vitae</a>
      </aside>`.trim(),
    about: `${md(body)}${topics ? `<ul class="topic-list">${topics}</ul>` : ''}`,
  };
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

  const rows = items.map(d => `
        <li>
          <span class="news-date">${esc(formatDate(d.date))}</span>
          <span class="news-body">${mdInline(d.body)}</span>
        </li>`);
  const latestCount = 6;
  return `<ul class="news-list">${rows.slice(0, latestCount).join('')}</ul>${rows.length > latestCount ? `
    <details class="news-archive">
      <summary>Earlier news <span>(${rows.length - latestCount})</span></summary>
      <ul class="news-list">${rows.slice(latestCount).join('')}</ul>
    </details>` : ''}`;
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
    const figureLabel = p.thumb_alt || p.title || '';
    const badges = (p.badges || []).map(b =>
      `<span class="badge${b.accent ? ' badge-accent' : ''}">${esc(b.text)}</span>`
    ).join('');
    const links = (p.links || []).map(l =>
      `<a href="${esc(l.url)}" class="paper-link paper-link-${/code/i.test(l.text) ? 'code' : 'paper'}" target="_blank" rel="noopener"><i class="${/code/i.test(l.text) ? 'fas fa-code' : 'far fa-file-alt'}" aria-hidden="true"></i>${esc(l.text)}</a>`
    ).join('');
    return `
      <article class="pub">
        ${p.thumb
          ? `<button class="pub-thumb" type="button" data-zoom-src="${esc(p.thumb)}" data-zoom-alt="${esc(figureLabel)}" aria-label="Enlarge thumbnail: ${esc(figureLabel)}"><img src="${esc(p.thumb)}" alt="" loading="lazy"/></button>`
          : `<div class="pub-thumb"></div>`}
        <div class="pub-body">
          <h3 class="pub-title">${esc(p.title || '')}</h3>
          <p class="pub-authors">${mdInline(p.authors || '')}</p>
          ${badges ? `<div class="pub-venue">${badges}</div>` : ''}
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
  const about = renderAbout();

  const rendered = tmpl
    .replace('{{title}}',        esc(meta.title))
    .replace('{{description}}',  esc(meta.description))
    .replace('{{author}}',       esc(meta.author))
    .replace('{{profile}}',      about.profile)
    .replace('{{about}}',        about.about)
    .replace('{{news}}',         renderNews())
    .replace('{{publications}}', renderPublications());

  const renderedFriends = read(path.join(ROOT, 'src/friends.template.html'))
    .replace('{{title}}', esc(`Friends | ${meta.author}`))
    .replace('{{description}}', esc(friends.sub))
    .replace('{{author}}', esc(meta.author))
    .replace('{{friends_sub}}', esc(friends.sub))
    .replace('{{friends}}', friends.list);

  // Reset & populate dist/
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), rendered);
  fs.mkdirSync(path.join(DIST, 'friends'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'friends/index.html'), renderedFriends);
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  // GitHub Pages: this file disables Jekyll processing on the deployed site.
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

  console.log(`✔ built dist/ in ${Date.now() - tStart}ms`);
}

if (require.main === module) build();

module.exports = { build };
