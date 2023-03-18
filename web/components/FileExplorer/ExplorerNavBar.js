import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = 'd3a0b5f14eea4d39ac26082a1dacfd24';

const data = {
    data() {
        return {

        }
    },

    components: {

    },

    props: {
        server: Object,
        path: String,
    },

    methods: {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

