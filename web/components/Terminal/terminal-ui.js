import { getHTML, getVdeep } from '@/assets/js/browser_side-compiler.js';
import { Close, Plus } from 'icons-vue';
import { componentId as appComponentId } from '../App/app.js';


const componentId = '3ae15e9fd7234a9b975a14374301e3b3';

const data = {
    data() {
        return {
            appVdeep: getVdeep(appComponentId),
            hideStatusbar: false,
            isActive: false,
            instances: [
                { id: 1, title: '2 - test terminal' },
                { id: 3, title: '4 - test' },
                { id: 5, title: '6 - test' },
                { id: 7, title: '8' },
                { id: 9, title: '10' },
                // { id: 11, title: '12' },
                // { id: 13, title: '14' },
                // { id: 15, title: '16' },
                // { id: 17, title: '18' },
                // { id: 19, title: '20' },
                // { id: 21, title: '22' },
                // { id: 23, title: '24' },
                // { id: 25, title: '26' },
                // { id: 27, title: '28' },
                // { id: 29, title: '30' },
                // { id: 31, title: '32' },
                // { id: 33, title: '34' },
                // { id: 35, title: '36' },
                // { id: 37, title: '38' },
                // { id: 39, title: '40' },
            ],
            current: 1,
        }
    },

    components: {
        Close, Plus,
    },

    props: {
        servers: { type: Object, required: true },
        
    },

    methods: {
        update() {
            if ((this.isActive = location.hash.startsWith('#/terminal/'))) {
                userdata.get('config', 'terminal.hideStatusbar').then(v => {
                    this.hideStatusbar = (v === true);
                }).catch(() => { });

            }
        },

        handleTabDragstart(ev) {
            ev.dataTransfer.setData('application/x-web-file-explorer-terminal-tab', ev.target.dataset.id);
        },
        handleTabDrop(ev) {
            const id = ev.dataTransfer.getData('application/x-web-file-explorer-terminal-tab');
            const targetId = ev.target.dataset.id;
            const index = this.instances.findIndex(el => String(el.id) === id);
            const index2 = this.instances.findIndex(el => String(el.id) === targetId);
            if (index != -1 && index2 != -1) {
                const el = this.instances.splice(index, 1);
                this.instances.splice(index2, 0, el[0]);
            }
        },
        handleTabbarWheel(ev) {
            this.$refs.tabs.scrollBy({
                left: ev.deltaX || ev.deltaY,
                top: 0,
                // behavior: 'smooth'
            });
        },

        terminateTab: (function () {
            let lastMouseDown = null;
            return function (id, opt = null) {
                if (opt === 'down') return lastMouseDown = id;
                if (opt === 'up') if (id !== lastMouseDown) return;
                // TODO
                this.instances = this.instances.filter(el => el.id !== id);
                
                if (this.instances.length === 0) {
                    location.href = '#/';
                }
            }
        })(),

    },

    mounted() {
        globalThis.appInstance_.terminal = this;
        globalThis.addEventListener('hashchange', onhashchange);

    },
    beforeUnmount() {
        globalThis.removeEventListener('hashchange', onhashchange);
        delete globalThis.appInstance_.terminal;

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


function onhashchange() {
    if (!location.hash.startsWith('#/terminal/')) {
        (globalThis.appInstance_.terminal || {}).isActive = false;
    }
}

globalThis.addEventListener('beforeunload',function (ev) {
    // if (globalThis.appInstance_.terminal?.isActive) {
    //     ev.preventDefault();
    //     ev.returnValue = '';
    //     return false;
    // }
})



