// ========== 工具栏按钮和页面初始化函数 ==========

// 初始化标签页
function initTabs() {
    $('.tab-item').click(function() { switchTab($(this).data('tab')); });
    $(document).on('input', '#sqlInput, .sqlInput', function() { if (typeof updateClearSqlBtn === 'function') updateClearSqlBtn(); });
}

// 切换标签页
function switchTab(tabName) {
    $('.tab-item').removeClass('active');
    $('.tab-item[data-tab="' + tabName + '"]').addClass('active');
    $('.tab-content').hide();
    $('.tab-content[data-content="' + tabName + '"]').show();
    if (typeof updateClearSqlBtn === 'function') updateClearSqlBtn();
    // 切换查询tab时更新全局查询数据引用
    if (tabName === 'query' || (tabName && tabName.indexOf('query-') === 0)) {
        var qd = window['_qryData_' + tabName];
        if (qd) { window._lastQueryRows = qd.rows; window._lastQueryCols = qd.cols; window._lastQuerySql = qd.sql || ''; }
        else { window._lastQueryRows = null; window._lastQueryCols = null; window._lastQuerySql = ''; }
    }
    if (typeof updateExportBtn === 'function') updateExportBtn();
}

// 初始化分隔条拖拽
function initResizers() { makeResizable($('#resizer2'), $('.left-panel'), 150, 500); }

function makeResizable(resizer, panel, minWidth, maxWidth) {
    var isResizing = false, lastX = 0;
    resizer.mousedown(function(e) { isResizing = true; lastX = e.clientX; $('body').css('cursor', 'col-resize'); e.preventDefault(); });
    $(document).mousemove(function(e) { if (!isResizing) return; var delta = e.clientX - lastX; var newWidth = panel.width() + delta; if (newWidth >= minWidth && newWidth <= maxWidth) { panel.width(newWidth); lastX = e.clientX; } });
    $(document).mouseup(function() { if (isResizing) { isResizing = false; $('body').css('cursor', 'default'); } });
}

// 键盘快捷键
function bindKeyboardShortcuts() {
    $(document).keydown(function(e) {
        if (e.keyCode === 120 || (e.ctrlKey && e.keyCode === 13)) { e.preventDefault(); runQuery(); }
        if (e.ctrlKey && e.keyCode === 78) { e.preventDefault(); switchTab('query'); $('#sqlInput').focus(); }
    });
}

