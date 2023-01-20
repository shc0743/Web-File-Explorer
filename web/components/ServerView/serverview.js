import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElTable, ElTableColumn, ElSwitch } from 'element-plus';
import FileExplorer from '../FileExplorer/FileExplorer.js';


const componentId = '6f396fb8f6bc431daeaa4a7fb2451c35';

const data = {
    data() {
        return {
            isLoading: false,
            errorText: '',
            viewType: 'unset',
            currentSrv: null,
            indexTableData: [],
            volumeData: [],
            advancedVolumeView: false,
            explorerPath: '',
        }
    },

    components: {
        ElButton, ElTable, ElTableColumn, ElSwitch,
        FileExplorer,
    },

    methods: {
        update() {

        },

        reset() {
            this.$data.isLoading = false;
            this.$data.errorText = '';
            this.$data.currentSrv = null;
        },

        reload() {
            this.reset();
            setTimeout(hashchangeHandler);
        },
        goLogin() {
            location.hash = '#/login/'
        },
        
        updateVolumeView() {
            this.$data.indexTableData.length = 0;
            this.$data.volumeData.forEach(el => {
                if (el.isAdv && !(this.$data.advancedVolumeView)) return;
                if (el.name && el.drive) el.text = `${el.name} (${el.drive})`;
                else el.text = '';
                this.$data.indexTableData.push(el);
            });
        },

        handleIndexRowClick(row) {
            if (!row.drive) return;
            location.hash += row.drive.replaceAll('\\', '/');
        }

    },

    watch: {
        advancedVolumeView() {
            this.$nextTick(() => this.updateVolumeView());
        }
    },

    computed: {
        appInstance_() { return globalThis.appInstance_ },
    },

    mounted() {
        globalThis.appInstance_.serverView = this;
        setTimeout(hashchangeHandler);

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


async function hashchangeHandler() {
    let hash = this.location.hash;
    if (!hash.startsWith('#/s/')) return;
    globalThis.appInstance_.serverView.$data.errorText = '';

    let srv_id = hash.substring(4);
    do {
        let index = srv_id.indexOf('/');
        if (index === -1) {
            try {
                atob(srv_id);
                history.replaceState('', document.title, '#/s/' + srv_id + '/');
                hash = '#/s/' + srv_id + '/';
                break;
            } catch { } // 此时已经得到 srv_id
        }
        srv_id = srv_id.substring(0, index);
        try { atob(srv_id) } catch (err) {
            return console.error('[ServerView]', new Error('Failed to decode srv_id'), err);
        }
    } while (0);
    const srv_idA = atob(srv_id)

    let srv_data = await globalThis.userdata.get('servers', srv_idA);
    // console.log('srv_data=', srv_data);
    if (!srv_data) {
        console.error('[ServerView]', 'Server not found:', srv_idA);
        return globalThis.appInstance_.serverView.$data.errorText =
            'Server not found, please <a href="#/login/" onclick="' +
            'globalThis.appInstance_.serverView.$data.errorText=\'\'">login</a> first';
    }

    globalThis.appInstance_.serverView.$data.isLoading = true;
    ExecuteHandler.call(globalThis.appInstance_.serverView, srv_data, srv_id, hash);

}
window.addEventListener('hashchange', hashchangeHandler);
//setTimeout(hashchangeHandler);

    
    
async function ExecuteHandler(srv_data, srv_id, hash) {
    this.$data.currentSrv = srv_data;

    if (hash === '#/s/' + srv_id + '/') {
        this.$data.viewType = 'index';
        this.$data.isLoading = true;
        this.$data.indexTableData.length = 0;

        try {
            let vols = await fetch(srv_data.addr + '/volumes', {
                method: 'post',
                headers: { 'x-auth-token': srv_data.pswd }
            });
            if (vols.status === 401) {
                this.reset();
                this.$data.errorText = tr('ui.string:authFailed')
                return;
            }
            if (!vols.ok) {
                this.reset();
                this.$data.errorText = tr('error') + ': ' + await (vols.text());
                return;
            }

            const text = await vols.text();
            if (text === 'NotSupported') {
                this.reset();
                location.hash = '#/s/' + srv_id + '/$/';
                return;
            }
            const arr1 = text.split('\n');
            
            this.$data.volumeData = [];
            for (let i of arr1) {
                if (!i || i === '') continue;
                let arr2 = i.split('|');
                if (arr2.length === 1) {
                    this.$data.volumeData.push({
                        guid: arr2[0], isAdv: true
                    });
                    continue;
                }
                this.$data.volumeData.push({
                    guid: arr2[0],
                    drive: arr2[1],
                    name: arr2[2],
                    fs: arr2[3],
                });
            }
            
            this.$data.isLoading = false;

            this.$nextTick(() => this.updateVolumeView());

        }
        catch (err) {
            // failed to fetch
            this.reset();
            this.$data.errorText = err;
            return;
        }
        return;
    }

    if (hash.startsWith('#/s/' + srv_id + '/')) {
        hash = hash.substring(('#/s/' + srv_id + '/').length);
        hash = hash.replaceAll('\\', '/');
        // console.log(hash);

        // 传入子组件
        try { this.$data.explorerPath = decodeURIComponent(hash) }
        catch { this.$data.explorerPath = hash }
        this.$data.isLoading = false;
        this.$data.viewType = 'explore';
        // this.$nextTick(() => this.$refs.fileExplorerInstance.update());
        return;
    }


    this.reset();
}




export { hashchangeHandler };




