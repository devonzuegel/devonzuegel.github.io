const API = 'https://cards-api.devonzuegel.com';
const $ = id => document.getElementById(id);
let csrf = '', pushKey = null, demo = false, queue = [], cursor = null, reviewed = 0, total = 0, busy = false, revealed = false;
let registration;
const samples = [
  { id:'sample-1', prompt:'What makes spaced repetition work?', answer:'Practice retrieving an idea just as it starts to fade. Each successful recall strengthens the memory, so the next review can be further away.', tags:['Learning'], next:{ again:10/1440, hard:1, good:3, easy:4 } },
  { id:'sample-2', prompt:'What is the difference between recognition and recall?', answer:'Recognition is noticing that something looks familiar. Recall is bringing it to mind without seeing the answer first.\n\nPause and try to retrieve the answer before revealing it.', tags:['Memory'], next:{ again:10/1440, hard:1, good:1, easy:4 } },
  { id:'sample-3', prompt:'What is one small habit you want to remember tomorrow?', answer:'Choose something small enough to do even on a busy day. A few deliberate minutes, repeated often, can go a long way.', tags:['Practice'], next:{ again:10/1440, hard:1, good:1, easy:4 } },
];
function notice(message = '') { $('notice').textContent = message; }
function show(section) { for (const id of ['welcome','review','complete']) $(id).hidden = id !== section; }
function intervalLabel(days) { return days < 1 ? `${Math.round(days*1440)} min` : `${days} ${days === 1 ? 'day' : 'days'}`; }
function pending() { try { return JSON.parse(localStorage.getItem('cards-pending-review') || 'null'); } catch { return null; } }
function rememberReview(value) { localStorage.setItem('cards-pending-review', JSON.stringify(value)); }
function clearPending() { localStorage.removeItem('cards-pending-review'); }
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
  $('complete-copy').textContent = `${reviewed ? `You reviewed ${reviewed} ${reviewed === 1 ? 'card' : 'cards'}${demo ? ' in this sample' : ''}. ` : ''}${early ? 'Your progress is saved. Come back whenever you’re ready.' : 'Come back later for your next review.'}`;
  if (demo) $('complete-copy').textContent = `You tried ${reviewed} sample ${reviewed === 1 ? 'card' : 'cards'}. Sign in to review your own Notion library.`;
}
async function recoverReview() {
  const operations = await api('/api/pending');
  const local = pending();
  if (local && !operations.some(p=>p.id===local.id)) operations.unshift(local);
  if (!operations.length) return;
  notice('Checking your last review with Notion…');
  for (const p of operations) {
    try { await api('/api/review', { method:'POST', body:JSON.stringify(p) }); if (local?.id === p.id) clearPending(); }
    catch (error) { if (error.status === 409 || error.status === 404) { if (local?.id === p.id) clearPending(); } else throw error; }
  }
}
async function loadQueue() {
  if (busy) return;
  setBusy(true); notice('');
  try {
    if (demo) { queue = structuredClone(samples); cursor = null; }
    else { await recoverReview(); const data = await api('/api/cards'); queue = data.cards; cursor = data.cursor; }
    reviewed = 0; total = queue.length; notice(''); drawCard();
  } catch (error) { notice(error.message || 'Cannot reach your cards. Please try again.'); }
  finally { setBusy(false); }
}
async function rate(rating) {
  if (busy || !revealed || !queue.length || !queue[0].answer) return;
  setBusy(true); notice('');
  const current = queue[0];
  try {
    if (!demo) {
      // Persist the operation identity, never card text, before starting the write.
      const saved = pending();
      const operation = saved || { id:crypto.randomUUID(), cardId:current.id, version:current.version, rating };
      if (operation.cardId !== current.id) throw new Error('A previous review needs to be checked. Refresh the queue to recover it.');
      rememberReview(operation);
      await api('/api/review', { method:'POST', body:JSON.stringify(operation) });
      clearPending();
    }
    queue.shift(); reviewed++;
    if (!queue.length && cursor && !demo) {
      const data = await api(`/api/cards?cursor=${encodeURIComponent(cursor)}`);
      queue = data.cards; cursor = data.cursor; total += queue.length;
    }
    drawCard(true);
  } catch (error) {
    if (error.status === 409 || error.status === 404) clearPending();
    notice(`${error.message || 'Could not confirm the save.'} ${error.status === 409 ? 'Refresh the queue to continue.' : 'Retry to confirm your original rating, or refresh to recover the review.'}`);
  } finally { setBusy(false); }
}
async function start() {
  $('date-label').textContent = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric' }).format(new Date()).toUpperCase();
  $('sign-in').href = `${API}/auth/login`;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/remember/sw.js', { scope:'/remember/' }).then(r=>{ registration = r; }).catch(()=>{});
  show('welcome');
  try {
    const session = await api('/api/session'); csrf = session.csrf; pushKey = session.pushKey;
    $('private-actions').hidden = false;
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
$('try-demo').onclick = () => { demo = true; $('demo-banner').hidden = false; $('private-actions').hidden = true; loadQueue(); };
$('exit-demo').onclick = () => location.reload();
$('reveal').onclick = reveal;
for (const button of document.querySelectorAll('[data-rating]')) button.onclick = () => rate(button.dataset.rating);
$('refresh').onclick = loadQueue; $('check-again').onclick = loadQueue;
$('end').onclick = () => { if (!busy) finish(true); };
$('sign-out').onclick = async () => {
  try { await api('/auth/logout', { method:'POST', body:'{}' }); queue=[]; $('prompt').textContent=''; $('answer').textContent=''; location.reload(); }
  catch (error) { notice(error.message); }
};
document.addEventListener('keydown', event => {
  if ($('settings').open || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName) || $('review').hidden) return;
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
