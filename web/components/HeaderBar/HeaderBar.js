import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElButtonGroup, ElIcon } from 'element-plus';
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
        ElButton, ElButtonGroup, ElIcon,
        ArrowLeft, ArrowRight, RefreshRight, Top,
        MainMenuBar, SysCtl,
    },

    emits: ['requestreload'],

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

        pathUp() {

        },

        hist(n) {
            history.go(n);
        },

        reload() {
            this.$emit('requestreload');
        },

        goHome() { location.hash = '#/' },
    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

