export default [
    {
        text: "File", cb(m) {
            AppendMenu(m, String, {}, 'New...');
            AppendMenu(m, 'separator');
            AppendMenu(m, String, {}, 'Upload File', function () {
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

            return m;
        }
    },
    {
        text: "Edit", cb(m) {

        }
    },
    {
        text: "View", cb(m) {

        }
    },
    {
        text: "Window", cb(m) {

        }
    },
    {
        text: "Help", cb(m) {

        }
    },
];