// ========== 会话管理器 ==========
var sessionTreeSetting = {
    view: { showIcon: false, showLine: true, selectedMulti: false, nameIsHTML: true, expandSpeed: "" },
    data: { simpleData: { enable: true, idKey: "id", pIdKey: "pId", rootPId: 0 } },
    callback: { onClick: onSessionClick, onDblClick: onSessionDblClick, onExpand: onNodeExpand, beforeExpand: onBeforeExpand }
};

var nodeIdCounter = 1000;
var ICON = {
    server:   '<span class="tree-icon tree-icon-server">🖥</span>',
    database: '<span class="tree-icon tree-icon-database">🗄</span>',
    table:    '<span class="tree-icon tree-icon-table">📋</span>',
    column:   '<span class="tree-icon tree-icon-column">▪</span>',
    key:      '<span class="tree-icon tree-icon-key">🔑</span>'
};

function initSessionTree() {
    var sessionNodes = [];
    if (infos && infos.length > 0) {
        infos.forEach(function(item) {
            sessionNodes.push({ id: item.id, pId: 0, name: ICON.server + ' ' + item.title, isParent: true, open: false, title: item.title, dbtype: item.dbtype, connected: false });
        });
    }
    $.fn.zTree.init($("#sessionTree"), sessionTreeSetting, sessionNodes);
}

var _clickTimer = null;
var _clickNode = null;

function onSessionDblClick(event, treeId, treeNode) {
    // 取消单击延时
    if (_clickTimer) { clearTimeout(_clickTimer); _clickTimer = null; }
    if (treeNode.level === 0) { editSession(treeNode.title); return; }
    // 查询tab选中时，双击表名插入到查询框
    if (treeNode.level === 2 && treeNode.tableName) {
        var activeTab = $('.tab-item.active').data('tab');
        if (activeTab === 'query' || (activeTab && activeTab.indexOf('query-') === 0)) {
            var $input = activeTab === 'query' ? $('#sqlInput') : $('.sqlInput[data-tab="' + activeTab + '"]');
            if ($input.length) {
                var el = $input[0], start = el.selectionStart, end = el.selectionEnd, val = $input.val();
                var insert = treeNode.tableName;
                $input.val(val.substring(0, start) + insert + val.substring(end));
                el.selectionStart = el.selectionEnd = start + insert.length;
                $input.focus();
                if (typeof updateClearSqlBtn === 'function') updateClearSqlBtn();
                return;
            }
        }
    }
    // 非查询tab时双击执行原来的单击逻辑
    doSessionClick(treeId, treeNode);
}

function onSessionClick(event, treeId, treeNode) {
    // 对表节点延时执行，等待可能的双击
    if (treeNode.level === 2) {
        _clickNode = treeNode;
        if (_clickTimer) clearTimeout(_clickTimer);
        _clickTimer = setTimeout(function() { _clickTimer = null; doSessionClick(treeId, treeNode); }, 250);
        return;
    }
    doSessionClick(treeId, treeNode);
}

function doSessionClick(treeId, treeNode) {
    var zTree = $.fn.zTree.getZTreeObj(treeId);
    if (treeNode.level === 0) return;
    if (treeNode.level === 1) {
        if (!treeNode._loaded) { loadTables(zTree, treeNode); treeNode._loaded = true; }
        zTree.expandNode(treeNode, true, false, true);
        return;
    }
    if (treeNode.level === 2) {
        if (!treeNode._loaded) { loadColumns(zTree, treeNode); treeNode._loaded = true; }
        zTree.expandNode(treeNode, true, false, true);
        currentTable = treeNode.tableName;
        updateStatus('已选择表: ' + treeNode.tableName);
        switchTab('structure');
        loadTableStructure(treeNode.title, treeNode.dbName, treeNode.tableName);
        loadTableData(treeNode.title, treeNode.dbName, treeNode.tableName);
    }
}

function connectSession(treeNode) {
    if (treeNode._connecting) return;
    treeNode._connecting = true;
    updateStatus('正在连接: ' + treeNode.title + '...');
    $.ajax({
        url: "/webdb/session/connect", type: "GET", data: { title: treeNode.title },
        success: function(result) {
            treeNode._connecting = false;
            if (result.code === 0) {
                var zTree = $.fn.zTree.getZTreeObj("sessionTree");
                treeNode.connected = true; zTree.updateNode(treeNode);
                updateStatus('已连接: ' + treeNode.title);
                loadDatabases(zTree, treeNode);
            } else { layer.msg('连接失败: ' + (result.msg || '未知错误')); updateStatus('连接失败', 'error'); }
        },
        error: function() { treeNode._connecting = false; layer.msg('连接请求失败'); updateStatus('连接失败', 'error'); }
    });
}

