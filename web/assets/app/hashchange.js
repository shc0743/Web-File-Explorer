export default {
    "#/login/"(hash) {
        this.$data.current_page = 'login';
    },

    "#/s/"(hash) {
        this.$data.current_page = 'server';
    },

    "#/servers/"(hash) {
        this.$data.current_page = 'serverList';
    },

    "#/upload/"(hash) {
        this.$data.current_page = 'upload';
    },

    "#/sys/fo/"(hash) {
        this.$data.current_page = 'fileOps';
    },

    "#/settings/"(hash) {
        this.$data.current_page = 'settings';
    },

    "#/terminal/"(hash) {
        this.$data.current_page = 'terminal';
        globalThis.appInstance_.terminal?.update();
    },

};