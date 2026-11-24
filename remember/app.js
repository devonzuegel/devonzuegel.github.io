const API = 'https://cards-api.devonzuegel.com';
const $ = id => document.getElementById(id);
let csrf = '', pushKey = null, demo = false, queue = [], cursor = null, reviewed = 0, total = 0, busy = false, revealed = false;
let registration;
let syncPromise, prefetchedPage;
let progressData, progressRequest = 0, historyDays = 30;
const pendingPrefix = 'cards-review:';
const legacyPendingKey = 'cards-pending-review';
const samples = [
  { id:'sample-1', prompt:'What makes spaced repetition work?', answer:'Practice retrieving an idea just as it starts to fade. Each successful recall strengthens the memory, so the next review can be further away.', tags:['Learning'], next:{ again:10/1440, hard:1, good:3, easy:4 } },
  { id:'sample-2', prompt:'What is the difference between recognition and recall?', answer:'Recognition is noticing that something looks familiar. Recall is bringing it to mind without seeing the answer first.\n\nPause and try to retrieve the answer before revealing it.', tags:['Memory'], next:{ again:10/1440, hard:1, good:1, easy:4 } },
  { id:'sample-3', prompt:'What is one small habit you want to remember tomorrow?', answer:'Choose something small enough to do even on a busy day. A few deliberate minutes, repeated often, can go a long way.', tags:['Practice'], next:{ again:10/1440, hard:1, good:1, easy:4 } },
];
function notice(message = '') { $('notice').textContent = message; }
function show(section) { for (const id of ['welcome','review','complete']) $(id).hidden = id !== section; }
function intervalLabel(days) { return days < 1 ? `${Math.round(days*1440)} min` : `${days} ${days === 1 ? 'day' : 'days'}`; }
function pendingReviews() {
  const reviews = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(pendingPrefix)) continue;
    const review = JSON.parse(localStorage.getItem(key));
    if (review) reviews.push(review);
  }
  reviews.sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
  const legacy = JSON.parse(localStorage.getItem(legacyPendingKey) || 'null');
  if (legacy && !reviews.some(review => review.id === legacy.id)) reviews.unshift(legacy);
  return reviews;
}
function queueReview(review) {
  localStorage.setItem(pendingPrefix + review.id, JSON.stringify(review));
}
function removeReview(id) {
  localStorage.removeItem(pendingPrefix + id);
  if (JSON.parse(localStorage.getItem(legacyPendingKey) || 'null')?.id === id) {
    localStorage.removeItem(legacyPendingKey);
  }
}
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { credentials:'include', ...options, headers:{ ...(options.body ? { 'Content-Type':'application/json', 'X-CSRF-Token':csrf } : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Could not complete that request.');
    error.status = response.status;
    if (response.status === 401) {
      const hadSession = Boolean(csrf);
      csrf = '';
      if (path === '/api/session') $('sign-in').hidden = data.signInReady !== true;
      if (hadSession) {
        $('sign-in').hidden = false;
        $('sign-in').textContent = 'Sign in again →';
      }
      if (!demo) show('welcome');
      $('private-actions').hidden = true;
      $('progress-open').hidden = true;
      showProgress(false);
    }
    throw error;
  }
  return data;
}
function setBusy(value) {
  busy = value;
  for (const el of document.querySelectorAll('#review button')) el.disabled = value;
}
function drawCard(focus = false) {
  if (!queue.length) return finish();
  const c = queue[0]; revealed = false;
  $('prompt').textContent = c.prompt;
  $('answer').textContent = c.answer || 'No answer yet. Add one in Notion before reviewing this card.';
  $('card-tags').textContent = (c.tags || []).join(' · ');
  $('due-label').textContent = demo ? 'Sample card' : c.due ? 'Ready to revisit' : 'New to your practice';
  $('notion-link').hidden = !c.url;
  if (c.url) $('notion-link').href = c.url;
  $('answer-area').hidden = true; $('rating-area').hidden = true; $('reveal-area').hidden = false;
  $('rating-hint').textContent = demo ? '1–4 to rate · Sample reviews aren’t saved.' : '1–4 to rate · Your review is saved to Notion.';
  $('queue-label').textContent = `${queue.length}${cursor ? '+' : ''} ready to review`;
  $('progress-label').textContent = `${reviewed} reviewed`;
  $('progress').max = Math.max(1,total); $('progress').value = reviewed;
  for (const button of document.querySelectorAll('[data-rating]')) button.querySelector('small').textContent = intervalLabel(c.next[button.dataset.rating]);
  show('review');
  if (focus) { $('prompt').focus({ preventScroll:true }); $('review').scrollIntoView({ block:'start' }); }
  if (!demo && cursor && queue.length <= 8 && !prefetchedPage) {
    prefetchedPage = fetchPage(cursor).catch(() => null);
  }
}
function reveal() {
  if (busy || !queue.length) return;
  revealed = true;
  $('answer-area').hidden = false; $('reveal-area').hidden = true;
  $('rating-area').hidden = !queue[0].answer;
  if (queue[0].answer) document.querySelector('[data-rating="good"]').focus({ preventScroll:true });
}
function finish(early = false) {
  show('complete');
  $('complete-title').textContent = early ? 'A good place to pause.' : 'You’re all caught up.';
  $('complete-copy').textContent = `${reviewed ? `You reviewed ${reviewed} ${reviewed === 1 ? 'card' : 'cards'}. ` : ''}${early ? 'Come back whenever you’re ready.' : 'Come back later for your next review.'}`;
  if (demo) $('complete-copy').textContent = `You tried ${reviewed} sample ${reviewed === 1 ? 'card' : 'cards'}. Sign in to review your own Notion library.`;
}
function syncReviews() {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    $('retry-save').hidden = true;
    let conflicts = 0;
    let operation;
    while ((operation = pendingReviews()[0])) {
      $('save-status').textContent = 'Saving reviews to Notion…';
      try {
        await api('/api/review', { method:'POST', body:JSON.stringify(operation) });
      } catch (error) {
        if (error.status !== 404 && error.status !== 409) throw error;
        conflicts++;
        notice('A card changed in Notion or another review is pending. Refresh the queue to check what still needs review.');
      }
      removeReview(operation.id);
    }
    $('save-status').textContent = conflicts ? 'Some reviews could not be saved.' : 'Reviews saved to Notion.';
    return true;
  })().catch(() => {
    $('save-status').textContent = 'Reviews are queued on this device. Retry to finish saving.';
    $('retry-save').hidden = !csrf;
    return false;
  }).finally(() => {
    syncPromise = null;
    if (!$('progress-view').hidden && csrf) void loadProgress();
  });
  return syncPromise;
}
const fetchPage = (after) => api(after ? `/api/cards?cursor=${encodeURIComponent(after)}` : '/api/cards');
async function loadQueue() {
  if (busy) return;
  setBusy(true); notice('');
  try {
    prefetchedPage = null;
    if (demo) { queue = structuredClone(samples); cursor = null; }
    else {
      if (syncPromise && !await syncPromise) return;
      // Overlap the first queue request with the check for interrupted saves.
      const [serverPending, firstPage] = await Promise.all([api('/api/pending'), fetchPage()]);
      let page = firstPage;
      const localIds = new Set(pendingReviews().map(review => review.id));
      if (localIds.size || serverPending.length) {
        for (const review of serverPending) {
          if (!localIds.has(review.id)) queueReview(review);
        }
        if (!await syncReviews()) return;
        page = await fetchPage();
      }
      queue = page.cards;
      cursor = page.cursor;
    }
    reviewed = 0; total = queue.length; drawCard();
  } catch (error) { notice(error.message || 'Cannot reach your cards. Please try again.'); }
  finally { setBusy(false); }
}
async function rate(rating) {
  if (busy || !revealed || !queue.length || !queue[0].answer) return;
  setBusy(true); notice('');
  const current = queue[0];
  let advanced = false;
  try {
    if (!demo) {
      // Persist the operation identity, never card text, before starting the write.
      const pending = pendingReviews();
      if (!pending.some(review => review.cardId === current.id)) {
        queueReview({ id:crypto.randomUUID(), cardId:current.id, version:current.version, rating, queuedAt:Date.now() });
      }
      void syncReviews();
    }
    queue.shift(); reviewed++; advanced = true;
    if (!queue.length && cursor && !demo) {
      const cached = prefetchedPage;
      prefetchedPage = null;
      const data = await cached || await fetchPage(cursor);
      if (!csrf) return;
      queue = data.cards; cursor = data.cursor; total += queue.length;
    }
    drawCard(true);
  } catch (error) {
    if (advanced && error.status !== 401) finish(true);
    notice(advanced ? 'Could not load the next cards. Check for due cards to retry.' : 'Could not queue your rating on this device. Please try again.');
  } finally { setBusy(false); }
}
async function start() {
  $('date-label').textContent = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric' }).format(new Date()).toUpperCase();
  $('sign-in').href = `${API}/auth/login`;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/remember/sw.js', { scope:'/remember/' }).then(r=>{ registration = r; }).catch(()=>{});
  show('welcome');
  try {
    const session = await api('/api/session'); csrf = session.csrf; pushKey = session.pushKey;
    if (demo) return;
    $('private-actions').hidden = false;
    $('progress-open').hidden = false;
    if (!session.notionReady) { notice('Your sign-in works. The Notion connection still needs to be configured.'); return; }
    await loadQueue();
  } catch (error) {
    if (error.status === 401 && $('sign-in').hidden) {
      $('connection-note').textContent = 'GitHub sign-in still needs to be set up. You can try a sample session now.';
    } else if (error.status !== 401) {
      $('connection-note').textContent = 'The card service couldn’t be reached. You can try a sample session now.';
    }
  }
}
$('try-demo').onclick = () => { demo = true; $('demo-banner').hidden = false; $('private-actions').hidden = true; $('progress-open').hidden = true; loadQueue(); };
$('exit-demo').onclick = () => location.reload();
$('retry-save').onclick = () => { void syncReviews(); };
$('reveal').onclick = reveal;
for (const button of document.querySelectorAll('[data-rating]')) button.onclick = () => rate(button.dataset.rating);
$('refresh').onclick = loadQueue; $('check-again').onclick = loadQueue;
$('end').onclick = () => { if (!busy) finish(true); };
const countFormat = new Intl.NumberFormat('en-US');
const shortDate = new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', timeZone:'UTC' });
const formatDay = date => shortDate.format(new Date(`${date}T00:00:00Z`));

