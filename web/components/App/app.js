import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { computed, defineAsyncComponent } from 'vue';
import { db_name } from '@/assets/app/userdata.js';
import '../tree-view/TreeView.js';
import '../VList/VList.js';
import HeaderBar from '../HeaderBar/HeaderBar.js';
const MainView = defineAsyncComponent(() => import('./main-view.js'));
const AsideView = defineAsyncComponent(() => import('./AsideView.js'));
const MobileNavTool = defineAsyncComponent(() => import('./MobileNavTool.js'));
const LoginComponent = defineAsyncComponent(() => import('../Login/login.js'));
const ServerView = defineAsyncComponent(() => import('../ServerView/serverview.js'));
const ServerList = defineAsyncComponent(() => import('../ServerList/ServerList.js'));
const UploadPage = defineAsyncComponent(() => import('../UploadPage/upload.js'));
const FileOps = defineAsyncComponent(() => import('../FileOps/FileOps.js'));
const AppSettings = defineAsyncComponent(() => import('../AppSettings/AppSettings.js'));
const TransferPanel = defineAsyncComponent(() => import('../TransferPanel/TransferPanel.js'));
const RenameDialog = defineAsyncComponent(() => import('../RenameDialog/RenameDialog.js'));
const RemoteSOCDialog = defineAsyncComponent(() => import('../RemoteSOCDialog/RemoteSOCDialog.js'));
const TerminalUI = defineAsyncComponent(() => import('../Terminal/terminal-ui.js'));
const MediaPlayer0 = defineAsyncComponent(() => import('../MediaPlayer0/MediaPlayer0.js'));


const componentId = '65ea71a404e947c0b8d52896ca5837eb';
export { componentId };



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
            canGo: {},

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
        RenameDialog,
        RemoteSOCDialog,
        TerminalUI,
        MediaPlayer0,
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
            if (globalThis.location.hash.startsWith('#/s/'))
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            else globalThis.location.reload();
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

    // template: await getHTML(import.meta.url, componentId), // 这里importShim polyfill了一个很奇怪的表达式：
    // template: await getHTML(importShim._r['http://192.168.0.103:4307/web-file-explorer/web/components/App/app.js'].m
    // ;import{u$_}from'blob:http://192.168.0.103:4307/6ce422f5-12fc-4754-9c2a-936395f494f6';try{u$_({componentId:componentId})}catch(_){};
    // .url, componentId),
    // 估计是它内部bug，于是现在只能这么写了。。。
    template: await getHTML('components/App/app.js', componentId),

};


export default data;

