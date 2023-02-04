import { ElMessageBox } from 'element-plus';
const t = globalThis.tr || function (v) { return (v); };
export const opts = [
    {
        id: 0,
        text: t('Open directly'),
        cb() { this.openDirectly(); },
    },
    {
        id: 1,
        text: t('Open with...'),
        cb() { this.openWithDialog = true; },
    },
    {
        id: 2,
        text: t('Edit (plain text)'),
        cb() {
            
        },
    },
    {
        id: 3,
        text: t('Edit (binary hex-editor)'),
        cb() {
            
        },
    },
    {
        id: 4,
        disabled: true,
        text: '--------',
    },
    {
        id: 5,
        text: t('ui.file.o/rse'),
        cb() {
            this.remoteExecute();
        },
    },
    {
        id: 6,
        disabled: true,
        text: '--------',
    },
    {
        id: 7,
        text: t('Delete'),
        cb() {
            ElMessageBox.confirm(t('ui.fo.confirm/delete').replaceAll('$1', ''), 'Delete File', {
                confirmButtonText: tr('dialog.ok'),
                cancelButtonText: tr('dialog.cancel'),
                type: 'warning'
            })
            .then(() => {
                this.deleteSelf();
            }).catch(() => { });
        },
    },
    {
        id: 8,
        disabled: true,
        text: '--------',
    },
    {
        id: 9,
        text: t('Properties'),
        cb() {
            this.$refs.fileprop.showModal();
        },
    },
];
