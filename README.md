# Qing Wu — Personal Academic Homepage

A lightweight academic homepage. Content is authored in **markdown** under `content/`, then compiled to a static `dist/` folder you can host anywhere — GitHub Pages, Netlify, S3, your own server. A GitHub Actions workflow handles build + deploy automatically on every push.

---

## ⭐ 每次更新主页的标准流程（最常看的部分）

每次想加新闻 / 加论文 / 改 bio / 换头像，就按下面这 5 步走，**全程约 3 分钟**。

```bash
# ────────────────────────────────────────────────
# Step 1. 切到项目目录
# ────────────────────────────────────────────────
cd "C:/Users/admin/Desktop/qing-wu-homepage"

# ────────────────────────────────────────────────
# Step 2. 改内容（只动 content/ 下的 md 文件）
# ────────────────────────────────────────────────
# 常见改动看下面 "Cheatsheet" 章节，几个例子：
#   - 加新闻       → content/news.md 最上面加 ## 2026-08-15 ...
#   - 加论文       → 在 content/publications/ 新建 <year>-<slug>.md，
#                    然后加到 content/publications/_list.json 数组
#   - 显示/隐藏论文 → 改对应 md 里 selected: true / false
#   - 改 bio       → content/about.md
#   - 加友链       → content/friends.md

# ────────────────────────────────────────────────
# Step 3. 本地预览（强烈推荐）
# ────────────────────────────────────────────────
npm run dev
# → 自动打开 http://localhost:8000 ，边改边自动刷新
# → 满意了按 Ctrl+C 关掉
# 如果端口被占用：PORT=8001 npm run dev

# ────────────────────────────────────────────────
# Step 4. 检查改动 + 提交
# ────────────────────────────────────────────────
git status              # 看哪些文件改了，确认没意外的东西
git add .
git commit -m "update: <一句话说改了啥>"
# 例如：
#   git commit -m "news: ICML 2026 papers accepted"
#   git commit -m "add publication: PnP-ADMM"
#   git commit -m "update bio: new affiliation"

# ────────────────────────────────────────────────
# Step 5. 推到 GitHub
# ────────────────────────────────────────────────
git push
```

**push 完之后等什么？**

1. 打开你的仓库 → 顶部 **Actions** 标签
2. 会看到两个 workflow 自动跑：
   - `Build & Deploy to GitHub Pages` — 我们写的 workflow，跑 `npm ci && npm run build` 把 `dist/` 打包上传
   - `pages build and deployment` — GitHub Pages 官方的发布阶段，把产物推到 CDN
3. 两个都变 ✅ 绿勾后（约 1 分钟），打开 https://iwuqing.github.io/
4. **必须强刷一次**清缓存，否则你看到的还是旧版：
   - Windows: `Ctrl + F5` 或 `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

就这样。

### ⚠️ 永远不要做的事

- ❌ 不要直接改 `dist/` 里的文件 —— 下次构建会被覆盖
- ❌ 不要 `git add dist/` 或 `git add node_modules/` —— `.gitignore` 已经忽略它们了，但人工 `git add <path>` 能绕过 `.gitignore`
- ❌ 不要在 GitHub Settings → Pages 里把 Source 改成 "Deploy from a branch"，必须保持 **GitHub Actions**，否则它会把根目录的 README.md 当主页发布出去

### 出了问题怎么办（5 个最常见的坑）

| 现象 | 原因 / 处理 |
|---|---|
| `git push` 报 Permission denied，反复要密码 | Personal Access Token 失效。重新生成 PAT，或装 GitHub CLI 一次 `gh auth login` 永久解决 |
| Actions 标签里红叉 | 点进去看日志。最常见是 YAML 写错（看 build.js 报的 message） |
| Push 完去看仍然是旧版 | 浏览器/CDN 缓存。强刷 Ctrl+F5。还不行就在隐身窗口打开 |
| 打开网站显示的是 README 内容，不是主页 | Settings → Pages → Source 没设成 "GitHub Actions"。改回去并手动 Run workflow |
| 改了图片但页面还是旧的 | 文件名相同时浏览器会缓存。换个文件名或强刷 |

---

## TL;DR — daily workflow

> 短版速查。详细解释看上面 "每次更新主页的标准流程"。

```bash
# 1. 改内容（只动 content/ 下的 md 文件）
#    e.g. 加新闻、改 bio、加论文、改 selected: true/false

