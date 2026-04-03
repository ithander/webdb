// 配置加密工具 - Base64 编码
var WebdbCrypto = (function() {
    function toBase64(str) {
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            }));
        } catch(e) { return ''; }
    }
    function fromBase64(b64) {
        try {
            return decodeURIComponent(Array.prototype.map.call(atob(b64), function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch(e) { return ''; }
    }
    return {
        encrypt: function(data) {
            try { return 'B64:' + toBase64(JSON.stringify(data)); }
            catch(e) { console.error('加密失败', e); return ''; }
        },
        decrypt: function(encoded) {
            try {
                if (encoded.startsWith('B64:')) encoded = encoded.substring(4);
                return JSON.parse(fromBase64(encoded));
            } catch(e) { console.error('解密失败', e); return null; }
        },
        saveConfigs: function(configs) {
            localStorage.setItem('webdb_configs', this.encrypt(configs));
        },
        loadConfigs: function() {
            var raw = localStorage.getItem('webdb_configs');
            if (!raw) return [];
            if (raw.startsWith('[')) { try { return JSON.parse(raw); } catch(e) { return []; } }
            return this.decrypt(raw) || [];
        }
    };
})();
