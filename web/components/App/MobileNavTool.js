import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ArrowLeft, ArrowRight, RefreshRight } from 'icons-vue';


const componentId = 'f738154acf2e49b2b2e932a1858e3828';

const data = {
    data() {
        return {

        }
    },
    
    props: { canGoBack: Boolean, canGoForward: Boolean },

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