# 2. 本地预览（推荐用 dev —— 改文件自动刷新浏览器）
npm run dev              # 起 http://localhost:8000，热重载
#   或者一次性预览不监听：
# npm run serve

# 3. 推到 GitHub
git add .
git commit -m "update: <写你改了啥>"
git push

# 4. 等大约 1 分钟，去 https://iwuqing.github.io 看新版
#    构建日志可以在仓库 Actions 标签页里看
#    第一次刷新页面时按 Ctrl+F5 强刷清缓存
```

**就这四步**。`dist/` 是 `.gitignore` 忽略掉的产物 —— 你不用提交它，GitHub Actions 会在云端自己跑 `npm run build` 重新生成。

> ⚠️ 永远不要直接改 `dist/` 里的文件 —— 它会在下次构建时被覆盖。

---

## Project layout

```
qing-wu-homepage/
├── content/                          # === edit these to update the site ===
│   ├── about.md                      # name, photo, bio, topics, social links
│   ├── news.md                       # all news, one file
│   ├── friends.md                    # friends list
│   └── publications/
│       ├── _list.json                # order of publications on the page
│       ├── 2026-riner.md             # one md per paper
│       └── …
├── assets/
│   ├── css/style.css                 # styling (CSS variables for easy tweaks)
│   ├── js/main.js                    # 20-line theme toggle + footer year
│   ├── img/wq.jpg                    # avatar
│   ├── img/papers/                   # paper thumbnails
│   └── pdf/WQ_CV.pdf
├── src/
│   └── index.template.html           # page shell with {{about}} {{news}} … placeholders
├── build.js                          # the build script
├── package.json
├── .github/workflows/deploy.yml      # CI: build + deploy to GitHub Pages
└── dist/                             # build output (gitignored)
```

## Editing guide

### Show / hide a publication

Open the paper's md file in `content/publications/` and toggle the `selected:` field:

```yaml
selected: true     # ← shown on the page
selected: false    # ← hidden, file kept
```

### Add a new publication

1. Drop the thumbnail into `assets/img/papers/`.
2. Create `content/publications/<year>-<slug>.md`:

   ```yaml
   ---
   selected: true
   title: "My Awesome Paper Title"
   authors: '**Qing Wu**, Collaborator A, Collaborator B'
   venue: "NeurIPS 2027"
   badges:
     - { text: "NeurIPS 2027" }
     - { text: "Oral", accent: true }       # `accent: true` = highlighted badge
   year: 2027
   thumb: assets/img/papers/myname.png
   links:
     - { text: "PDF",     url: "https://..." }
     - { text: "Code",    url: "https://..." }
     - { text: "Project", url: "https://..." }
   ---
   ```

   Tip: prefer **single quotes** for `authors:` so markdown `*` (used for co-first-author markers) doesn't need to be escaped.

3. Add the file name to `content/publications/_list.json` — the array order is the display order on the page.

### Add a news item

Open `content/news.md` and add a block (anywhere — the build sorts by date):

```markdown
## 2026-06-15
Brief news in markdown. Links and **bold** work. Emojis 🎉 too.
```

Items are split on `## <ISO date>` headings. Use `YYYY-MM-DD`; output is formatted as e.g. *Jun 15, 2026*.

### Update bio / photo / social links

