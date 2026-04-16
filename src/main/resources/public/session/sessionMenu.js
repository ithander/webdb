// ========== 会话树右键菜单 ==========
var _menuTarget = null; // { node, level, treeId }

// 菜单项定义
var SESSION_MENU = [
    { id: 'menu-edit', text: '编辑', icon: '✏️' },
    { id: 'menu-delete', text: '删除', icon: '🗑️' },
    { type: 'sep' },
    { id: 'menu-export', text: '导出', icon: '📥' },
    { type: 'sep' },
    { id: 'menu-refresh', text: '刷新', icon: '🔄' },
    { id: 'menu-info', text: '会话信息', icon: 'ℹ️' },
    { id: 'menu-disconnect', text: '断开连接', icon: '🔌' }
];

var DATABASE_MENU = [
    { id: 'menu-create', text: '创建表...', icon: '➕' },
    { type: 'sep' },
    { id: 'menu-export', text: '导出', icon: '📥', children: [
        { id: 'menu-export-csv', text: 'Excel CSV' },
        { id: 'menu-export-json', text: 'JSON' },
        { id: 'menu-export-jsonline', text: 'JSON Line' },
        { id: 'menu-export-sql', text: 'SQL Inserts' }
    ]},
    { type: 'sep' },
    { id: 'menu-refresh', text: '刷新', icon: '🔄' }
];

var TABLE_MENU = [
    { id: 'menu-edit', text: '编辑表', icon: '✏️' },
    { id: 'menu-delete', text: '删除表', icon: '🗑️' },
    { id: 'menu-truncate', text: '清空表', icon: '⚠️' },
    { id: 'menu-create', text: '创建表...', icon: '➕' },
    { type: 'sep' },
    { id: 'menu-export', text: '导出', icon: '📥', children: [
        { id: 'menu-export-csv', text: 'Excel CSV' },
        { id: 'menu-export-json', text: 'JSON' },
        { id: 'menu-export-jsonline', text: 'JSON Line' },
        { id: 'menu-export-sql', text: 'SQL Inserts' }
    ]},
    { type: 'sep' },
    { id: 'menu-refresh', text: '刷新', icon: '🔄' }
];

function buildMenuHtml(items) {
    var html = '<div id="sessionContextMenu" style="display:none;position:fixed;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:160px;padding:4px 0;font-size:13px;">';
    items.forEach(function(item) {
        if (item.type === 'sep') { html += '<div style="border-top:1px solid #eee;margin:4px 0;"></div>'; }
        else if (item.children) {
            html += '<div class="sess-menu-item sess-has-sub" style="padding:6px 15px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:space-between;position:relative;">';
            html += '<span style="display:flex;align-items:center;gap:8px;"><span style="width:18px;text-align:center;">' + (item.icon || '') + '</span><span>' + item.text + '</span></span><span style="color:#999;">▶</span>';
            html += '<div class="sess-submenu" style="display:none;position:absolute;left:100%;top:-4px;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:140px;padding:4px 0;z-index:100000;">';
            item.children.forEach(function(sub) {
                if (sub.type === 'sep') html += '<div style="border-top:1px solid #eee;margin:4px 0;"></div>';
                else html += '<div class="sess-menu-item sess-sub-item" data-action="' + sub.id + '" style="padding:6px 15px;cursor:pointer;white-space:nowrap;">' + sub.text + '</div>';
            });
            html += '</div></div>';
        }
        else { html += '<div class="sess-menu-item" data-action="' + item.id + '" style="padding:6px 15px;cursor:pointer;display:flex;align-items:center;gap:8px;"><span style="width:18px;text-align:center;">' + (item.icon || '') + '</span><span>' + item.text + '</span></div>'; }
    });
    html += '</div>';
    return html;
}

