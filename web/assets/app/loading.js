/* IE Fuck You */() => {};
(function (global) {
    let el_noscript = document.getElementById('el_noscript');
    el_noscript.remove();
    const el = document.createElement('div');
    el.innerHTML = `
    <div style="display: flex; align-items: center;">
        <div class="loading-spin" style="width: 15px; border-width: 5px;"></div>
        <div style="display: inline-block; width: 20px;"></div>
        <div data-content></div>
    </div>
    
    <style>
.loading-spin {
    display: inline-block;
    aspect-ratio: 1;
    border: 10px solid;
    border-color: var(--background);
    border-radius: 100%;
    border-top-color: var(--fill);
    animation: loading-animation-01 1s infinite linear;
    -webkit-animation: loading-animation-01 1s infinite linear;
    -moz-animation: loading-animation-01 1s infinite linear;
    --background: #f6f6f6;
    --fill: #606060;
}
@keyframes loading-animation-01 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}</style>`;
    const cont = el.querySelector('[data-content]');
    (document.body || document.documentElement).append(el);

    global.FinishLoad = function FinishLoad() {
        delete global.FinishLoad;
        cont.innerHTML = '';
        window.removeEventListener('error', scriptErrorHandler);
        el.remove();
    }
    global.ShowLoadProgress = function ShowLoadProgress(text, isError) {
        if (isError) {
            updateTimeout(true);
            cont.style.color = 'red';
            cont.innerText = text;
            return cont.innerHTML = '<b>[Error]</b>&nbsp;' + cont.innerHTML;
        }
        cont.style.color = '';
        cont.innerText = `Loading (${text})`;
        updateTimeout();
    }

    function scriptErrorHandler(ev) {
        ShowLoadProgress(`${ev.message} ([${ev.filename}], line#${ev.lineno} column#${ev.colno})`, true)
    }
    window.addEventListener('error', scriptErrorHandler);

    {
        let el = document.createElement('script');
        el.setAttribute('nomodule', '');
        el.setAttribute('src', 'data:text/javascript;base64,U2hvd0xvYWRQcm9ncmVzcygiRkFUQUw6IFlvdXIgYnJvd3NlciBpcyB0b28gbG93IHRvIHN1cHBvcnQgRUNNQVNjcmlwdDYgbW9kdWxlLiBQbGVhc2UgdXBncmFkZSB5b3VyIGJyb3dzZXIgdG8gY29udGludWUuIiwhMCk=');
        (document.head || document.documentElement).append(el);
    }

    const timeouts = ({
        10000: () => cont.innerHTML = '<b>[Tips]</b> Wait for moment...',
        30000: () => cont.innerHTML = '<b>[Info]</b> It takes longer than expected to open the application...',
        40000: () => cont.innerHTML = '<b>[Warning]</b> It seems like that your Internet connection is too slow to load this application or something bad happened. Considering look up the browser console?',
        50000: () => cont.innerHTML = '<b>[Warning]</b> This is unusual because the page takes too much time to load. Considering look up the browser console?',
        60000: () => cont.innerHTML = '<b>[Error]</b> This is very unusual, the page should not take so long to load. It is very likely that an error occurred, but we did not detect it. Consider look up the browser console and contact our support.',
    });
    const timeoutid = [];
    async function updateTimeout(clear = false) {
        if (timeoutid.length > 0) {
            timeoutid.forEach(t => clearTimeout(t));
            timeoutid.length = 0;
        }
        if (clear) return;
        for (const i in timeouts) timeoutid.push(setTimeout(timeouts[i], i));
    }
    (updateTimeout());

    ShowLoadProgress('preparing');


})((typeof(globalThis) === 'undefined') ? window : globalThis)