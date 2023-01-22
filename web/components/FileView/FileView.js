import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = 'e189a9d5f3384a2cb35f248a04a693ab';

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
        update() {
            
        },
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

