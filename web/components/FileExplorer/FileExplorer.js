import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '71fe886e983243d6b23a880127be76f1';

const data = {
    data() {
        return {

        }
    },

    props: {
        server: Object,
        path: String,
    },

    methods: {

    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

