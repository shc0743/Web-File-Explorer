// import './translation_worker.js';
/*
bug 记录：
    在 SharedWorker 注册 onconnect 之前，不能有任何的 await 一个宏任务或异步请求（比如setTimeout、fetch等）
    （踩坑！mdn也没说）
解决方案：
    换成异步加载
*/
globalThis.tr = v => v;
import('./translation_For_worker.js');

const connectedPorts = new Set();
const transferTasks = new Set();
const transferTasksUser = new Map();

transferTasksUser._set = transferTasksUser.set;
transferTasksUser.set = function (k, v) {
    transferTasksUser._set(k, v);
    queueMicrotask(notifyTaskUpdate);
};

globalThis.onconnect = function (ev) {
    for (const port of ev.ports) {
        connectedPorts.add(port);
        console.debug('[Shared Worker] New port has connected, connections:', connectedPorts.size);
        port.addEventListener('message', messageHandler);
        port.start();
    }
    // notify({ type: 'hasTask', value: false });
    globalThis.queueMicrotask(notifyTaskUpdate);
};

console.log('[Shared Worker] Init');
console.log('[Shared Worker] Connections:', connectedPorts.size);



function messageHandler(ev) {
    if (!ev.data) return;
    switch (ev.data.type) {
        case 'disconnect':
            // if (connectedPorts.size < 2) { debugger; console.error('[debug] Error!! No connected port') };
            connectedPorts.delete(ev.currentTarget);
            console.debug('[Shared Worker] A port has disconnected,', 'Connected port count:', connectedPorts.size);
            if (connectedPorts.size < 2) {
                // if (transferTasks.size) notify({ type: 'hasTask', value: true });
            }
            ev.currentTarget.close();
            break;

        case 'addTask':
            addTask(ev.data.task, ev.data);
            // if (connectedPorts.size < 2) notify({ type: 'hasTask', value: true });
            // else notify({ type: 'hasTask', value: false });
            break;
        
        case 'deleteTask':
        case 'deleteTasks':
            for (const i of transferTasks) {
                if (ev.data.type === 'deleteTask' ?
                    (i.unionId === ev.data.uid) :
                    (ev.data.uids?.has?.(i.unionId))) {
                    transferTasksUser.delete(i);
                    transferTasks.delete(i);
                }
            }
            // if (transferTasks.size < 1) notify({ type: 'hasTask', value: false });
            queueMicrotask(notifyTaskUpdate);
            break;
        
        case 'repeatTask':
        case 'repeatTasks':
            for (const i of transferTasks) {
                if (ev.data.type === 'repeatTask' ?
                    (i.unionId === ev.data.uid) :
                    (ev.data.uids?.has?.(i.unionId))) {
                    switch (i.type) {
                        // case 'upload':
                        //     addTask({
                        //         type: 'upload', 
                        //     })
                        default: ;
                    }
                }
            }
            break;
    
        default:
            break;
    }
}


function notify(data) {
    for (let i of connectedPorts) {
        i.postMessage(data);
    }
}
function notifyTaskUpdate() {
    const tasks = [];
    for (const i of transferTasksUser.values()) tasks.push(i);
    notify({ type: 'taskUpdated', task: tasks });
}


