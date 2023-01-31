console.log('[main] waiting');
await new Promise(resolve => setTimeout(resolve, 1));

// console.log('[main] register sw');
// navigator.serviceWorker.register('./sw.js');

console.log('[main] starting worker');

const worker = new SharedWorker('./w.js', { type: 'module' });
globalThis.sw = worker;

console.log('[main] started worker');

worker.port.onmessage = function (ev) {
    console.log('[main] Message received: ', ev.data);
}

console.log('[main] connect worker');


test.onclick = function () {
    worker.port.postMessage('TEST MESSAGE ' + Math.random());
}


window.onbeforeunload = function () {
    worker.port.postMessage('disconnect');
}