function statRow(label, value) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = countFormat.format(value);
  row.append(term, description);
  return row;
}

function drawActivity() {
  if (!progressData) return;
  const days = progressData.days.slice(-historyDays);
  const max = Math.max(1, ...days.map(day => day.count));
  const bars = days.map((day, i) => {
    const bar = document.createElement('div');
    bar.className = 'activity-bar';
    bar.style.height = day.count ? `${day.count / max * 100}%` : '2px';
    bar.title = `${formatDay(day.date)} · ${countFormat.format(day.count)} ${day.count === 1 ? 'review' : 'reviews'}`;
    if (!day.count) bar.dataset.empty = '';
    if (i === days.length - 1) bar.dataset.today = '';
    return bar;
  });
  $('activity-chart').replaceChildren(...bars);
  $('activity-dates').replaceChildren(...[formatDay(days[0].date), 'Today'].map(label => {
    const span = document.createElement('span');
    span.textContent = label;
    return span;
  }));
  $('activity-counts').replaceChildren(...days.map(day => statRow(formatDay(day.date), day.count)));
}

async function loadProgress() {
  const id = ++progressRequest;
  $('progress-refresh').disabled = true;
  $('progress-notice').textContent = 'Loading review history…';
  try {
    const data = await api('/api/progress');
    if (id !== progressRequest) return;
    progressData = data;
    $('metric-today').textContent = countFormat.format(data.today);
    $('metric-week').textContent = countFormat.format(data.week);
    $('metric-streak').textContent = `${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`;
    $('metric-best').textContent = `${data.bestStreak} ${data.bestStreak === 1 ? 'day' : 'days'}`;
    const goodOrEasy = data.ratingCounts.good + data.ratingCounts.easy;
    $('rating-summary').textContent = data.month
      ? `${countFormat.format(data.month)} reviews across ${countFormat.format(data.uniqueCards)} ${data.uniqueCards === 1 ? 'unique card' : 'unique cards'}. ${Math.round(100 * goodOrEasy / data.month)}% rated Good or Easy.`
      : 'Your rating breakdown will appear after your first saved review.';
    $('rating-breakdown').replaceChildren(...Object.entries(data.ratingCounts).map(([label, count]) =>
      statRow(label[0].toUpperCase() + label.slice(1), count)));
    $('progress-footnote').textContent = `Counts include reviews saved through Remember. Streaks look back 90 days. Days follow ${data.timezone.replaceAll('_', ' ')}.`;
    $('progress-notice').textContent = data.month ? '' : 'No saved reviews in the last 30 days.';
    drawActivity();
    $('progress-data').hidden = false;
  } catch (error) {
    if (id === progressRequest) $('progress-notice').textContent = error.message || 'Could not load review history. Try refreshing.';
  } finally {
    if (id === progressRequest) $('progress-refresh').disabled = false;
  }
}