function addTask(taskinfo, detail = {}) {
    if (!taskinfo) return false;
    switch (taskinfo.type) {
        case 'upload':
            queueMicrotask(async () => {
                const unionIdPrefix = String(new Date().getTime()) + String(Math.floor(Math.random() * 1e8)) + '_';

                for (let i$ = 0, l = (taskinfo.files.length); i$ < l; ++i$) {
                    const i = taskinfo.files[i$];
                    const d = Object.assign(i, { unionId: unionIdPrefix + i$, type: 'upload', status: 'pending' });
                    transferTasks.add(d);
                    transferTasksUser.set(d, { unionId: d.unionId, type: tr('task/upload'), src: i.filename, dest: i.path, status: tr('Pending') });
                }
                notifyTaskUpdate();

                const { uploadFile, uploadFileHandle } = await import('../workers/upload.js');
                queueMicrotask(async() => {
                    let hasFail = false;
                    for (const i of transferTasks) {
                        if (i.type !== 'upload' || i.status !== 'pending') continue;
                        i.status = 'prep';
                        try {
                            const cb = (perf, errText) => {
                                if (errText) {
                                    updateUI(i, 'status', errText);
                                    return;
                                }
                                updateUI(i, 'status', (Math.floor(perf * 10000) / 100) + '%');
                            };
                            if (i.handle) {
                                await uploadFileHandle(Object.assign({ cb }, i));
                            } else await uploadFile(Object.assign({ cb }, i));
                            i.status = 'ok';
                            updateUI(i, 'status', tr('Finished'));
                            updateUI(i, 'isFinished', true);
                            notifyTaskUpdate();
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            // console.error(error);
                            hasFail = true;
                            updateUI(i, 'status', 'Error: ' + error);
                        }
                    }
                    notify({ type: 'dataUpdated' });
                    detail.notify && notify({ type: hasFail ? 'taskFail' : 'taskDone', task: taskinfo, detail: detail });
                });
            });
            break;
        
        case 'copy':
        case 'move':
        case 'link':
            queueMicrotask(() => {
                const unionIdPrefix = String(new Date().getTime()) + String(Math.floor(Math.random() * 1e8)) + '_';

                for (let _i = 0, _l = taskinfo.files.length; _i < _l; _i++) {
                    const i = taskinfo.files[_i];
                    const d = { unionId: unionIdPrefix + _i, type: 'sysop', status: 'pending', info: i };
                    transferTasks.add(d);
                    transferTasksUser.set(d, { unionId: d.unionId, type: tr('task/' + taskinfo.type), src: i.src, dest: i.dest, status: tr('Pending') });
                }

                queueMicrotask(async () => {
                    let hasFail = false;
                    for (const i of transferTasks) {
                        if (i.type !== 'sysop' || i.status !== 'pending') continue;
                        i.status = 'prep';
                        try {
                            const url = new URL('/file/' + taskinfo.type, i.info.server);
                            url.searchParams.set('src', i.info.src);
                            url.searchParams.set('dest', i.info.dest);

                            const resp = await fetch(url, { method: 'POST', headers: { 'x-auth-token': i.info.pswd } });
                            if (!resp.ok) throw 'HTTP ERROR ' + resp.status + ' : ' + await resp.text();
                            
                            i.status = 'ok';
                            updateUI(i, 'status', tr('Finished'));
                            updateUI(i, 'isFinished', true);
                            notifyTaskUpdate();
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            // console.error(error);
                            updateUI(i, 'status', 'Error: ' + error);
                            hasFail = true;
                        }
                    }
                    notify({ type: 'dataUpdated' });
                        
                    // done
                    detail.notify && notify({ type: hasFail ? 'taskFail' : 'taskDone', task: taskinfo, detail: detail });
                })
            });
            break;
        
        case 'delete':
            queueMicrotask(() => {
                const unionIdPrefix = String(new Date().getTime()) + String(Math.floor(Math.random() * 1e8)) + '_';

                for (let i$ = 0, l = taskinfo.files.length; i$ < l; ++i$) {
                    const i = taskinfo.files[i$];
                    const d = {
                        unionId: unionIdPrefix + i$,
                        type: 'delete',
                        status: 'pending',
                        server: i.server, pswd: i.pswd, path: i.path,
                    };
                    transferTasks.add(d);
                    transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/delete'),src: i.path,dest: '',status: tr('Pending')});
                }
                notifyTaskUpdate();
                
                queueMicrotask(async () => {
                    let hasFail = false;
                    for (const i of transferTasks) {
                        if (i.type !== 'delete' || i.status !== 'pending') continue;
                        i.status = 'prep';
                        try {
                            updateUI(i, 'status', tr('Loading'));
                            const url = new URL('/file', i.server);
                            url.searchParams.set('name', i.path);
                            const resp = await fetch(url, {
                                method: 'DELETE',
                                headers: {
                                    'x-auth-token': i.pswd,
                                }
                            });
                            if (!resp.ok) throw `Fetch error, code ${resp.status}, error text ${await resp.text()}`;
                            
                            i.status = 'ok';
                            updateUI(i, 'status', tr('Finished'));
                            updateUI(i, 'isFinished', true);
                            notifyTaskUpdate();
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            hasFail = true;
                            updateUI(i, 'status', 'Error: ' + error);
                        }
                    }
                    notify({ type: 'dataUpdated' });
                    detail.notify && notify({ type: hasFail ? 'taskFail' : 'taskDone', task: taskinfo, detail: detail });
                });
            });
            break;
        
        case 'newdir':
            queueMicrotask(() => {
                const unionIdPrefix = String(new Date().getTime()) + String(Math.floor(Math.random() * 1e8));

                const d = {
                    unionId: unionIdPrefix,
                    type: 'newdir',
                    status: 'pending',
                };
                transferTasks.add(d);
                transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/newdir'),src: '',dest: taskinfo.pathname,status: tr('Pending')});
                notifyTaskUpdate();
                
                queueMicrotask(async () => {
                    let hasFail = false;
                    try {
                        updateUI(d, 'status', tr("Running"));
                        const url = new URL('/file/new/dir', taskinfo.server);
                        const resp = await fetch(url, {
                            method: 'POST',
                            headers: {'x-auth-token': taskinfo.pswd},
                            body: taskinfo.pathname,
                        });
                        if (!resp.ok) throw `Fetch error, code ${resp.status}, error text ${await resp.text()}`;
                        
                        d.status = 'ok';
                        updateUI(d, 'status', tr('Finished'));
                        updateUI(d, 'isFinished', true);
                        notifyTaskUpdate();
                    }
                    catch (error) {
                        d.status = 'error';
                        d.error = error;
                        hasFail = true;
                        updateUI(d, 'status', 'Error: ' + error);
                    }
                    notify({ type: 'dataUpdated' });
                    // done
                    detail.notify && notify({ type: hasFail ? 'taskFail' : 'taskDone', task: taskinfo, detail: detail });
                });
            });
            break;
        
        default:
            break;
    }
}


function updateUI(datakey, key, value) {
    const data = transferTasksUser.get(datakey);
    if (!data) return false;
    data[key] = value;
    transferTasksUser.set(datakey, data);
}



