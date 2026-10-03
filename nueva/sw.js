// Guayoyo (nueva) — guarda la app en el teléfono para que abra sin internet.
// Los datos los maneja Firebase con su propia copia sin conexión.
const CACHE='guayoyo-nueva-v2';
const BASE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url);
  // Librerías de Firebase y fuentes: primero la copia guardada.
  if(u.hostname==='www.gstatic.com'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(ca=>ca.put(r,cp));return res})));return;
  }
  if(u.origin!==self.location.origin)return;
  // La app: primero internet (para ver actualizaciones), si no hay, la copia.
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(c=>c||caches.match('./index.html'))));
});
