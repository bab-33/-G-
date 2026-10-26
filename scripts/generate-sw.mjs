import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const root = 'dist'
async function list(dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true })
  const files = await Promise.all(entries.map(e => e.isDirectory() ? list(join(dir, e.name)) : [join(dir, e.name)]))
  return files.flat().filter(f => f !== 'sw.js')
}
const files = (await list('')).sort()
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(join(root, file)))
const version = hash.digest('hex').slice(0, 12)
const urls = ['/', ...files.map(f => '/' + f)]
await writeFile(join(root, 'sw.js'), `// Generated from this build's exact assets.
const CACHE = 'table-for-two-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('table-for-two-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => response.ok ? response : caches.match('/index.html').then(cached => cached || response)).catch(() => caches.match('/index.html')));
    return;
  }
  // Only cache the exact, public files shipped with the app. Personal data stays in localStorage.
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(event.request)));
  }
});
`)
console.log(`PWA: generated service worker ${version} with ${urls.length} precached files`)