function showProgress(open) {
  $('progress-view').hidden = !open;
  $('study-view').hidden = open;
  $('progress-open').textContent = open ? 'Back to review' : 'Progress';
  $('progress-open').setAttribute('aria-expanded', String(open));
}

$('progress-open').onclick = () => {
  const open = $('progress-view').hidden;
  showProgress(open);
  if (open) {
    $('progress-title').focus();
    void loadProgress();
  }
};
$('progress-refresh').onclick = () => { void loadProgress(); };
for (const button of document.querySelectorAll('[data-history-days]')) {
  button.onclick = () => {
    historyDays = Number(button.dataset.historyDays);
    for (const option of document.querySelectorAll('[data-history-days]')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    drawActivity();
  };
}
$('sign-out').onclick = async () => {
  try { await api('/auth/logout', { method:'POST', body:'{}' }); queue=[]; $('prompt').textContent=''; $('answer').textContent=''; location.reload(); }
  catch (error) { notice(error.message); }
};
document.addEventListener('keydown', event => {
  if ($('settings').open || !$('progress-view').hidden || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName) || $('review').hidden) return;
  if (!revealed && (event.code === 'Space' || event.key === 'Enter')) { event.preventDefault(); reveal(); }
  if (revealed && /^[1-4]$/.test(event.key)) { event.preventDefault(); rate(['again','hard','good','easy'][Number(event.key)-1]); }
});
// Rating shortcuts also work while a rating button has focus; Enter remains native.
document.querySelector('.ratings').addEventListener('keydown', event => {
  if (/^[1-4]$/.test(event.key) && !event.metaKey && !event.ctrlKey) { event.preventDefault(); rate(['again','hard','good','easy'][Number(event.key)-1]); }
});
for (let h=0; h<24; h++) { const option = document.createElement('option'); option.value=h; option.textContent=`${h%12 || 12}:00 ${h < 12 ? 'a.m.' : 'p.m.'}`; $('reminder-hour').append(option); }
$('reminder-hour').value='9';
$('settings-open').onclick = async () => {
  $('settings').showModal(); $('settings-fields').disabled = true;
  $('settings-note').textContent = demo || !csrf ? 'Sign in to save reminders and enable notifications.' : 'Loading your preferences…';
  if (demo || !csrf) return;
  try {
    const s = await api('/api/settings');
    $('reminder-enabled').checked=!!s.enabled; $('reminder-hour').value=s.hour;
    if (![...$('reminder-timezone').options].some(o=>o.value === s.timezone)) { const o=document.createElement('option'); o.value=s.timezone; o.textContent=s.timezone; $('reminder-timezone').append(o); }
    $('reminder-timezone').value=s.timezone; $('settings-fields').disabled=false;
    $('settings-note').textContent = s.last?.status?.startsWith('failed') ? 'The last reminder could not be confirmed. Try a test notification.' : '9 a.m. New York time is the default. You can change it here.';
  } catch (error) { $('settings-note').textContent=error.message; }
};
$('settings-close').onclick = () => $('settings').close();
async function settingsAction(fn) {
  $('settings-fields').disabled=true;
  try { $('settings-note').textContent=await fn(); } catch (error) { $('settings-note').textContent=error.message || 'That didn’t work. Please try again.'; }
  finally { $('settings-fields').disabled=!csrf; }
}
$('settings-save').onclick = () => settingsAction(async () => {
  await api('/api/settings',{ method:'POST', body:JSON.stringify({ enabled:$('reminder-enabled').checked, hour:Number($('reminder-hour').value), timezone:$('reminder-timezone').value }) });
  return $('reminder-enabled').checked ? 'Reminder saved. Enable this device below to receive it.' : 'Daily reminders are off.';
});
function pushSupport() {
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) throw new Error('On iPhone, add Cards to your Home Screen and open it from the icon first. Requires iOS 16.4 or later.');
  if (!registration?.active) throw new Error('Notification setup is loading. Try again in a moment.');
  if (!pushKey) throw new Error('The notification service still needs to be configured.');
}
function applicationKey(value) { const binary=atob(value.replaceAll('-','+').replaceAll('_','/')); return Uint8Array.from(binary,c=>c.charCodeAt(0)); }
$('push-enable').onclick = () => settingsAction(async () => {
  pushSupport();
  // Request permission immediately in the user's tap handler, before network work.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are not allowed. You can change this in your device’s notification settings.');
  const sub = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:applicationKey(pushKey) });
  await api('/api/subscription', { method:'POST', body:JSON.stringify({ subscription:sub.toJSON() }) });
  return 'This device is enabled. Save a daily reminder above, then send a test.';
});
$('push-test').onclick = () => settingsAction(async () => {
  pushSupport(); const sub=await registration.pushManager.getSubscription();
  if (!sub) throw new Error('Enable this device first.');
  await api('/api/push-test', { method:'POST', body:JSON.stringify({ subscription:sub.toJSON() }) });
  return 'Test accepted by the push service. Check your notifications.';
});
$('push-disable').onclick = () => settingsAction(async () => {
  if (!registration) throw new Error('Notification setup is still loading.');
  const sub=await registration.pushManager.getSubscription();
  if (sub) { await api('/api/subscription', { method:'DELETE', body:JSON.stringify({ subscription:sub.toJSON() }) }); await sub.unsubscribe(); }
  return 'Notifications are off for this device.';
});
start();