function showSessionContextMenu(e, items, treeNode, treeId) {
    e.preventDefault();
    $('#sessionContextMenu').remove();
    _menuTarget = { node: treeNode, level: treeNode.level, treeId: treeId };
    $('body').append(buildMenuHtml(items));
    var $menu = $('#sessionContextMenu');
    // 确保菜单不超出屏幕
    var left = e.clientX, top = e.clientY;
    $menu.show();
    if (left + $menu.outerWidth() > $(window).width()) left = $(window).width() - $menu.outerWidth() - 5;
    if (top + $menu.outerHeight() > $(window).height()) top = $(window).height() - $menu.outerHeight() - 5;
    $menu.css({ left: left, top: top });
    $('.sess-menu-item').on('mouseenter', function() { $(this).css('background', '#f0f0f0'); }).on('mouseleave', function() { $(this).css('background', ''); });
    $('.sess-has-sub').on('mouseenter', function() { $(this).find('.sess-submenu').show(); }).on('mouseleave', function() { $(this).find('.sess-submenu').hide(); });
    $('.sess-menu-item').on('click', function(e) {
        var action = $(this).data('action');
        if (!action) return; // 父菜单项无 action，忽略
        $('#sessionContextMenu').remove();
        $(document).off('click.sessMenu');
        handleSessionMenuAction(action);
    });
    setTimeout(function() { $(document).on('click.sessMenu', function(e) { if (!$(e.target).closest('#sessionContextMenu').length) { $('#sessionContextMenu').remove(); $(document).off('click.sessMenu'); } }); }, 0);
}

function handleSessionMenuAction(action) {
    var ctx = _menuTarget; if (!ctx || !ctx.node) return;
    var node = ctx.node;
    switch (action) {
        case 'menu-edit':
            if (node.level === 0) { editSession(node.title); }
            else if (node.level === 2) { switchTab('structure'); loadTableStructure(node.title, node.dbName, node.tableName); }
            break;
        case 'menu-delete':
            if (node.level === 0) {
                layer.confirm('确定删除会话 <b>' + node.title + '</b> ？', function(idx) {
                    layer.close(idx);
                    var configs = WebdbCrypto.loadConfigs();
                    for (var i = 0; i < configs.length; i++) { if (configs[i].title === node.title) { configs.splice(i, 1); break; } }
                    WebdbCrypto.saveConfigs(configs);
                    $.ajax({ url: '/webdb/config/del', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: node.title }) });
                    infos = configs;
                    var zTree = $.fn.zTree.getZTreeObj(ctx.treeId); if (zTree) zTree.destroy();
                    initSessionTree();
                    layer.msg('已删除');
                });
            } else if (node.level === 2) {
                layer.confirm('确定删除表 <b>' + node.tableName + '</b> ？此操作不可恢复！', function(idx) {
                    layer.close(idx);
                    var dt = node.dbtype || '';
                    var dropSql = (dt === 'pg') ? 'DROP TABLE ' + node.dbName + '.' + node.tableName + ' CASCADE'
                                : (dt === 'oracle') ? 'DROP TABLE ' + node.dbName + '.' + node.tableName + ' CASCADE CONSTRAINTS'
                                : 'DROP TABLE ' + node.dbName + '.' + node.tableName;
                    $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
                        data: JSON.stringify({ title: node.title, sql: dropSql }),
                        success: function(r) {
                            if (r.code === 0) { layer.msg('表已删除'); var zTree = $.fn.zTree.getZTreeObj(ctx.treeId); if (zTree) zTree.removeNode(node); }
                            else { layer.msg('删除失败: ' + (r.msg || '')); }
                        }, error: function() { layer.msg('请求失败'); }
                    });
                });
            }
            break;
        case 'menu-truncate':
            if (node.level === 2) {
                layer.confirm('确定清空表 <b>' + node.tableName + '</b> 的所有数据？此操作不可恢复！', function(idx) {
                    layer.close(idx);
                    $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
                        data: JSON.stringify({ title: node.title, sql: 'TRUNCATE TABLE ' + node.dbName + '.' + node.tableName }),
                        success: function(r) {
                            if (r.code === 0) { layer.msg('表已清空'); loadTableData(node.title, node.dbName, node.tableName); }
                            else { layer.msg('清空失败: ' + (r.msg || '')); }
                        }, error: function() { layer.msg('请求失败'); }
                    });
                });
            }
            break;
        case 'menu-create':
            var dbName = node.level === 1 ? node.dbName : (node.level === 2 ? node.dbName : '');
            var title = node.title;
            var dbtype = node.dbtype || '';
            if (!dbName) { layer.msg('请选择数据库'); return; }
            layer.prompt({ title: '创建表 - 输入表名', formType: 0 }, function(tableName, idx) {
                layer.close(idx);
                if (!tableName || !tableName.trim()) return;
                var sql = _createTableSql(dbtype, dbName, tableName.trim());
                $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
                    data: JSON.stringify({ title: title, sql: sql }),
                    success: function(r) {
                        if (r.code === 0) { layer.msg('表已创建'); refreshTree(); }
                        else { layer.msg('创建失败: ' + (r.msg || '')); }
                    }, error: function() { layer.msg('请求失败'); }
                });
            });
            break;
        case 'menu-export-csv':
        case 'menu-export-json':
        case 'menu-export-jsonline':
        case 'menu-export-sql':
            var fmt = action.replace('menu-export-', '');
            if (node.level === 2 && node.tableName) {
                _exportTableData(node.title, node.dbName, node.tableName, fmt);
            } else if (node.level === 1 && node.dbName) {
                _exportAllTables(node.title, node.dbName, fmt);
            }
            break;
        case 'menu-refresh':
            if (node.level === 0) { refreshTree(); }
            else if (node.level === 1) {
                var zTree = $.fn.zTree.getZTreeObj(ctx.treeId);
                if (zTree) { zTree.removeChildNodes(node); node._loaded = false; loadTables(zTree, node); node._loaded = true; }
            } else if (node.level === 2) {
                loadTableStructure(node.title, node.dbName, node.tableName);
                loadTableData(node.title, node.dbName, node.tableName);
            }
            break;
        case 'menu-info':
            if (node.level === 0) {
                var configs = WebdbCrypto.loadConfigs();
                var cfg = null;
                for (var i = 0; i < configs.length; i++) { if (configs[i].title === node.title) { cfg = configs[i]; break; } }
                if (cfg) {
                    layer.open({ type: 1, title: '会话信息 - ' + cfg.title, area: ['400px', '280px'], shadeClose: true,
                        content: '<div style="padding:15px;font-size:13px;line-height:2;">' +
                            '<div><b>名称：</b>' + cfg.title + '</div>' +
                            '<div><b>类型：</b>' + (cfg.dbtype || '') + '</div>' +
                            '<div><b>主机：</b>' + cfg.host + ':' + cfg.port + '</div>' +
                            '<div><b>用户：</b>' + cfg.uname + '</div>' +
                            '<div><b>数据库：</b>' + (cfg.dbname || '') + '</div>' +
                            '<div><b>状态：</b>' + (node.connected ? '<span style="color:green;">已连接</span>' : '<span style="color:#999;">未连接</span>') + '</div>' +
                            '</div>'
                    });
                } else { layer.msg('未找到会话信息'); }
            }
            break;
        case 'menu-disconnect':
            if (node.level === 0 && node.connected) {
                layer.confirm('确定断开会话 <b>' + node.title + '</b> 的连接？', function(idx) {
                    layer.close(idx);
                    $.ajax({ url: '/webdb/session/disconnect', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: node.title }),
                        success: function() {
                            var zTree = $.fn.zTree.getZTreeObj(ctx.treeId);
                            if (zTree) { zTree.removeChildNodes(node); node.connected = false; node._loaded = false; }
                            layer.msg('已断开连接');
                        },
                        error: function() { layer.msg('断开失败'); }
                    });
                });
            }
            break;
    }
}

