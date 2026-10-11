import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Ajv from 'ajv';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const contentPath = resolve(projectRoot, 'content/resume.json');
const schema = JSON.parse(readFileSync(resolve(projectRoot, 'content/resume.schema.json'), 'utf8'));
const validateSchema = new Ajv({ allErrors: true }).compile(schema);

export function validateResume(data, { checkAssets = true } = {}) {
  if (!validateSchema(data)) {
    throw new Error(`Invalid content/resume.json:\n${validateSchema.errors.map(error => `  ${error.instancePath || '/'}: ${error.message}`).join('\n')}`);
  }
  const references = [
    ...data.experience.flatMap(job => [job.company, ...(job.clients || []).map(client => client.company)]),
    ...data.education.map(entry => entry.institution),
  ];
  for (const id of references) {
    if (!Object.hasOwn(data.organizations, id)) throw new Error(`Unknown organization "${id}" in content/resume.json. Add it to organizations.`);
  }
  const assets = [data.profile.pdf, ...Object.values(data.organizations).map(organization => organization.logo).filter(Boolean)];
  for (const asset of assets) {
    if (asset.split('/').includes('..')) throw new Error(`Asset paths must stay inside public/: ${asset}`);
    if (checkAssets && !existsSync(resolve(projectRoot, 'public', asset))) throw new Error(`Missing static asset: public/${asset}`);
  }
  return data;
}

export function loadResume() {
  let data;
  try { data = JSON.parse(readFileSync(contentPath, 'utf8')); }
  catch (error) { throw new Error(`Could not read content/resume.json: ${error.message}`); }
  return validateResume(data);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function safeWebUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`Only HTTP(S) links are supported: ${value}`);
  return escapeHtml(url.href);
}

// A small, deliberately limited inline format. Raw HTML is always escaped.
// Supported: **bold text** and [link text](https://example.com).
export function inlineText(value) {
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let output = '';
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    output += escapeHtml(value.slice(offset, match.index));
    output += match[1] !== undefined
      ? `<strong>${escapeHtml(match[1])}</strong>`
      : `<a href="${safeWebUrl(match[3])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[2])}</a>`;
    offset = match.index + match[0].length;
  }
  return output + escapeHtml(value.slice(offset));
}

const icon = (name, className = 'icon') => `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}" /></svg>`;

function organizationLink(organization) {
  const logo = organization.logo
    ? `<span class="company-logo-frame"><img class="company-logo" src="./${escapeHtml(organization.logo)}" alt="" width="30" height="30" loading="lazy" decoding="async" /></span>`
    : '';
  return `<a class="organization" href="${safeWebUrl(organization.url)}" target="_blank" rel="noopener noreferrer">${logo}<span>${escapeHtml(organization.name)}</span>${icon('external', 'external-icon')}</a>`;
}

const entryMeta = entry => `<div class="entry-meta"><p>${escapeHtml(entry.period)}</p><p class="entry-location">${icon('pin')}${escapeHtml(entry.location)}</p></div>`;
const achievements = items => items?.length ? `<ul class="achievements">${items.map(item => `<li>${inlineText(item)}</li>`).join('')}</ul>` : '';
const sectionHeading = (id, section) => `<div class="section-heading"><h2 id="${id}-heading">${escapeHtml(section.title)}</h2><span class="section-rule"></span>${section.detail ? `<span class="section-detail">${escapeHtml(section.detail)}</span>` : ''}</div>`;
const section = (id, settings, content) => `<section id="${id}" class="resume-section" aria-labelledby="${id}-heading">${sectionHeading(id, settings)}${content}</section>`;

export function renderMain(data) {
  const p = data.profile;
  const name = escapeHtml(p.name);
  const intro = `<section class="intro" aria-labelledby="name">
    <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(p.eyebrow)}</p>
    <h1 id="name">${name}<span class="name-dot">.</span></h1>
    <p class="headline">${escapeHtml(p.headline)}</p>
    <div class="intro-details">
      <p class="location">${icon('pin')}${escapeHtml(p.location)}</p>
      <div class="contact-links" aria-label="Contact ${name}">
        <a href="mailto:${escapeHtml(p.email)}" aria-label="Email ${name}" title="${escapeHtml(p.email)}">${icon('mail')}<span>Email</span></a>
        <a href="tel:${escapeHtml(p.phoneLink)}" aria-label="Call ${name} at ${escapeHtml(p.phone)}" title="${escapeHtml(p.phone)}">${icon('phone')}<span>Phone</span></a>
        <a href="${safeWebUrl(p.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${name} on LinkedIn (opens in a new tab)">${icon('linkedin')}<span>LinkedIn</span></a>
      </div>
    </div>
    <p class="summary">${inlineText(p.summary)}</p>
    <div class="intro-note">${p.highlights.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
  </section>`;

  const experience = data.experience.map(job => `<article class="job">
    <header class="entry-header"><div><div class="role-line"><h3>${escapeHtml(job.role)}</h3>${job.current ? `<span class="current-badge">${escapeHtml(data.labels.current)}</span>` : ''}</div>${organizationLink(data.organizations[job.company])}</div>${entryMeta(job)}</header>
    ${achievements(job.highlights)}
    ${(job.clients || []).map(client => `<div class="client-group"><h4>${organizationLink(data.organizations[client.company])}<span class="client-industry">${escapeHtml(client.industry)}</span></h4>${achievements(client.highlights)}</div>`).join('')}
  </article>`).join('');

  const skills = data.skills.map(row => `<div class="skill-row"><h3>${escapeHtml(row.category)}</h3><ul class="skill-tags">${row.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('');
  const education = data.education.map(entry => `<article class="education-entry entry-header"><div><h3>${escapeHtml(entry.degree)}</h3>${organizationLink(data.organizations[entry.institution])}</div>${entryMeta(entry)}</article>`).join('');
  const community = `<ul class="community-list">${data.community.map(item => `<li><span class="community-symbol" aria-hidden="true">${icon(item.icon)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${inlineText(item.text)}</p></div></li>`).join('')}</ul>`;
  const footer = `<footer class="footer"><div><p class="footer-name">${escapeHtml(data.labels.footer)}</p><a class="footer-email" href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}${icon('arrow')}</a><a class="footer-phone" href="tel:${escapeHtml(p.phoneLink)}">${escapeHtml(p.phone)}</a></div><a class="back-to-top" href="#top">${escapeHtml(data.labels.backToTop)}${icon('up')}</a></footer>`;

  return intro + section('experience', data.sections.experience, experience) + section('skills', data.sections.skills, skills) + section('education', data.sections.education, education) + section('community', data.sections.community, community) + footer;
}

export function renderPage(template, data) {
  const replacements = {
    '__RESUME_TITLE__': escapeHtml(data.profile.title),
    '__RESUME_DESCRIPTION__': escapeHtml(data.profile.description),
    '__RESUME_BRAND__': `<a class="brand" href="#top" aria-label="${escapeHtml(data.profile.name)}, back to top"><span class="monogram">${escapeHtml(data.profile.initials)}<span class="brand-dot">.</span></span><span class="brand-divider"></span><span class="brand-label">${escapeHtml(data.labels.resume)}</span></a>`,
    '__RESUME_NAVIGATION__': ['experience', 'skills', 'education'].map(id => `<a href="#${id}">${escapeHtml(data.sections[id].title)}</a>`).join(''),
    '__RESUME_PDF__': `./${escapeHtml(data.profile.pdf)}`,
    '__RESUME_MAIN__': renderMain(data),
  };
  for (const [token, value] of Object.entries(replacements)) template = template.replaceAll(token, () => value);
  return template;
}
