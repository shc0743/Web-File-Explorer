import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElSelect, ElOption, ElLoading, ElMessage } from 'element-plus';


const componentId = '71fe886e983243d6b23a880127be76f1';

const data = {
    data() {
        return {
            loadingInstance: null,
            listdata: [],
            viewType: 'list',
            objectCountStr: '',
            
        }
    },

    components: {
        ElButton, ElSelect, ElOption,
    },

    props: {
        server: Object,
        path: String,
    },

    methods: {
        update() {
            this.loadingInstance = ElLoading.service({ lock: false, fullscreen: false, target: '#myApp main my-container' });
            this.$nextTick(async () => {
                this.listdata = await this.loadList();
                if (('ok' in this.listdata && (!this.listdata.ok)) || this.listdata instanceof Error) {
                    this.loadingInstance.close();
                    if (this.listdata instanceof Error)
                        ElMessage.error(`Failed to load data: ${this.listdata}`);
                    else
                        ElMessage.error(`Failed to load data: HTTP error ${this.listdata.status}`);
                    return;
                }
                
                this.objectCountStr = splitNumber(this.listdata.length) + ` object${this.listdata.length > 1 ? 's' : ''}`
                this.$refs.lst.data = this.renderList.bind(this);
                this.loadingInstance.close();

            });
        },

        async loadList() {
            const forbiddenKeywords = ['d|.', 'd|..'];
            const url = new URL('/fileList', this.server.addr);
            url.searchParams.append('path', this.path);
            try{
                const resp = await fetch(url, {
                    method: 'post',
                    headers: { 'x-auth-token': this.server.pswd },
                });
                if (!resp.ok) return resp;
                return (await resp.text()).split('\n').filter(el => el.length > 2 && (!forbiddenKeywords.includes(el)));
            }
            catch (error) { return error };
        },

        renderList() {
            const r = [];
            for (let i of this.listdata) {
                if (i.length < 3) continue;
                const a = i.split('|');
                const b = [{}, a[1]];
                if (a[0] === 'd') {
                    b[0].html = `<span class="icon is-folder"></span>`; // TODO: 添加文件夹图标
                }
                else if (a[0] === 'f') {
                    b[0].html = `<span class="icon is-file"></span>`;
                }
                else {
                    b[0] = a[0];
                }
                r.push(b);
            }
            return r;
        },

    },

    computed: {
        
    },

    mounted() {
        this.update();
    },
    
    watch: {
        path() {
            this.$nextTick(() => this.update());
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


export function splitNumber(num) {
    if (isNaN(num) || Math.abs(num) < 1000) return num;
    return num.toString().replace(/\d+/, function (n) {
        return n.replace(/(\d)(?=(\d{3})+$)/g, a => a + ',');
    });
}

