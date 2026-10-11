import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadResume, validateResume, renderPage, inlineText } from './resume.js';

test('editing JSON updates profile, role, organization links, skills, education, and community in generated HTML', () => {
  const data = structuredClone(loadResume());
  data.profile.name = 'Updated Name';
  data.profile.email = 'updated@example.com';
  data.profile.headline = 'An edited headline';
  data.experience[0].role = 'Updated role';
  data.organizations['morgan-stanley'].name = 'Updated company';
  data.organizations['morgan-stanley'].url = 'https://example.com/company';
  data.skills[0].items.push('A new skill');
  data.education[0].degree = 'An edited degree';
  data.community[0].text = 'A new volunteering detail';
  validateResume(data);
  const html = renderPage(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), data);
  for (const value of ['Updated Name', 'updated@example.com', 'An edited headline', 'Updated role', 'Updated company', 'https://example.com/company', 'A new skill', 'An edited degree', 'A new volunteering detail']) {
    assert.ok(html.includes(value), `Generated page should include ${value}`);
  }
  assert.ok(!html.includes('__RESUME_'), 'All content placeholders should be replaced');
});

test('supports adding and removing roles and does not require a logo for a new company', () => {
  const data = structuredClone(loadResume());
  data.organizations['new-company'] = { name: 'New Company', url: 'https://example.com/' };
  data.experience = [{ company: 'new-company', role: 'New Role', period: '2026 – Present', location: 'Remote', current: true, highlights: ['A **new result**.'] }];
  validateResume(data);
  const html = renderPage('__RESUME_MAIN__', data);
  assert.equal((html.match(/class="job"/g) || []).length, 1);
  assert.ok(html.includes('New Company'));
  assert.ok(html.includes('<strong>new result</strong>'));
});

test('rejects missing content, unknown organization references, and broken asset paths', () => {
  const data = structuredClone(loadResume());
  const missing = structuredClone(data);
  delete missing.profile.name;
  assert.throws(() => validateResume(missing), /name/);
  const unknown = structuredClone(data);
  unknown.experience[0].company = 'missing-company';
  assert.throws(() => validateResume(unknown), /Unknown organization/);
  const broken = structuredClone(data);
  broken.profile.pdf = 'does-not-exist.pdf';
  assert.throws(() => validateResume(broken), /Missing static asset/);
  const traversal = structuredClone(data);
  traversal.profile.pdf = 'pdfs/../../private.pdf';
  assert.throws(() => validateResume(traversal), /Asset paths/);
});

test('escapes arbitrary content while supporting bold text and safe inline links', () => {
  assert.equal(inlineText('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(inlineText('Saved **30+ hours**.'), 'Saved <strong>30+ hours</strong>.');
  assert.ok(inlineText('[BARCS](https://www.barcs.org/)').includes('rel="noopener noreferrer"'));
  assert.ok(!inlineText('[bad](javascript:alert(1))').includes('<a '));
  const data = structuredClone(loadResume());
  data.profile.name = '<img src=x onerror=alert(1)>';
  const html = renderPage('__RESUME_MAIN__', data);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
});
