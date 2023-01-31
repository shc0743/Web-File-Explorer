(function () {
    let deferredPrompt;
    const el = document.createElement('div');
    el.setAttribute('style', `
    position: fixed;
    right: 10px;
    top: 10px;
    background: var(--background, #ffffff);
    color: var(--text-color, #000000);
    border: 1px solid;
    padding: 5px;
    border-radius: 5px;
    z-index: 30001;
    `);
    el.innerHTML = `
    <button data-type=close style="position:absolute;right:0;top:0;border:0;background:transparent;" aria-label=Close>x</button>
    <div><b>ProTip!</b></div>
    <p>Now you can install the application and use it offline.</p>
    <div><button data-type=install>Install</button></div>
    `;
    el.hidden = true;
    document.currentScript.after(el);

    window.addEventListener('beforeinstallprompt', function (ev) {
        ev.preventDefault();
        deferredPrompt = ev;
        el.hidden = false;
    });

    el.querySelector('button[data-type=install]').onclick = function (ev) {
        el.remove();
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
                
            }
            deferredPrompt = null;
        });
    };

    el.querySelector('button[data-type=close]').onclick = function () {
        el.remove();
    };
    
})();