// 新增会话
function openSessionManager() {
    layer.open({
        type: 2, title: '新增数据库配置', shadeClose: true, area: ['550px', '420px'], content: '/webdb/config/form',
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

function deleteConfig(idx) {
    var configs = WebdbCrypto.loadConfigs();
    var removed = configs.splice(idx, 1)[0];
    WebdbCrypto.saveConfigs(configs);
    if (removed) $.ajax({ url: '/webdb/config/del', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: removed.title }) });
    layer.msg('已删除');
    infos = configs;
    var zTree = $.fn.zTree.getZTreeObj("sessionTree"); if (zTree) zTree.destroy();
    initSessionTree();
}

// 刷新树
function refreshTree() {
    var zTree = $.fn.zTree.getZTreeObj("sessionTree");
    if (!zTree) return;
    updateStatus('正在刷新...');
    var sessionNodes = zTree.getNodes(), pending = 0;
    sessionNodes.forEach(function(sessionNode) {
        if (!sessionNode.connected) return;
        pending++;
        var expandedDbs = [];
        if (sessionNode.children) { sessionNode.children.forEach(function(dbNode) { if (dbNode.open) expandedDbs.push(dbNode.dbName); }); zTree.removeChildNodes(sessionNode); }
        sessionNode._loaded = false;
        $.ajax({ url: "/webdb/session/databases", type: "GET", data: { title: sessionNode.title },
            success: function(result) {
                if (result.code === 0 && result.data) {
                    var list = []; result.data.forEach(function(dbName) { nodeIdCounter++;
                        list.push({ id: nodeIdCounter, pId: sessionNode.id, name: ICON.database + ' ' + dbName, isParent: true, title: sessionNode.title, dbName: dbName, dbtype: sessionNode.dbtype });
                    });
                    zTree.addNodes(sessionNode, list); sessionNode._loaded = true;
                    if (sessionNode.children && expandedDbs.length > 0) {
                        sessionNode.children.forEach(function(dbNode) {
                            if (expandedDbs.indexOf(dbNode.dbName) === -1) return;
                            $.ajax({ url: "/webdb/session/tables", type: "GET", data: { title: dbNode.title, dbName: dbNode.dbName },
                                success: function(tblResult) {
                                    if (tblResult.code === 0 && tblResult.data) {
                                        var tblList = []; tblResult.data.forEach(function(table) { nodeIdCounter++;
                                            tblList.push({ id: nodeIdCounter, pId: dbNode.id, name: ICON.table + ' ' + table.tableName + ' <span style="color:#999;font-size:11px;">(' + table.total + '行)</span>', isParent: true, title: dbNode.title, dbName: dbNode.dbName, tableName: table.tableName, dbtype: dbNode.dbtype });
                                        });
                                        zTree.addNodes(dbNode, tblList); dbNode._loaded = true; zTree.expandNode(dbNode, true, false, false);
                                    }
                                }
                            });
                        });
                    }
                }
                pending--; if (pending === 0) updateStatus('已刷新');
            },
            error: function() { pending--; if (pending === 0) updateStatus('已刷新'); }
        });
    });
    if (pending === 0) updateStatus('已刷新');
}

function refreshDbTree() { refreshTree(); }

// 新建查询 tab
var _queryTabCount = 1;
function newQuery() {
    _queryTabCount++;
    var tabId = 'query-' + _queryTabCount;
    var tabHtml = '<div class="tab-item" data-tab="' + tabId + '" style="position:relative;"><i class="layui-icon layui-icon-file"></i><span>查询' + _queryTabCount + '</span><span class="tab-close" data-close="' + tabId + '" style="margin-left:5px;cursor:pointer;color:#999;font-size:14px;">&times;</span></div>';
    $('#tabsHeader').append(tabHtml);
    var contentHtml = '<div class="tab-content" data-content="' + tabId + '" style="display:none;"><div id="queryView-' + tabId + '" style="display:flex;flex-direction:column;height:100%;"><div style="padding:5px 8px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #eee;"><span id="queryInfo-' + tabId + '" style="font-size:12px;color:#999;margin-left:auto;"></span></div><div style="padding:5px 8px;"><textarea class="sqlInput" data-tab="' + tabId + '" rows="5" placeholder="输入 SQL 查询语句，按 Ctrl+Enter 或 F9 执行" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:Consolas,monospace;font-size:13px;resize:vertical;"></textarea></div><div class="queryResult" data-tab="' + tabId + '" style="flex:1;overflow:auto;padding:0 8px 8px;"><div class="empty-state" style="padding:30px 0;"><p style="color:#999;">输入 SQL 语句并执行</p></div></div></div></div>';
    $('#tabsContent').append(contentHtml);
    $('#tabsHeader .tab-item[data-tab="' + tabId + '"]').click(function() { switchTab(tabId); });
    $('#tabsHeader .tab-close[data-close="' + tabId + '"]').click(function(e) { e.stopPropagation(); closeQueryTab(tabId); });
    switchTab(tabId);
    $('#tabsContent .sqlInput[data-tab="' + tabId + '"]').focus();
    updateStatus('新建查询' + _queryTabCount);
}

function closeQueryTab(tabId) {
    var $tab = $('#tabsHeader .tab-item[data-tab="' + tabId + '"]');
    var isActive = $tab.hasClass('active');
    $tab.remove();
    $('#tabsContent .tab-content[data-content="' + tabId + '"]').remove();
    if (isActive) switchTab('structure');
}

// 更新状态栏
function updateStatus(text, type) {
    $('#statusText').text(text);
    $('#statusText').css('color', type === 'error' ? '#dc3545' : '#495057');
}

// ========== 导出下拉菜单 ==========

function updateExportBtn() {
    var activeTab = $('.tab-item.active').data('tab');
    var hasData = false;
    if (activeTab === 'data' && typeof _dataCtx !== 'undefined' && _dataCtx.rows && _dataCtx.rows.length > 0) hasData = true;
    if (activeTab === 'query' || (activeTab && activeTab.indexOf('query-') === 0)) {
        var $result = activeTab === 'query' ? $('#queryResult') : $('.queryResult[data-tab="' + activeTab + '"]');
        if ($result.find('table').length > 0) hasData = true;
    }
    var $btn = $('#btnExport');
    if (hasData) { $btn.prop('disabled', false).css({ opacity: 1, cursor: 'pointer' }); }
    else { $btn.prop('disabled', true).css({ opacity: 0.5, cursor: 'not-allowed' }); $('#toolbarExportMenu').remove(); }
}

function toggleExportMenu() {
    if ($('#toolbarExportMenu').length) { $('#toolbarExportMenu').remove(); return; }
    var items = [
        { text: 'Excel CSV', format: 'csv' },
        { text: 'JSON', format: 'json' },
        { text: 'JSON Line', format: 'jsonline' },
        { text: 'SQL Inserts', format: 'sql-insert' }
    ];
    var html = '<div id="toolbarExportMenu" style="position:absolute;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:140px;padding:4px 0;font-size:13px;">';
    items.forEach(function(item) {
        html += '<div class="toolbar-export-item" data-format="' + item.format + '" style="padding:6px 15px;cursor:pointer;white-space:nowrap;">' + item.text + '</div>';
    });
    html += '</div>';
    var $btn = $('#btnExport');
    var offset = $btn.offset();
    $('body').append(html);
    $('#toolbarExportMenu').css({ left: offset.left, top: offset.top + $btn.outerHeight() + 2 });
    $('.toolbar-export-item').on('mouseenter', function() { $(this).css('background', '#f0f0f0'); }).on('mouseleave', function() { $(this).css('background', ''); });
    $('.toolbar-export-item').on('click', function(e) {
        e.stopPropagation();
        var format = $(this).data('format');
        $('#toolbarExportMenu').remove();
        $(document).off('click.exportMenu');
        doToolbarExport(format);
    });
    setTimeout(function() { $(document).on('click.exportMenu', function(e) { if (!$(e.target).closest('#toolbarExportMenu').length) { $('#toolbarExportMenu').remove(); $(document).off('click.exportMenu'); } }); }, 0);
}

function doToolbarExport(format) {
    var activeTab = $('.tab-item.active').data('tab');
    var rows, cols, tableName = 'export', sqlTableName = 'table_name';

    // 数据 tab
    if (activeTab === 'data' && typeof _dataCtx !== 'undefined' && _dataCtx.rows && _dataCtx.rows.length > 0) {
        rows = _dataCtx.rows; cols = _dataCtx.cols; tableName = _dataCtx.tableName || 'data';
        sqlTableName = _dataCtx.tableName || 'table_name';
    }
    // 查询 tab
    else if (activeTab === 'query' || (activeTab && activeTab.indexOf('query-') === 0)) {
        if (typeof _lastQueryRows !== 'undefined' && _lastQueryRows && typeof _lastQueryCols !== 'undefined' && _lastQueryCols) {
            rows = _lastQueryRows; cols = _lastQueryCols; tableName = 'query-result';
            var m = (window._lastQuerySql || '').match(/\bFROM\s+([^\s,;(]+)/i);
            if (m) { var _t = m[1].replace(/`/g, ''); sqlTableName = _t.indexOf('.') > -1 ? _t.split('.').pop() : _t; }
        }
    }
    if (!rows || !cols || rows.length === 0) { layer.msg('没有可导出的数据'); return; }

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
        filename += '.json'; mime = 'application/x-ndjson;charset=utf-8';
    } else if (format === 'sql-insert') {
        var dt = (_dataCtx && _dataCtx.dbtype) ? _dataCtx.dbtype : 'mysql';
        var q = _q(dt);
        rows.forEach(function(row) {
            var c = cols.map(function(c) { return q + c + q; }).join(', ');
            var v = cols.map(function(c) { var val = row[c]; return val === null || val === undefined ? 'NULL' : "'" + _escVal(dt, String(val)) + "'"; }).join(', ');
            content += 'INSERT INTO ' + sqlTableName + ' (' + c + ') VALUES (' + v + ');\n';
        });
        filename += '.sql';
    }
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    layer.msg('已导出: ' + filename);
}
