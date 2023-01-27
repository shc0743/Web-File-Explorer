import { getHTML } from '@/assets/js/browser_side-compiler.js';
import menucontent from './menucontent.js';


const componentId = '8fff5eae4e084274bb00e129a2400994';

const data = {
    data() {
        return {
            items: menucontent,
        }
    },

    components: {

    },

    methods: {
        launchHandler(ev) {
            const t = ev.target.dataset.text || ev.target.parentElement.dataset.text;
            for (const i of this.items) {
                if (t === i.text) return TrackPopupMenu(i.cb(CreatePopupMenu()), ev.x, ev.y);
            }
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

