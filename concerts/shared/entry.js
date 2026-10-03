const list = new URLSearchParams(location.search).get("list");
if (list !== null) {
  const { renderSharedList } = await import("./share-lists.js");
  await renderSharedList(list);
} else {
  await import("../app.js?v=20261002-lists");
}
