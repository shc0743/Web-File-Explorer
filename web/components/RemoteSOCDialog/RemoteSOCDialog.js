import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElLoading } from 'element-plus';


const componentId = 'e9b3b64239f14dd299691d6234b79975';
const CREATE_SUSPENDED = 0x4;

const data = {
    data() {
        return {
            isLoading: false,
            server: null,
            type: null,

            s_prog: '', s_verb: 'open', s_param: '', s_show: 1,
            c_app: '', c_cl: '', c_susp: false, c_show: 1,
        }
    },

    components: {

    },

    props: { servers: Object, },

    methods: {
        show(type) {

            const initial = {
                s_prog: '', s_verb: 'open', s_param: '', s_show: 1,
                c_app: '', c_cl: '', c_susp: false, c_show: 1,
            }
            for (const i in initial) this.$data[i] = initial[i];

            if (type) {
                this.type = type;
                this.$refs.s_n.disabled = true;
            }
            this.$refs.dlg.showModal();

        },
        async perform() {
            this.isLoading = true;
            
            try {
                const srv = this.servers.filter(el => el.addr === this.server)[0];
                if (!srv) throw ('Server not found');
                const url = new URL('/sys/' + (this.type === 'c' ? 'CreateProcess' : 'ShellExecute'), srv.addr);
                const fd = new URLSearchParams();
                fd.append('appName', this.type === 'c' ? this.c_app : this.s_prog);
                fd.append('args', this.type === 'c' ? this.c_cl : this.s_param);
                fd.append('nShow', this.type === 'c' ? this.c_show : this.s_show);
                this.type === 'c' ?
                    fd.append('options', this.c_susp ? CREATE_SUSPENDED : 0) : fd.append('verb', this.s_verb);
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'x-auth-token': srv.pswd,
                    },
                    body: fd.toString(),
                });
                if (!resp.ok) throw `HTTP error ${resp.status} : ${await resp.text()}`;
                const msg = (this.type === 'c') ? (`Process started successfully (pid: ${await resp.text()})`) : 'success';
                this.$refs.dlg.close();
                ElMessage.success(msg);
            }
            catch (error) {
                ElMessage.error(String(error));
            }
            finally {
                this.isLoading = false;
            }
        },

    },

    mounted() {
        globalThis.appInstance_.remoteSOCDialog = this;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

