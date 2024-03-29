import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { createServerData } from '@/assets/app/userdata.js';



const componentId = '432b03899b174d7485574e04c15c9f9b';

const data = {
    data() {
        return {
            formDataLoading: false,
            loginButtonText: globalThis.tr?.('ui.login.ui/login'),
            server: '',
            passwd: '',
            https: true,
            errorMessage: '',
            showHttpsConfirm: false,
            enforceNoHttps: false,
            _abortController: null,
            ignoreVerification: false,
        }
    },

    components: {

    },

    emits: ['serverAdded'],

    methods: {
        Login,
        cancelOperation() {
            if (this.$data.formDataLoading) {
                if (this.$data._abortController) {
                    this.$data._abortController.abort();
                    this.$data.formDataLoading = false;
                }
            }
            else if (this.$data.errorMessage == this.$data.server == this.$data.passwd == '' && this.$data.https == true) {
                history.length > 1 ? history.back() : (location = '#/');
            }
            else {
                this.$data.errorMessage = this.$data.server = this.$data.passwd = '';
                this.$data.https = true;
            }
        }
    },

    watch: {
        https() {
            if (!this.$data.https) {
                this.$data.showHttpsConfirm = true;
            }
        },
        ignoreVerification() {
            this.loginButtonText = tr('ui.login.ui/' + (this.ignoreVerification ? 'save' : 'login'));
        },
    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


async function Login() {
    this.$data.formDataLoading = true;
    this.$data.errorMessage = '';

    const ignoreVerification = this.ignoreVerification;
    const passwd = this.$data.passwd;
    let server = this.$data.server;

    if (!ignoreVerification && !server.startsWith('http')) {
        const protocol = this.$data.https ? 'https' : 'http';

        if (!server.startsWith('//')) server = protocol + '://' + server;
        else if (server.startsWith('//')) server = protocol + ':' + server;
        else return this.$data.formDataLoading = false;
    }

    const _this = this;

    try {
        if (!ignoreVerification) {
            this.$data._abortController = new AbortController();
            const resp = await fetch(server + '/auth', {
                method: 'POST',
                body: passwd,
                headers: {
                    "x-auth-token": passwd,
                },
                mode: 'cors',
                cache: 'no-store',
                redirect: 'follow',
                referrer: location.origin,
                signal: this.$data._abortController.signal,
            });

            if (!resp.ok) {
                return errHand(resp.status + ' ' + resp.statusText, 'HTTP error');
            }
        }


        // auth succeed, add to server list
        const srvinfo = createServerData({
            addr: server,
            name: server,
            pswd: passwd,
        });

        // finished
        _this.$data._abortController = null;
        //_this.$data.formDataLoading = false;
        _this.$data.loginButtonText = tr('ui.login.ui/loginSucceed');
        _this.$emit('serverAdded', srvinfo);
        setTimeout(() => {
            location = '#/';
        }, 1000);
    }
    catch (error) {
        console.error('[Login]', 'Failed to auth (fetch /auth):', error);
        errHand(error, `Failed to auth (fetch "${server}/auth"):`);
    }

    function errHand(error, text) {
        _this.$data.formDataLoading = false;
        _this.$data.errorMessage = text + ' (error: ' + error + ')';
    }
}



