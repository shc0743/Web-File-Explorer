import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { computed } from 'vue';
import { db_name } from '@/assets/app/userdata.js';
import '../tree-view/TreeView.js';
import '../VList/VList.js';
import MainView from './main-view.js';
import AsideView from './AsideView.js';
import LoginComponent from '../Login/login.js';
import HeaderBar from '../HeaderBar/HeaderBar.js';
import ServerView from '../ServerView/serverview.js';
import ServerList from '../ServerList/ServerList.js';
import UploadPage from '../UploadPage/upload.js';
import FileOps from '../FileOps/FileOps.js';
import AppSettings from '../AppSettings/AppSettings.js';
import MobileNavTool from './MobileNavTool.js';
import TransferPanel from '../TransferPanel/TransferPanel.js';


const componentId = '65ea71a404e947c0b8d52896ca5837eb';



const data = {
    data() {
        return {
            current_page: 'unknown',
            apptitle: '',
            servers: [],
            asideStyle: { width: '200px' },
            asideResizing: false,
            asideResizingYes: false,
            showAside: true,
            recreateAsideView: true,
            transferPanel_isOpen: false,
            transferList: [],

        };
    },

    components: {
        MainView,
        AsideView,
        LoginComponent,
        HeaderBar,
        ServerView,
        ServerList,
        UploadPage,
        FileOps,
        AppSettings,
        MobileNavTool,
        TransferPanel,
    },

    computed: {
        htmlEl() {
            return document.querySelector(`[data-v-${componentId}]`);
        },
    },

    provide() {
        return {
            apptitle: computed(() => this.apptitle),
            
        }
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
        closeAside() {
            this.showAside = false;
            userdata.put('config', false, 'showAside')
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
        },


    },

    created() {
        globalThis.appInstance_.instance = this;
        globalThis.appInstance_.serversLoadRequest = globalThis.loadServers();
    },

    mounted() {
        globalThis.userdata?.get('config', 'showAside').then(r => {
            if (false === r) this.showAside = false;
        });
    },

    watch: {
        current_page() {
            this.apptitle = globalThis.tr ?
                globalThis.tr('doctitle$=' + this.$data.current_page, '')
                + globalThis.tr('document.title') :
                globalThis.document.title;
        },
        apptitle() {
            globalThis.document.title = this.apptitle;
        },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

