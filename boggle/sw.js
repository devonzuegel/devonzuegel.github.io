/* Boggle Trainer service worker — v5
   - Precaches app shell for full offline use
   - Queues failed POST /api/boggle calls in IndexedDB, retries on next fetch or sync event
*/
const CACHE = "boggle-trainer-20260804191523";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.svg", "./icon-512.svg"];
const API_HOST = "boggle-api.vercel.app";
const QUEUE_DB = "boggle-sync-queue";
const QUEUE_STORE = "posts";

/* ---- IndexedDB queue helpers ---- */
function openQueue() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function enqueue(url, body) {
  return openQueue().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).add({ url: url, body: body, ts: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function dequeueAll() {
  return openQueue().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(QUEUE_STORE, "readwrite");
      var store = tx.objectStore(QUEUE_STORE);
      var items = [];
      store.openCursor().onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) { items.push(cursor.value); cursor.delete(); cursor.continue(); }
        else resolve(items);
      };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function flushQueue() {
  return dequeueAll().then(function(items) {
    return Promise.all(items.map(function(item) {
      return fetch(item.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: item.body
      }).then(function(r) {
        if (!r.ok) throw new Error(r.status);
        /* notify all clients that queued data was flushed */
        return self.clients.matchAll().then(function(clients) {
          clients.forEach(function(c) { c.postMessage({ type: "SYNC_FLUSHED" }); });
        });
      }).catch(function() {
        /* re-enqueue if still failing */
        return enqueue(item.url, item.body);
      });
    }));
  });
}

/* ---- install / activate ---- */
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(SHELL); }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

/* ---- fetch ---- */
self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);

  /* POST to our API — try network, queue on failure */
  if (e.request.method === "POST" && url.host === API_HOST) {
    e.respondWith(
      e.request.clone().text().then(function(body) {
        return fetch(e.request).catch(function() {
          /* offline — queue it and return a fake ok so the app doesn't show an error */
          return enqueue(e.request.url, body).then(function() {
            /* tell clients there's unsynced data */
            self.clients.matchAll().then(function(clients) {
              clients.forEach(function(c) { c.postMessage({ type: "SYNC_QUEUED" }); });
            });
            return new Response(JSON.stringify({ ok: true, queued: true }), {
              headers: { "Content-Type": "application/json" }
            });
          });
        });
      })
    );
    return;
  }

  /* GET requests — cache-first for same-origin, network-only for cross-origin */
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) {
    /* for cross-origin GETs (dict API, nominatim) just try network, no caching */
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function(hit) {
      if (hit) return hit;
      return fetch(e.request).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, copy); }).catch(function() {});
        return res;
      }).catch(function() {
        return caches.match("./index.html");
      });
    })
  );
});

/* ---- background sync (Android Chrome) ---- */
self.addEventListener("sync", function(e) {
  if (e.tag === "boggle-sync") {
    e.waitUntil(flushQueue());
  }
});

/* ---- messages from page ---- */
self.addEventListener("message", function(e) {
  if (e.data && e.data.type === "FLUSH_QUEUE") {
    flushQueue();
  } else if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
