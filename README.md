# Jigar Bhinde — web résumé

A responsive, accessible résumé for Jigar Bhinde, inspired by the restrained layout of ketulchhaya.com/web-resume. Content and contact links come from the supplied 2026 résumé. The original PDF is included for download.

## Develop

Requires Node.js 20.19+ or 22.12+ (Node 24 is used in CI).

```sh
npm ci
npm run dev
```

The site uses plain HTML, CSS, and JavaScript, served and built with Vite. Résumé content is rendered from JSON into HTML during development and production builds. It has no backend, external fonts, analytics, API keys, or required environment variables. Theme and text-size preferences stay in the visitor's browser. All résumé content and links remain accessible without JavaScript. Logos are served from local files.

## Update your résumé

Edit **[content/resume.json](content/resume.json)**. This is the single source for the page's profile, contact details, company names and links, work experience, skills, education, and volunteering. You can edit it directly on GitHub using the pencil button, then commit the change to `main`.

The main sections are:

| Field | What to change |
| --- | --- |
| `profile` | Your name, title, summary, location, contact links, and PDF filename |
| `organizations` | Company/institution names, website links, and optional logo filenames |
| `experience` | Roles, dates, locations, achievements, and client work |
| `skills` | Skill categories and their lists |
| `education` | Degrees, institutions, dates, and locations |
| `community` | Volunteering and activities |
| `sections`, `labels` | Section headings, date captions, and page labels |

Each role's `company` and each education entry's `institution` reference an ID in `organizations`. For example, `"company": "morgan-stanley"` uses the name, website, and logo from `organizations["morgan-stanley"]`. Keep IDs stable when changing a displayed company name. To add a company, add a new entry to `organizations` and reference its ID in a role or client entry.

```json
{
  "name": "Morgan Stanley",
  "url": "https://www.morganstanley.com/",
  "logo": "logos/morgan-stanley.avif"
}
```

Logo paths are relative to `public/`. Add an SVG, PNG, JPEG, WebP, or AVIF to `public/logos/`, then set the company's `logo` to the matching `logos/your-file.ext` path. Every employer and client logo uses the same padded 80 × 48 frame with rounded corners and centered `object-fit: contain`. Images keep their original proportions and remain fully visible without cropping. A logo is optional; omitting the field keeps the company name and website link. Asset provenance is recorded in [public/logos/SOURCES.md](public/logos/SOURCES.md).

Summary, achievement, and community text support `**bold text**` and `[link text](https://example.com)`. Other text is displayed literally. Dates are editable display strings, and array order determines the order on the page. Use double quotes and avoid trailing commas; JSON does not support comments.

```sh
npm run validate:content
npm run dev
```

The development page reloads when you save the JSON. The included JSON schema supplies editor hints; both development and production builds validate required fields, organization references, and local asset existence before generating the page.

Changing the JSON updates the web résumé. Replace `public/Jigar_Bhinde_Resume_2026.pdf` separately when updating the downloadable original PDF.

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

Tests run against a production build on desktop and mobile. They cover JSON-driven content, local logo downloads and company links, the actual PDF download, theme and text-size persistence, WCAG accessibility checks, keyboard navigation, narrow-screen overflow, JavaScript-free content, and print layout. Additional tests verify content editing, malformed-data rejection, HTML escaping, and deployment preserving staged source changes. GitHub Actions runs these checks on pushes to `main` and pull requests.

## Content and hosting

- Edit résumé content in `content/resume.json`, styling in `src/style.css`, and preference controls in `src/main.js`. `index.html` is the page shell; `scripts/resume.js` renders the JSON.
- Replace `public/Jigar_Bhinde_Resume_2026.pdf` when the original résumé changes.
- Deploy `dist/` to a static host. For hosts with build settings, use `npm run build` as the build command and `dist` as the publish directory.
- GitHub Pages uses the `gh-pages` branch and `/ (root)` as its publishing source. The CI workflow tests changes on `main`, publishes a build to `gh-pages`, and explicitly requests a Pages build. Updates appear after GitHub's workflow and Pages deployment complete. If repository policy denies workflow write permissions, the workflow reports the failure; enable the required permissions in repository Actions settings or use the manual command below.
- Use the existing checkout in cloud tasks. Each task is already isolated; a separate Git worktree is unnecessary unless explicitly requested.

No contact form service is required: email and phone links open the visitor's mail and phone applications.

To refresh the preview manually from a checkout with Git push access:

```sh
npm run deploy:preview
```

This builds the site and updates `gh-pages` without changing your current source branch or staging area. It preserves preview history and uses a normal, non-forced push. Your existing `gh-pages` publishing source lets a normal authenticated push trigger GitHub's Pages deployment.
