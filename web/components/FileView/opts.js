const t = globalThis.tr || function (v) { return(v); };
export const opts = [
    {
        id: 0,
        text: t('Open directly'),
        cb() {
            this.downloadFile();
        },
    },
    {
        id: 1,
        text: '--------',
    },
    {
        id: 2,
        text: t('Open with...'),
        cb() {
            this.openWithDialog = true;
        },
    },
    {
        id: 3,
        text: t('Edit (plain text)'),
        cb() {
            
        },
    },
    {
        id: 4,
        text: t('Edit (binary hex-editor)'),
        cb() {
            
        },
    },
    {
        id: 5,
        text: '--------',
    },
];
