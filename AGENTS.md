# AGENTS.md — AI 도우미를 위한 안내서

Korean mobile wedding invitation template, deployed with GitHub Pages via Actions.
The person you're helping is most likely **not a developer**: reply in Korean, in plain words, one step at a time.
For the end-to-end flow (interview → GitHub setup → config.js), follow the **🤖 AI 도우미 안내** section in `README.md`.

## Rules

1. **Almost every request is a `config.js` edit.** Content, theme, section order — all in `config.js`. Don't touch `assets/`, `index.html` or `scripts/` unless the user asks for something `config.js` can't express.
2. **Never break `config.js` syntax.** It assigns a plain object to `window.WEDDING`. Keep every comma, quote, the trailing `};` and the Korean comments (they're the user's manual). Multi-line text uses backticks.
3. **Don't delete keys.** Hide a feature with `enabled: false` or by removing its id from `sections`.
4. **Never invent** phone numbers, account numbers or coordinates.
5. **In chat (no repo access), output the entire `config.js`** in one code block.
6. **Validate before committing** when you can run commands: `node scripts/build.mjs`.
7. **Photos go in `images/`** (`cover.jpg`, optional `og.jpg` / `closing.jpg` / `bgm.mp3`, gallery photos in `images/gallery/`). Keep `gallery.images: []` so the build lists the gallery folder automatically. Full-size phone photos are fine (see Build).
8. **`demo/` holds the template's sample images**, shown only while `images/` has no photos. Users building their own invitation can delete it.

## Field formats

| Key | Format |
|---|---|
| `wedding.date` / `time` | `'YYYY-MM-DD'` / 24h `'HH:MM'` (KST) |
| `wedding.lat` / `lng` | numbers (WGS84) |
| `theme.preset` | `ivory` `blush` `sage` `navy` `mono` `lavender` |
| `theme.font` / `theme.effect` | `serif` `sans` `hand` / `none` `petal` `snow` `sparkle` |
| `cover.layout` / `gallery.layout` | `full` `arch` `frame` / `grid` `masonry` `slide` |
| `deceasedMark` | `flower` `hanja` `none` |
| `location.transport[].type` | `subway` `bus` `car` `parking` `shuttle` |
| `sections` | ordered ids: `cover greeting contact calendar story gallery video location notice rsvp account guestbook closing` |
| `googleScriptUrl` | `https://script.google.com/macros/s/.../exec` or `''` (enables RSVP + guestbook) |
| `share.kakaoJsKey` | Kakao JavaScript key or `''` |

## Build (`.github/workflows/deploy.yml`)

1. `scripts/build.mjs` — validates `config.js`; resolves photo paths case/extension-insensitively; lists `images/gallery/` when `gallery.images` is empty; falls back to `og` → cover and drops missing optional photos; uses `demo/` only while `images/` has no photos; injects OG meta with absolute URLs; writes `_site/`. Path fixes are appended to `_site/config.js`, never to the source.
2. `scripts/optimize_images.py` — resizes to 1600px, strips EXIF/GPS, writes gallery thumbnails to `_site/_thumbs/` and sets `window.WEDDING_THUMBS` (app.js falls back to the full image).

## Code map

```
config.js            user content
index.html           shell; <!-- META:START/END --> is rewritten at build time
assets/app.js        renders sections from window.WEDDING (vanilla JS, no framework)
assets/style.css     themes = CSS variables under [data-theme="..."]
google-apps-script/  optional Google Sheets backend for RSVP + guestbook
```

New section: add `R.name` in `app.js` returning `section('name', ...)`, a config block in `config.js`, its id in `sections`, styles using `--accent --ink --paper --line --tint`. Escape user text with `esc()` / `nl2br()`.

## Local preview

```
node scripts/build.mjs && python3 scripts/optimize_images.py _site && python3 -m http.server -d _site
```
Opening `index.html` directly works too: while `demo/demo.js` exists it shows the demo photos; otherwise photos only appear after a build. `?preview` shows setup hints for unconfigured features.
