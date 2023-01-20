(function () {
  const currentScript = document.currentScript
  const p = location.origin + location.pathname
  fetch('./index.webmanifest')
  .then(v => v.json())
  .then(v => {
    v.start_url = p;
    for (let i of v.icons) {
      i.src = p + i.src;
    }
    const s = JSON.stringify(v, null, 2);
    const blob = new Blob([s]);
    const u = URL.createObjectURL(blob);
    const l = document.createElement('link');
    l.rel = 'manifest'; l.href = u;
    currentScript.after(l);
  })
  .catch(e => console.error('Failed to load webmanifest:', e));
})()