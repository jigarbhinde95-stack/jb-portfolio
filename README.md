# Jigar Bhinde — web résumé

A responsive, accessible résumé for Jigar Bhinde, inspired by the restrained layout of ketulchhaya.com/web-resume. Content and contact links come from the supplied 2026 résumé. The original PDF is included for download.

## Develop

Requires Node.js 20.19+ or 22.12+ (Node 24 is used in CI).

```sh
npm ci
npm run dev
```

The site uses plain HTML, CSS, and JavaScript, served and built with Vite. It has no backend, external fonts, analytics, API keys, or required environment variables. Theme and text-size preferences stay in the visitor's browser. All résumé content and links remain accessible without JavaScript.

## Build and test

```sh
npm run build
npm run preview
```

The deployable static website is written to `dist/`. Relative asset paths support hosting at either a domain root or a subdirectory, including a GitHub Pages project path.

```sh
npx playwright install chromium
npm test
```

If Chromium is already installed, use it instead of downloading another copy:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Tests run against a production build on desktop and mobile. They cover résumé content, contact links, the actual PDF download, theme and text-size persistence, WCAG accessibility checks, keyboard navigation, narrow-screen overflow, JavaScript-free content, and print layout. GitHub Actions runs these checks on pushes to `main` and pull requests.

## Content and hosting

- Edit résumé content in `index.html`, styling in `src/style.css`, and preference controls in `src/main.js`.
- Replace `public/Jigar_Bhinde_Resume_2026.pdf` when the original résumé changes.
- Deploy `dist/` to a static host. For hosts with build settings, use `npm run build` as the build command and `dist` as the publish directory.
- GitHub Pages requires enabling Pages in repository settings and deploying the built `dist/` directory through a Pages workflow or publishing branch. This repository's CI validates the website; it does not publish it.
- Use the existing checkout in cloud tasks. Each task is already isolated; a separate Git worktree is unnecessary unless explicitly requested.

No contact form service is required: email and phone links open the visitor's mail and phone applications.
