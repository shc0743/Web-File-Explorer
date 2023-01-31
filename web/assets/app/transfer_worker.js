// import './translation_worker.js';
/*
bug 记录：
    在 SharedWorker 注册 onconnect 之前，不能有任何的 await 一个宏任务或异步请求（比如setTimeout、fetch等）
    （踩坑！mdn也没说）
解决方案：
    （暂时）砍掉翻译，换成异步加载
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
    notify({ type: 'hasTask', value: false });
    globalThis.queueMicrotask(notifyTaskUpdate);
};

console.log('[Shared Worker] Init');
console.log('[Shared Worker] Connections:', connectedPorts.size);



function messageHandler(ev) {
    if (!ev.data) return;
    switch (ev.data.type) {
        case 'disconnect':
            if (connectedPorts.size < 2) { debugger; console.error('[debug] Error!! No connected port') };
            connectedPorts.delete(ev.currentTarget);
            console.debug('[Shared Worker] A port has disconnected:', ev.currentTarget, '\nConnected port count:', connectedPorts.size);
            if (connectedPorts.size < 2) {
                if (transferTasks.size) notify({ type: 'hasTask', value: true });
            }
            ev.currentTarget.close();
            break;

        case 'addTask':
            addTask(ev.data.task, ev.data);
            if (connectedPorts.size < 2) notify({ type: 'hasTask', value: true });
            else notify({ type: 'hasTask', value: false });
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
            if (transferTasks.size < 1) notify({ type: 'hasTask', value: false });
            queueMicrotask(notifyTaskUpdate);
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


function addTask(taskinfo, detail) {
    if (!taskinfo) return false;
    switch (taskinfo.type) {
        case 'upload':
            queueMicrotask(async () => {
                const unionIdPrefix = String(new Date().getTime()) + String(Math.floor(Math.random() * 1e8)) + '_';

                for (let i$ = 0, l = (taskinfo.files.length); i$ < l; ++i$) {
                    const i = taskinfo.files[i$];
                    const d = {unionId: unionIdPrefix + i$,type: 'upload',status: 'pending',filename: i.filename,blob: i.blob,server: i.server,pswd: i.pswd,path: i.path,override: i.override,handle:i.handle};
                    transferTasks.add(d);
                    transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/upload'),src: i.filename,dest: i.path,status: 'Pending',});
                }
                notifyTaskUpdate();

                const { uploadFile, uploadFileHandle } = await import('../workers/upload.js');
                queueMicrotask(async() => {
                    for (const i of transferTasks) {
                        if (i.type !== 'upload' || i.status !== 'pending') continue;
                        i.status = 'prep';
                        try {
                            const cb = perf => {
                                transferTasksUser.set(i, { unionId: i.unionId, type: tr('task/upload'), src: i.filename, dest: i.path, status: (Math.floor(perf * 10000) / 100) + '%' })
                            };
                            if (i.handle) {
                                await uploadFileHandle(
                                    i.server, i.pswd, i.path, i.filename, i.override, i.handle, cb
                                )
                            } else await uploadFile(
                                i.server, i.pswd, i.path, i.filename, i.override, i.blob, cb
                            );
                            i.status = 'ok';
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/upload'),src: i.filename,dest: i.path,status: 'Finished',isFinished: true,});
                            notifyTaskUpdate();
                            detail.notify && notify({ type: 'taskDone', task: detail });
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            console.error(error);
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/upload'),src: i.filename,dest: i.path,status: 'Error: ' + error,});
                            detail.notify && notify({ type: 'taskFail', task: detail });
                        }
                    }
                    notify({ type: 'dataUpdated' });
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
                    transferTasksUser.set(d, { unionId: d.unionId, type: tr('task/' + taskinfo.type), src: i.src, dest: i.dest, status: 'Pending' });
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
                            try {
                                const resp = await fetch(url, { method: 'POST', headers: { 'x-auth-token': i.info.pswd } });
                                if (!resp.ok) throw 'HTTP ERROR ' + resp.status;

                            }
                            catch (error) {
                                detail.notify && notify({ type: 'taskFail', task: detail, reason: String(error) });
                            }
                            
                            i.status = 'ok';
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/' + taskinfo.type),src: i.info.src,dest: i.info.dest,status: 'Finished',isFinished: true});
                            notifyTaskUpdate();
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            console.error(error);
                            transferTasksUser.set(i, { unionId: i.unionId, type: tr('task/' + taskinfo.type), src: i.info.src, dest: i.info.dest, status: 'Error: ' + error });
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
                    transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/delete'),src: i.path,dest: '',status: 'Pending',});
                }
                notifyTaskUpdate();
                
                queueMicrotask(async () => {
                    for (const i of transferTasks) {
                        if (i.type !== 'delete' || i.status !== 'pending') continue;
                        i.status = 'prep';
                        try {
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/delete'),src: i.path,dest: '',status: 'Loading',isFinished: true,});
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
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/delete'),src: i.path,dest: '',status: 'Finished',isFinished: true,});
                            notifyTaskUpdate();
                        }
                        catch (error) {
                            i.status = 'error';
                            i.error = error;
                            transferTasksUser.set(i, {unionId: i.unionId,type: tr('task/delete'),src: i.path,dest: '',status: 'Error: ' + error,});
                        }
                    }
                    notify({ type: 'dataUpdated' });
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
                transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/newdir'),src: '',dest: taskinfo.pathname,status: 'Pending'});
                notifyTaskUpdate();
                
                queueMicrotask(async () => {
                    try {
                        transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/newdir'),src: '',dest:taskinfo.pathname,status: 'Loading',isFinished: true,});
                        const url = new URL('/file/new/dir', taskinfo.server);
                        const resp = await fetch(url, {
                            method: 'POST',
                            headers: {'x-auth-token': taskinfo.pswd},
                            body: taskinfo.pathname,
                        });
                        if (!resp.ok) throw `Fetch error, code ${resp.status}, error text ${await resp.text()}`;
                        
                        d.status = 'ok';
                        transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/newdir'),src:'',dest:taskinfo.pathname,status: 'Finished',isFinished: true,});
                        notifyTaskUpdate();
                    }
                    catch (error) {
                        d.status = 'error';
                        d.error = error;
                        transferTasksUser.set(d, {unionId: d.unionId,type: tr('task/newdir'),src:'',dest:taskinfo.pathname,status: 'Error: ' + error,});
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