function onBeforeExpand(treeId, treeNode) {
    if (treeNode.level === 0 && !treeNode.connected) { if (!treeNode._connecting) connectSession(treeNode); return false; }
    if (treeNode.level === 1 && !treeNode._loaded) { var zTree = $.fn.zTree.getZTreeObj(treeId); loadTables(zTree, treeNode); treeNode._loaded = true; }
    return true;
}

function onNodeExpand(event, treeId, treeNode) {
    var zTree = $.fn.zTree.getZTreeObj(treeId);
    if (treeNode.level === 0 && !treeNode._loaded) { loadDatabases(zTree, treeNode); treeNode._loaded = true; }
}

function loadDatabases(zTree, parentNode) {
    updateStatus("正在加载数据库列表...");
    $.ajax({ url: "/webdb/session/databases", type: "GET", data: { title: parentNode.title },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var list = []; result.data.forEach(function(dbName) { nodeIdCounter++;
                    list.push({ id: nodeIdCounter, pId: parentNode.id, name: ICON.database + ' ' + dbName, isParent: true, title: parentNode.title, dbName: dbName, dbtype: parentNode.dbtype });
                });
                zTree.addNodes(parentNode, list); zTree.expandNode(parentNode, true, false, true);
                updateStatus("已加载 " + list.length + " 个数据库");
            } else { layer.msg(result.msg || "加载数据库列表失败"); }
        },
        error: function() { layer.msg("请求失败"); }
    });
}

function loadTables(zTree, parentNode) {
    updateStatus("正在加载表列表...");
    $.ajax({ url: "/webdb/session/tables", type: "GET", data: { title: parentNode.title, dbName: parentNode.dbName },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var list = []; result.data.forEach(function(table) { nodeIdCounter++;
                    list.push({ id: nodeIdCounter, pId: parentNode.id, name: ICON.table + ' ' + table.tableName + ' <span style="color:#999;font-size:11px;">(' + table.total + '行)</span>', isParent: true, title: parentNode.title, dbName: parentNode.dbName, tableName: table.tableName, dbtype: parentNode.dbtype });
                });
                zTree.addNodes(parentNode, list); zTree.expandNode(parentNode, true, false, true);
                updateStatus("已加载 " + list.length + " 张表");
            } else { layer.msg(result.msg || "加载表列表失败"); }
        },
        error: function() { layer.msg("请求失败"); }
    });
}

function loadColumns(zTree, parentNode) {
    updateStatus("正在加载字段信息...");
    $.ajax({ url: "/webdb/session/columns", type: "GET", data: { title: parentNode.title, dbName: parentNode.dbName, tableName: parentNode.tableName },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var nodes = []; result.data.forEach(function(col) { nodeIdCounter++;
                    var icon = col.primaryKey ? ICON.key : ICON.column;
                    var nameHtml = col.primaryKey
                        ? icon + ' <span style="color:#e6a23c;">' + col.colunmName + '</span> <span style="color:#888;font-size:11px;">' + col.columnType + ' PK</span>'
                        : icon + ' ' + col.colunmName + ' <span style="color:#888;font-size:11px;">' + col.columnType + '</span>';
                    nodes.push({ id: nodeIdCounter, pId: parentNode.id, name: nameHtml, isParent: false });
                });
                zTree.addNodes(parentNode, nodes); updateStatus("已加载 " + nodes.length + " 个字段");
            } else { layer.msg(result.msg || "加载字段信息失败"); }
        },
        error: function() { layer.msg("请求失败"); }
    });
}

function editSession(title) {
    layer.open({
        type: 2, title: '编辑会话 - ' + title, shadeClose: true, area: ['550px', '420px'],
        content: '/webdb/config/form?title=' + encodeURIComponent(title),
        btn: ['保存', '取消'],
        yes: function(index) {
            if (window.saveForm) {
                window.saveForm().then(function(r) {
                    if (r && r.code === 0) {
                        layer.close(index); layer.msg('保存成功');
                        infos = WebdbCrypto.loadConfigs();
                        var zTree = $.fn.zTree.getZTreeObj("sessionTree"); if (zTree) zTree.destroy();
                        initSessionTree();
                        $.ajax({ url: '/webdb/config/sync', type: 'POST', contentType: 'application/json', data: JSON.stringify(infos) });
                    }
                });
            }
        }
    });
}

function initDatabaseTree() {}
