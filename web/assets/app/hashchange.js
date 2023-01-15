export default {
    "#/login/"(hash) {
        this.$data.current_page = 'login';
    },

    "#/s/"(hash) {
        this.$data.current_page = 'server';
    },

    "#/servers/"(hash) {
        if (hash === ('#/servers/manage'))
            return this.$data.current_page = 'manageServer';
        this.$data.current_page = 'serverList';
    }

};