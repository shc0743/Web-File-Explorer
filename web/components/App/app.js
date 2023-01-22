import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { db_name } from '@/assets/app/userdata.js';
import '../tree-view/TreeView.js';
import '../VList/VList.js';
import MainView from './main-view.js';
import AsideView from './AsideView.js';
import LoginComponent from '../Login/login.js';
import HeaderBar from '../HeaderBar/HeaderBar.js';
import ServerView from '../ServerView/serverview.js';
import ServerList from '../ServerList/ServerList.js';


const componentId = '65ea71a404e947c0b8d52896ca5837eb';



const data = {
    data() {
        return {
            current_page: 'unknown',
            servers: [],
            asideStyle: { width: '200px' },
            asideResizing: false,
            asideResizingYes: false,
            recreateAsideView: true,
        };
    },

    components: {
        MainView,
        AsideView,
        LoginComponent,
        HeaderBar,
        ServerView,
        ServerList,
    },

    computed: {
        htmlEl() {
            return document.querySelector(`[data-v-${componentId}]`);
        },
    },

    methods: {
        skipToContent(ev) {
            ev.target.blur();
            this.htmlEl.querySelector(`main [tabindex="0"], main input, main button, main a[href]`)?.focus();
        },
        skipToServerList(ev) {
            ev.target.blur();
            this.htmlEl.querySelector('aside [data-id="allServers"]')?.focus();
        },

        aside_onPointerMove(ev) {
            if (this.$data.asideResizingYes) {
                const style = getComputedStyle(ev.target);
                this.$data.asideStyle.width = ev.x - parseInt(style.paddingLeft) - parseInt(style.paddingRight) + 'px';
                return;
            }
            let width = ev.target.getBoundingClientRect().right;
            this.$data.asideResizing = ((width - ev.x) >= 0 && (width - ev.x) < 10);
        },
        aside_onPointerDown(ev) {
            if (!this.$data.asideResizing) {
                let width = ev.target.getBoundingClientRect().right;
                this.$data.asideResizing = ((width - ev.x) >= 0 && (width - ev.x) < 10);
            }
            if (!ev.isPrimary || !this.$data.asideResizing) return;
            ev.target.setPointerCapture(ev.pointerId);
            this.$data.asideResizingYes = true;
        },
        aside_onPointerUp(ev) {
            if (!ev.isPrimary || !this.$data.asideResizingYes) return;
            this.$data.asideResizingYes = false;
        },

        toggleServer(data) {
            location.hash = '#/s/' + btoa(data);
        },

        async updateServerDataFromLogin(info) {
            const isNotNewData = await(userdata.get('servers', info.addr));
            
            if (isNotNewData && isNotNewData.name) info.name = isNotNewData.name;
            await userdata.put('servers', info);
            if (!!isNotNewData) return;
            
            globalThis.loadServers();
            globalThis.notifyDataUpdate();
        },

        reload_content() {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        }


    },

    created() {
        globalThis.appInstance_.instance = this;
        globalThis.appInstance_.serversLoadRequest = globalThis.loadServers();
    },

    mounted() {
        
    },

    watch: {
        current_page() {
            document.title = globalThis.tr ?
                globalThis.tr('doctitle$=' + this.$data.current_page, '')
                + globalThis.tr('document.title') :
                document.title;
        },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

