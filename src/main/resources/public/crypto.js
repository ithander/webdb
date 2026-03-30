// 简单加密工具 - Base64 + XOR
var WebdbCrypto = (function() {
    var KEY = 'webdb@2026#sec';

    function xorEncrypt(str) {
        var result = '';
        for (var i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
        }
        return result;
    }

    return {
        encrypt: function(data) {
            try {
                var json = JSON.stringify(data);
                var xored = xorEncrypt(json);
                return btoa(unescape(encodeURIComponent(xored)));
            } catch(e) {
                console.error('加密失败', e);
                return '';
            }
        },
        decrypt: function(encoded) {
            try {
                var xored = decodeURIComponent(escape(atob(encoded)));
                var json = xorEncrypt(xored); // XOR 是对称的
                return JSON.parse(json);
            } catch(e) {
                console.error('解密失败', e);
                return null;
            }
        },
        // 保存配置到 localStorage（加密）
        saveConfigs: function(configs) {
            localStorage.setItem('webdb_configs', this.encrypt(configs));
        },
        // 从 localStorage 读取配置（解密）
        loadConfigs: function() {
            var raw = localStorage.getItem('webdb_configs');
            if (!raw) return [];
            // 兼容旧的未加密数据
            if (raw.startsWith('[')) {
                try { return JSON.parse(raw); } catch(e) { return []; }
            }
            return this.decrypt(raw) || [];
        }
    };
})();
