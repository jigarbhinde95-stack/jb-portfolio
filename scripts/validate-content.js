import { loadResume } from './resume.js';

try {
  const data = loadResume();
  console.log(`Résumé content is valid: ${data.experience.length} roles, ${Object.keys(data.organizations).length} organizations.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
