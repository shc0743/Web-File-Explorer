import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '6c75cc8201454386be32e7a3c32970f6';

const data = {
    data() {
        return {
            uploadForm: {},

        }
    },

    props: {
        server: Object,
        path: { type: String, default: '' },
    },

    components: {

    },

    methods: {
        update() {
            globalThis.appInstance_.instance.apptitle = tr('doctitle$=upload') + tr('document.title');

            this.uploadForm.remoteSrv = this.server?.addr;
            this.uploadForm.remotePath = this.path;
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

