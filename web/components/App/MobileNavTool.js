import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ArrowLeft, ArrowRight, RefreshRight } from 'icons-vue';


const componentId = '182f55e0ee0c4c689a266f775340f953';

const data = {
    data() {
        return {

        }
    },

    components: {
        ArrowLeft, ArrowRight, RefreshRight,
    },

    methods: {
        a() { history.back() },
        b() { location.reload() },
        c() { history.forward() },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

