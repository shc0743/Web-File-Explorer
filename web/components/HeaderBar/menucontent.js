import { h } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';

globalThis.appInstance_.newFileOp = (type) => {
    if (!appInstance_.explorer) return ElMessage.error(tr('ui.fo.new.err.noexpl'));
    const path = globalThis.appInstance_.explorer.path,
        srv = globalThis.appInstance_.explorer.server.addr,
        pw = globalThis.appInstance_.explorer.server.pswd;
    ElMessageBox.prompt(
        h('div', { style: 'white-space:pre-line;word-break:break-all' },
            tr('ui.fo.new.' + type + '.text').replaceAll('$1', path)), 'File Operation', {
        confirmButtonText: tr('dialog.ok'),
        cancelButtonText: tr('dialog.cancel'),
        inputValidator: v => !!v,
    }).then(name => {
        if (name.action !== 'confirm') return;
        globalThis.appInstance_.mainMenuBar?.['new' + type](srv, pw, path, name.value);
    }).catch(() => { });
};

let r = {};

const data = [
    {
        text: "File", cb(m) {
            const submenu1 = CreatePopupMenu();
            AppendMenu(m, String, { submenu: true }, r['New...'], submenu1);
            const creator = globalThis.appInstance_.newFileOp;
            AppendMenu(submenu1, String, {}, r['File'], creator.bind(this, 'file'));
            AppendMenu(submenu1, String, {}, r['Folder'], creator.bind(this, 'dir'));

            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Upload File'], function () {
                let hash = location.hash;
                if (hash.startsWith('#/s/')) {
                    // typical   #/s/srv_id/drive/path/to/name.txt
                    //           0 1    2     3    4   5   6
                    hash = hash.split('/');
                    hash.splice(3, 0, 'sys/upload');
                    hash = hash.join('/');
                    location.hash = hash;
                    return;
                }
                location.hash = '#/upload/choose';
            });

            AppendMenu(m, 'separator');
            function fileops() {
                location.href = '#/sys/fo/';
            }
            AppendMenu(m, String, {}, r['Copy File'], fileops);
            AppendMenu(m, String, {}, r['Move File'], fileops);
            AppendMenu(m, String, {}, r['Link File'], fileops);
            
            AppendMenu(m, String, {}, r['Rename'], () => {
                if (!appInstance_.explorer) return ElMessage.error(tr('ui.fo.new.err.noexpl'));
                this.renameFile();
            });

            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Delete Selected File'], function () {
                globalThis.appInstance_.explorer?.deleteSelected({});
            });
            AppendMenu(m, String, {}, r['Delete Selected File FOREVER'], function () {
                globalThis.appInstance_.explorer?.deleteSelected({ shiftKey: true });
            });

            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Command Panel'], function () {
                globalThis.commandPanel?.toggle();
            });

            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Settings'], function () {
                location.hash = '#/settings/';
            });

            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Close'], function () { close() });

            return m;
        }
    },
    {
        text: "Edit", cb(m) {
            AppendMenu(m, String, {disabled:true}, r['Cut'], function () {
                
            });
            AppendMenu(m, String, {disabled:true}, r['Copy'], function () {
                
            });
            AppendMenu(m, String, {disabled:true}, r['Paste'], function () {
                
            });
            AppendMenu(m, 'separator');
            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Select All'], function () {
                const l = globalThis.appInstance_.explorer?.$refs.lst;
                if (!l) return;
                l.selection = 'all';
            });

            return m;
        }
    },
    {
        text: "View", cb(m) {
            AppendMenu(m, String, {}, r['FullScreen (Esc to cancel)'], function () {
                document.documentElement.requestFullscreen();
            });

            return m;
        }
    },
    {
        text: "Window", cb(m) {
            AppendMenu(m, String, {}, r['Close'], function () {
                close()
            });

            return m;
        }
    },
    {
        text: "Terminal", cb(m) {
            AppendMenu(m, String, {}, r['New Terminal'], function () {
                let hash = location.hash;
                if (hash.startsWith('#/s/')) {
                    // typical "#/s/base64srvid/path/name"
                    hash = hash
                        .split('/')
                        .slice(0, 3);
                    hash.splice(1, 1, 'terminal');
                    hash = hash.join('/') + '/';
                    location.hash = hash;
                }
                else location.hash = '#/terminal/';
            });
            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, r['Open in terminal'], function () {
                let hash = location.hash;
                if (hash.startsWith('#/s/')) {
                    hash = hash.replace('#/s/', '#/terminal/');
                    location.hash = hash;
                }
                else location.hash = '#/terminal/';
            });

            return m;
        }
    },
    {
        text: "Help", cb(m) {
            AppendMenu(m, String, {}, r['Get Help'], function () {
                
            });

            return m;
        }
    },
];

import { lang } from "@/assets/app/translation.js";
(async function () {
    try {
        const v = await (await fetch('translation/' + lang + '/menu.json')).json();
        r = new Proxy(r, {
            get(target, p, recv) {
                if (v[p]) return v[p];
                return p;
            },
        })

        for (const i of data) {
            if (v[i.text]) i.text = v[i.text];
        }
    } catch { }
})();



export default data;