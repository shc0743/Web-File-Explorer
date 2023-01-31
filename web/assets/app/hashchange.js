export default {
    "#/login/"(hash) {
        this.$data.current_page = 'login';
    },

    "#/s/"(hash) {
        this.$data.current_page = 'server';
    },

    "#/servers/"(hash) {
        this.$data.current_page = 'serverList';
        queueMicrotask(() => {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
    },

    "#/upload/"(hash) {
        this.$data.current_page = 'upload';
    },

};