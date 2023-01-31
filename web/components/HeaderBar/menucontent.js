const data = [
    {
        text: "File", cb(m) {
            AppendMenu(m, String, {}, r['New...']);
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
            AppendMenu(m, String, {}, r['Delete Selected File'], function () {
                globalThis.appInstance_.explorer?.deleteSelected({});
            });
            AppendMenu(m, String, {}, r['Delete Selected File FOREVER'], function () {
                globalThis.appInstance_.explorer?.deleteSelected({ shiftKey: true });
            });

            return m;
        }
    },
    {
        text: "Edit", cb(m) {
            AppendMenu(m, String, {}, r['Cut'], function () {
                
            });
            AppendMenu(m, String, {}, r['Copy'], function () {
                
            });
            AppendMenu(m, String, {}, r['Paste'], function () {
                
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
        text: "Help", cb(m) {
            AppendMenu(m, String, {}, r['Get Help'], function () {
                
            });

            return m;
        }
    },
];
let r = {};

import { lang } from "@/assets/app/translation.js";
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



export default data;