// 绑定右键菜单到会话树
function bindSessionTreeContextMenu() {
    $('#sessionTree').on('contextmenu', 'a', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var zTree = $.fn.zTree.getZTreeObj('sessionTree');
        if (!zTree) return;
        var node = zTree.getNodeByTId($(this).closest('li').attr('id'));
        if (!node) return;
        zTree.selectNode(node);
        if (node.level === 0) showSessionContextMenu(e, SESSION_MENU, node, 'sessionTree');
        else if (node.level === 1) showSessionContextMenu(e, DATABASE_MENU, node, 'sessionTree');
        else if (node.level === 2) showSessionContextMenu(e, TABLE_MENU, node, 'sessionTree');
    });
}

// ========== 导出功能 ==========
function _formatExportContent(rows, cols, tableName, format, dbtype) {
    var q = _q(dbtype || 'mysql');
    var content = '', filename = tableName, mime = 'text/plain';
    if (format === 'csv') {
        content = '\uFEFF' + cols.join(',') + '\n';
        rows.forEach(function(row) {
            content += cols.map(function(c) { var v = row[c]; if (v === null || v === undefined) return ''; var s = String(v); return (s.indexOf(',') > -1 || s.indexOf('"') > -1) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',') + '\n';
        });
        filename += '.csv'; mime = 'text/csv;charset=utf-8';
    } else if (format === 'json') {
        content = JSON.stringify(rows, null, 2);
        filename += '.json'; mime = 'application/json;charset=utf-8';
    } else if (format === 'jsonline') {
        rows.forEach(function(row) { content += JSON.stringify(row) + '\n'; });
        filename += '.jsonl'; mime = 'application/x-ndjson;charset=utf-8';
    } else if (format === 'sql') {
        rows.forEach(function(row) {
            var c = cols.map(function(c) { return q + c + q; }).join(', ');
            var v = cols.map(function(c) { var val = row[c]; return val === null || val === undefined ? 'NULL' : "'" + _escVal(dbtype || 'mysql', String(val)) + "'"; }).join(', ');
            content += 'INSERT INTO ' + tableName + ' (' + c + ') VALUES (' + v + ');\n';
        });
        filename += '.sql';
    }
    return { content: content, filename: filename, mime: mime };
}

function _downloadContent(content, filename, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function _exportTableData(title, dbName, tableName, format) {
    var loadIdx = layer.load(1, { shade: [0.3, '#000'] });
    var sql = 'SELECT * FROM ' + dbName + '.' + tableName;
    $.ajax({ url: "/webdb/db/mysql/executeQuery", type: "POST", contentType: "application/json",
        data: JSON.stringify({ title: title, sql: sql }),
        success: function(result) {
            layer.close(loadIdx);
            if (result.code === 0 && result.data && result.data.data && result.data.data.length > 0) {
                var rows = result.data.data;
                var cols = []; for (var key in rows[0]) { if (rows[0].hasOwnProperty(key)) cols.push(key); }
                var dbtype = _getDbtype(title);
                var out = _formatExportContent(rows, cols, tableName, format, dbtype);
                _downloadContent(out.content, out.filename, out.mime);
                layer.msg('已导出: ' + out.filename);
            } else { layer.msg('表中没有数据'); }
        },
        error: function() { layer.close(loadIdx); layer.msg('请求失败'); }
    });
}

function _exportAllTables(title, dbName, format) {
    var loadIdx = layer.load(1, { shade: [0.3, '#000'] });
    // 先获取所有表名
    $.ajax({ url: "/webdb/session/tables", type: "GET", data: { title: title, dbName: dbName },
        success: function(result) {
            if (result.code !== 0 || !result.data || result.data.length === 0) {
                layer.close(loadIdx); layer.msg('没有可导出的表'); return;
            }
            var tables = result.data.map(function(t) { return t.tableName; });
            var dbtype = _getDbtype(title);
            var q = _q(dbtype);
            var allContent = '', done = 0, total = tables.length;

            tables.forEach(function(tbl) {
                var sql = 'SELECT * FROM ' + dbName + '.' + tbl;
                $.ajax({ url: "/webdb/db/mysql/executeQuery", type: "POST", contentType: "application/json",
                    data: JSON.stringify({ title: title, sql: sql }),
                    success: function(r) {
                        if (r.code === 0 && r.data && r.data.data && r.data.data.length > 0) {
                            var rows = r.data.data;
                            var cols = []; for (var key in rows[0]) { if (rows[0].hasOwnProperty(key)) cols.push(key); }
                            var out = _formatExportContent(rows, cols, tbl, format, dbtype);
                            if (format === 'sql') { allContent += '-- Table: ' + tbl + '\n' + out.content + '\n'; }
                            else if (format === 'json') { allContent += '"' + tbl + '": ' + JSON.stringify(rows, null, 2) + ',\n'; }
                            else { allContent += '-- ' + tbl + '\n' + out.content + '\n'; }
                        }
                        done++;
                        if (done === total) {
                            layer.close(loadIdx);
                            if (!allContent) { layer.msg('所有表均为空'); return; }
                            var ext = format === 'csv' ? '.csv' : format === 'json' ? '.json' : format === 'jsonline' ? '.jsonl' : '.sql';
                            if (format === 'json') allContent = '{\n' + allContent.replace(/,\n$/, '\n') + '}';
                            _downloadContent(format === 'csv' ? '\uFEFF' + allContent : allContent, dbName + ext);
                            layer.msg('已导出: ' + dbName + ext);
                        }
                    },
                    error: function() { done++; if (done === total) { layer.close(loadIdx); if (allContent) { var ext = format === 'csv' ? '.csv' : format === 'json' ? '.json' : format === 'jsonline' ? '.jsonl' : '.sql'; _downloadContent(allContent, dbName + ext); } else { layer.msg('导出失败'); } } }
                });
            });
        },
        error: function() { layer.close(loadIdx); layer.msg('获取表列表失败'); }
    });
}
