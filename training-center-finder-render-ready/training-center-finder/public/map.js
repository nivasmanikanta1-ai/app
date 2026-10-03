// Lightweight map support. No API key is required.
async function loadMapData() {
  try {
    const res = await fetch('/api/centers');
    return await res.json();
  } catch (e) {
    return [];
  }
}
window.addEventListener('DOMContentLoaded', async () => {
  const data = await loadMapData();
  const el = document.querySelector('#homeMap, #searchMap, #detailMap');
  if (!el) return;
  el.innerHTML = `<div class="map-fallback"><strong>${data.length}</strong> training centers loaded.<br>Use the search results to open a center and view its address.</div>`;
});
