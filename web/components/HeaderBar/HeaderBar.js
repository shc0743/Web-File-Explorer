import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ArrowLeft, ArrowRight, RefreshRight, Top } from 'icons-vue';
import MainMenuBar from './MainMenuBar.js';
import SysCtl from './SysCtl.js';


const componentId = '865c73f3eb1842599741f5498dd5a2ec';

const data = {
    data() {
        return {
            pwd: '',

        }
    },

    components: {
        ArrowLeft, ArrowRight, RefreshRight, Top,
        MainMenuBar, SysCtl,
    },

    props: { canGoBack: Boolean, canGoForward: Boolean },

    emits: ['requestreload', 'openTransferPanel'],

    inject: ['apptitle'],

    methods: {
        closeapp() {
            let w = window.open('', '_self');
            window.close();
            w.opener = null;
            w.close();
        },

        cleanPaste(event) {
            let paste = event.clipboardData.getData('text');

            // filter
            paste = paste.replaceAll('\r', '').replaceAll('\n', '');

            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return false;
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(paste));
        },

        goPath() {

        },

        pathUp(blank = false) {
            let hash = location.hash.replaceAll('\\', '/').split('/');
            if (hash[hash.length - 1] === '') hash.pop();
            hash.pop();
            hash = hash.join('/') + '/';
            if (blank) window.open(hash);
            else location.hash = hash;
        },

        appIcon_dragstart(ev) {
            ev.dataTransfer.setData('text/uri-list', window.location.href);
            ev.dataTransfer.setData('text/plain', window.document.title);
        },

        hist(n) {
            history.go(n);
        },

        reload() {
            this.$emit('requestreload');
        },

        goHome() { location.hash = '#/' },

        openBlank() { window.open(window.location, '_blank') },

        openTransPanel() {
            this.$emit('openTransferPanel');
        },

    },

    computed: {
        

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

