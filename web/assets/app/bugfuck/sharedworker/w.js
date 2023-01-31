// await fetch('./');
await new Promise((resolve, reject) => {
    setTimeout(resolve, 1000);
}); // (*) 出现问题，去掉这个Promise后正常，用await Promise.resolve()也正常，说明onconnect之前不能有await一个宏任务

console.log('[worker] started');

// const connectedPorts = new Set();

globalThis.onconnect = function (ev) {
    for (const port of ev.ports) {
        // connectedPorts.add(port);
        console.debug('[worker] New port has connected:', port)//, '; connections:', connectedPorts.size);
        port.addEventListener('message', messageHandler);
        port.start();
    }
}


function messageHandler(ev) {
    console.log('[worker] Message received from', ev.currentTarget, ':', ev.data);
    // if (ev.data === 'disconnect') {
    //     connectedPorts.delete(ev.currentTarget);
    //     ev.currentTarget.close();
    //     console.log('[worker] disconnected from', ev.currentTarget, '; connections:', connectedPorts.size);
    // }
    ev.currentTarget.postMessage({ wrapped: ev.data });
}

// function notify(data) {
//     for (let i of connectedPorts) {
//         i.postMessage(data);
//     }
// }

// setInterval(() => {
//     notify({ test: 123456 });
// }, 2000);
