(function (isProd) {
  const maps = {
    dev: 'assets/importmap/index.dev.importmap',
    prod: 'assets/importmap/index.prod.importmap',
  };
  const xhr = new XMLHttpRequest();
  xhr.open('GET', isProd ? maps.prod : maps.dev, false);
  let content = '';
  try {
    xhr.send();
    if (xhr.status >= 400) throw xhr;
    content = (xhr.response);
  }
  catch (error) {
    console.error('[importmap]', 'FATAL: Failed to get import map:', error);
    return error;
  }

  const el = document.createElement('script');
  el.type = 'importmap';
  el.textContent = JSON.stringify(content);
  document.currentScript.append(el);
})(false);
