function showStartupError() {
  const loading = document.querySelector('.initial-loading');
  if (!loading) return;
  loading.classList.add('loading-failed');
  document.querySelector('#startup-status').textContent = 'Concert Tracker couldn’t start. Please retry.';
  document.querySelector('#startup-retry').hidden = false;
}
const timeout = setTimeout(showStartupError, 20000);
try {
  const list = new URLSearchParams(location.search).get('list');
  if (list !== null) {
    const { renderSharedList } = await import('./share-lists.js?v=20261002-startup');
    await renderSharedList(list);
  } else {
    await import('../app.js?v=20261002-saved');
  }
} catch (error) {
  console.error('Concert Tracker startup failed:', error);
  showStartupError();
} finally {
  clearTimeout(timeout);
}
