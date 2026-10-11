import { defineConfig } from 'vite';
import { contentPath, loadResume, renderPage } from './scripts/resume.js';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'resume-content',
    transformIndexHtml: {
      order: 'pre',
      handler: html => renderPage(html, loadResume()),
    },
    configureServer(server) {
      server.watcher.add(contentPath);
      server.watcher.on('change', path => {
        if (path === contentPath) server.ws.send({ type: 'full-reload' });
      });
    },
  }],
});