Edit `content/about.md`. Frontmatter controls structured fields, and the markdown body is your free-form bio. The `social:` list accepts any [Font Awesome 6](https://fontawesome.com/search) icon (`fas fa-…` solid, `fab fa-…` brand).

### Visual tweaks

Color, spacing, max width — all driven by CSS variables at the top of `assets/css/style.css`:

```css
--max-width: 880px;
--accent:    #2563eb;
```

Dark mode follows `prefers-color-scheme` on first visit; the toggle in the navbar persists the user's choice.

## Building locally

Requires **Node.js ≥ 18**.

```bash
npm install        # one time
npm run dev        # 推荐：监听 content/src/assets 变化，自动重建 + 浏览器自动刷新
npm run build      # 一次性构建到 dist/
npm run serve      # 一次性构建 + 起一个普通 HTTP server（不监听变化）
npm run clean      # rm -rf dist/
```

**开发体验**：跑 `npm run dev` 后打开 `http://localhost:8000`。保存任何 `content/*.md`、`src/index.template.html`、`assets/css/style.css` 等文件，页面会自动重新构建并刷新（< 100ms）。
- YAML 语法写错？页面会显示红色错误信息，改对了立刻恢复。
- 端口被占用？`PORT=8001 npm run dev`。

跑 `npm run build` 后，`dist/` 是纯静态文件 —— 直接双击 `dist/index.html` 也能看（但没有 live reload）。

## Deploying to GitHub Pages

The repo includes `.github/workflows/deploy.yml`. On every push to `main`, GitHub Actions installs deps, runs `npm run build`, and publishes `dist/` via the official `actions/deploy-pages` action — **no `gh-pages` branch needed**.

### First-time setup (only do this once)

```bash
# 在项目目录里
git init
git add .
git commit -m "initial commit"

# 在 GitHub 上新建一个公开仓库，命名规则：
#   - 个人主页：仓库名必须是 <your-username>.github.io
#   - 项目页：随便起名，最终地址会是 <your-username>.github.io/<repo>/

git branch -M main
git remote add origin https://github.com/<your-username>/<your-username>.github.io.git
git push -u origin main
```

然后在 GitHub 网页上：

1. 进入仓库 → **Settings → Pages**
2. **Build and deployment → Source** 选 **GitHub Actions**（**不是** "Deploy from a branch"）
3. 第一次 push 之后，去 **Actions** 标签页等绿勾，约 1 分钟。
4. 打开 `https://<your-username>.github.io` 看效果。

### 之后每次改内容

见文件顶部 **TL;DR — daily workflow**。简单说就是：改 md → `git push` → 等 1 分钟 → 自动上线。

如果 push 之后没看到更新：
- 去仓库 **Actions** 页查看构建日志，红叉点进去看报错
- 浏览器强制刷新（Ctrl+F5 / Cmd+Shift+R）清掉缓存

### 手动重新部署（不改任何内容也想重跑一次）

GitHub 仓库 → **Actions → Build & Deploy → Run workflow → Run workflow**。

## Hosting elsewhere

`dist/` is plain static files. Drag it into Netlify / Vercel / Cloudflare Pages, or `rsync` it to any web server.

---

## Cheatsheet — 常见改动

### 加一条新闻
打开 `content/news.md`，最上面加：
```markdown
## 2026-07-01
新论文中了 **XXX 2026** 🎉
```
存盘 → `git add . && git commit -m "news: xxx" && git push`。

### 加一篇新论文
```bash
# 1. 把缩略图丢进 assets/img/papers/
# 2. 复制一个已有 md 改字段
cp content/publications/2026-riner.md content/publications/2027-newpaper.md
# 3. 编辑新 md（title / authors / venue / badges / thumb / links）
# 4. 把文件名加进 content/publications/_list.json 的数组里
```

### 把已有论文显示/隐藏
打开对应 md，改 frontmatter 里的 `selected:`：
```yaml
selected: true     # 显示
selected: false    # 隐藏（文件保留）
```

### 改 bio / 头像 / 社交图标
全在 `content/about.md`。换头像把新图片放到 `assets/img/`，改 frontmatter 里的 `photo:` 路径。

### 改友链
全在 `content/friends.md`，就是一个普通 markdown 列表。

### 调颜色 / 字体大小 / 页面宽度
`assets/css/style.css` 顶部的 CSS variables：
```css
--max-width: 880px;
--accent:    #2563eb;
```

### 加新部分（比如 "Teaching"）
1. 在 `src/index.template.html` 里加一个 `<section>` 和 `{{teaching}}` 占位
2. 在 `content/` 下建 `teaching.md`
3. 在 `build.js` 里写一个 `renderTeaching()` 函数，并在 `.replace('{{teaching}}', renderTeaching())` 里调用

---

## 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| `npm run build` 报错说找不到 `js-yaml` 或 `marked` | 没装依赖。跑 `npm install` |
| 本地预览看着对，但 push 后 GitHub 上没更新 | 看仓库 **Actions** 页，找最近一次 workflow，点进去看日志 |
| Actions 红叉，说 `Pages: Source must be set to GitHub Actions` | 仓库 **Settings → Pages → Source** 没选 "GitHub Actions" |
| 浏览器一直显示旧版本 | 强制刷新 Ctrl+F5 / Cmd+Shift+R |
| YAML 报错说作者那行有问题 | 用单引号包：`authors: '**Qing Wu**\*, ...'`，避免双引号里 `\*` 的转义麻烦 |
| 改了图片但页面还是旧的 | 文件名相同时浏览器会缓存；换个文件名或强制刷新 |

