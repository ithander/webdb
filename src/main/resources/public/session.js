// 会话树配置
var sessionTreeSetting = {
    view: {
        showIcon: false,
        showLine: true,
        selectedMulti: false,
        nameIsHTML: true,
        expandSpeed: ""
    },
    data: {
        simpleData: {
            enable: true,
            idKey: "id",
            pIdKey: "pId",
            rootPId: 0
        }
    },
    callback: {
        onClick: onSessionClick,
        onDblClick: onSessionDblClick,
        onExpand: onNodeExpand,
        beforeExpand: onBeforeExpand
    }
};

// 全局ID计数器
var nodeIdCounter = 1000;

// 图标 HTML
var ICON = {
    server:   '<span class="tree-icon tree-icon-server">🖥</span>',
    database: '<span class="tree-icon tree-icon-database">🗄</span>',
    table:    '<span class="tree-icon tree-icon-table">📋</span>',
    column:   '<span class="tree-icon tree-icon-column">▪</span>',
    key:      '<span class="tree-icon tree-icon-key">🔑</span>'
};

// 初始化会话树
function initSessionTree() {
    var sessionNodes = [];
    if (infos && infos.length > 0) {
        infos.forEach(function(item) {
            sessionNodes.push({
                id: item.id,
                pId: 0,
                name: ICON.server + ' ' + item.title,
                isParent: true,
                open: false,
                title: item.title,
                dbtype: item.dbtype,
                connected: false
            });
        });
    }
    $.fn.zTree.init($("#sessionTree"), sessionTreeSetting, sessionNodes);
}

// 节点双击事件
function onSessionDblClick(event, treeId, treeNode) {
    onSessionClick(event, treeId, treeNode);
}

// 节点点击事件
function onSessionClick(event, treeId, treeNode) {
    var zTree = $.fn.zTree.getZTreeObj(treeId);

    if (treeNode.level === 0) {
        if (!treeNode.connected) {
            connectSession(treeNode);
        } else {
            zTree.expandNode(treeNode, true, false, true);
        }
        return;
    }

    if (treeNode.level === 1) {
        if (!treeNode._loaded) {
            loadTables(zTree, treeNode);
            treeNode._loaded = true;
        }
        zTree.expandNode(treeNode, true, false, true);
        return;
    }

    if (treeNode.level === 2) {
        if (!treeNode._loaded) {
            loadColumns(zTree, treeNode);
            treeNode._loaded = true;
        }
        zTree.expandNode(treeNode, true, false, true);
        currentTable = treeNode.tableName;
        updateStatus('已选择表: ' + treeNode.tableName);
        // 切换到表结构 tab 并加载结构和数据
        switchTab('structure');
        loadTableStructure(treeNode.title, treeNode.dbName, treeNode.tableName);
        loadTableData(treeNode.title, treeNode.dbName, treeNode.tableName);
    }
}

// 连接会话
function connectSession(treeNode) {
    if (treeNode._connecting) return;
    treeNode._connecting = true;
    updateStatus('正在连接: ' + treeNode.title + '...');
    $.ajax({
        url: "/webdb/session/connect",
        type: "GET",
        data: { title: treeNode.title },
        success: function(result) {
            treeNode._connecting = false;
            if (result.code === 0) {
                var zTree = $.fn.zTree.getZTreeObj("sessionTree");
                treeNode.connected = true;
                zTree.updateNode(treeNode);
                updateStatus('已连接: ' + treeNode.title);
                loadDatabases(zTree, treeNode);
            } else {
                layer.msg('连接失败: ' + (result.msg || '未知错误'));
                updateStatus('连接失败', 'error');
            }
        },
        error: function() {
            treeNode._connecting = false;
            layer.msg('连接请求失败');
            updateStatus('连接失败', 'error');
        }
    });
}

// 节点展开前回调
function onBeforeExpand(treeId, treeNode) {
    if (treeNode.level === 0 && !treeNode.connected) {
        if (!treeNode._connecting) {
            connectSession(treeNode);
        }
        return false;
    }
    // 数据库节点展开时自动加载表
    if (treeNode.level === 1 && !treeNode._loaded) {
        var zTree = $.fn.zTree.getZTreeObj(treeId);
        loadTables(zTree, treeNode);
        treeNode._loaded = true;
    }
    return true;
}

// 节点展开后回调
function onNodeExpand(event, treeId, treeNode) {
    var zTree = $.fn.zTree.getZTreeObj(treeId);
    if (treeNode.level === 0 && !treeNode._loaded) {
        loadDatabases(zTree, treeNode);
        treeNode._loaded = true;
    }
}

// 加载数据库列表
function loadDatabases(zTree, parentNode) {
    updateStatus("正在加载数据库列表...");
    $.ajax({
        url: "/webdb/session/databases",
        type: "GET",
        data: { title: parentNode.title },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var nodeDataList = [];
                result.data.forEach(function(dbName) {
                    nodeIdCounter++;
                    nodeDataList.push({
                        id: nodeIdCounter,
                        pId: parentNode.id,
                        name: ICON.database + ' ' + dbName,
                        isParent: true,
                        title: parentNode.title,
                        dbName: dbName,
                        dbtype: parentNode.dbtype
                    });
                });
                zTree.addNodes(parentNode, nodeDataList);
                zTree.expandNode(parentNode, true, false, true);
                updateStatus("已加载 " + nodeDataList.length + " 个数据库");
            } else {
                layer.msg(result.msg || "加载数据库列表失败");
                updateStatus("加载失败", "error");
            }
        },
        error: function() {
            layer.msg("请求失败");
            updateStatus("请求失败", "error");
        }
    });
}

// 加载表列表
function loadTables(zTree, parentNode) {
    updateStatus("正在加载表列表...");
    $.ajax({
        url: "/webdb/session/tables",
        type: "GET",
        data: { title: parentNode.title, dbName: parentNode.dbName },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var nodeDataList = [];
                result.data.forEach(function(table) {
                    nodeIdCounter++;
                    nodeDataList.push({
                        id: nodeIdCounter,
                        pId: parentNode.id,
                        name: ICON.table + ' ' + table.tableName + ' <span style="color:#999;font-size:11px;">(' + table.total + '行)</span>',
                        isParent: true,
                        title: parentNode.title,
                        dbName: parentNode.dbName,
                        tableName: table.tableName,
                        dbtype: parentNode.dbtype
                    });
                });
                zTree.addNodes(parentNode, nodeDataList);
                zTree.expandNode(parentNode, true, false, true);
                updateStatus("已加载 " + nodeDataList.length + " 张表");
            } else {
                layer.msg(result.msg || "加载表列表失败");
                updateStatus("加载失败", "error");
            }
        },
        error: function() {
            layer.msg("请求失败");
            updateStatus("请求失败", "error");
        }
    });
}

// 加载字段列表
function loadColumns(zTree, parentNode) {
    updateStatus("正在加载字段信息...");
    $.ajax({
        url: "/webdb/session/columns",
        type: "GET",
        data: {
            title: parentNode.title,
            dbName: parentNode.dbName,
            tableName: parentNode.tableName
        },
        success: function(result) {
            if (result.code === 0 && result.data) {
                var nodes = [];
                result.data.forEach(function(col) {
                    nodeIdCounter++;
                    var icon = col.primaryKey ? ICON.key : ICON.column;
                    var nameHtml = icon + ' ' + col.colunmName + ' <span style="color:#888;font-size:11px;">' + col.columnType + '</span>';
                    if (col.primaryKey) {
                        nameHtml = icon + ' <span style="color:#e6a23c;">' + col.colunmName + '</span> <span style="color:#888;font-size:11px;">' + col.columnType + ' PK</span>';
                    }
                    nodes.push({
                        id: nodeIdCounter,
                        pId: parentNode.id,
                        name: nameHtml,
                        isParent: false
                    });
                });
                zTree.addNodes(parentNode, nodes);
                updateStatus("已加载 " + nodes.length + " 个字段");
            } else {
                layer.msg(result.msg || "加载字段信息失败");
                updateStatus("加载失败", "error");
            }
        },
        error: function() {
            layer.msg("请求失败");
            updateStatus("请求失败", "error");
        }
    });
}

// 加载表结构到右侧面板
// MySQL 常用数据类型
var MYSQL_TYPES = [
    'int','bigint','smallint','tinyint','mediumint',
    'decimal','float','double',
    'varchar','char','text','mediumtext','longtext','tinytext',
    'date','datetime','timestamp','time','year',
    'blob','mediumblob','longblob','tinyblob',
    'json','enum','set','bit','boolean'
];

function buildTypeSelect(currentType) {
    // 提取基础类型和长度，如 varchar(200) -> varchar, 200
    var baseType = currentType.replace(/\(.*\)/, '').trim().toLowerCase();
    var lengthMatch = currentType.match(/\(([^)]+)\)/);
    var length = lengthMatch ? lengthMatch[1] : '';

    var html = '<div style="display:flex;align-items:center;gap:3px;">';
    html += '<select class="struct-type-select" style="padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
    MYSQL_TYPES.forEach(function(t) {
        var selected = (t === baseType) ? ' selected' : '';
        html += '<option value="' + t + '"' + selected + '>' + t + '</option>';
    });
    html += '</select>';
    html += '<input type="text" class="struct-type-length" value="' + length + '" placeholder="长度" style="width:50px;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
    html += '</div>';
    return html;
}

function loadTableStructure(title, dbName, tableName) {
    var $view = $('#structureView');
    $view.html('<div style="padding:10px;color:#999;">正在加载表结构...</div>');
    $.ajax({
        url: "/webdb/session/columns",
        type: "GET",
        data: { title: title, dbName: dbName, tableName: tableName },
        success: function(result) {
            if (result.code === 0 && result.data && result.data.length > 0) {
                var html = '<div style="padding:5px 8px;font-size:13px;color:#666;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">';
                html += '<span>📋 ' + tableName + ' (' + result.data.length + ' 个字段)</span>';
                html += '<button class="layui-btn layui-btn-sm layui-btn-normal" onclick="saveTableStructure(\'' + title + '\',\'' + dbName + '\',\'' + tableName + '\')">保存修改</button>';
                html += '</div>';
                html += '<table class="layui-table" lay-size="sm" style="margin:0;">';
                html += '<thead><tr>';
                html += '<th style="width:30px;">#</th><th>字段名</th><th>类型</th><th>默认值</th><th style="width:70px;">允许NULL</th><th style="width:50px;">主键</th><th style="width:50px;">唯一</th><th>备注</th>';
                html += '</tr></thead><tbody>';
                result.data.forEach(function(col, idx) {
                    html += '<tr data-col="' + col.colunmName + '">';
                    html += '<td style="color:#999;">' + (idx + 1) + '</td>';
                    html += '<td><input type="text" class="struct-field-name" value="' + col.colunmName + '" style="width:100%;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;' + (col.primaryKey ? 'color:#e6a23c;font-weight:bold;' : '') + '"></td>';
                    html += '<td>' + buildTypeSelect(col.columnType) + '</td>';
                    html += '<td><input type="text" class="struct-default" value="' + (col.defaultValue || '') + '" style="width:100%;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;"></td>';
                    html += '<td style="text-align:center;"><input type="checkbox" class="struct-nullable"' + (col.nullable ? ' checked' : '') + '></td>';
                    html += '<td style="text-align:center;"><input type="checkbox" class="struct-pk"' + (col.primaryKey ? ' checked' : '') + '></td>';
                    html += '<td style="text-align:center;"><input type="checkbox" class="struct-unique"' + (col.unique ? ' checked' : '') + '></td>';
                    html += '<td><input type="text" class="struct-comment" value="' + (col.opt || '') + '" style="width:100%;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;"></td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
                $view.html(html);
                // 保存原始字段数据用于对比
                window._originalColumns = result.data.map(function(col) {
                    return { colunmName: col.colunmName, columnType: col.columnType, primaryKey: col.primaryKey, unique: col.unique, nullable: col.nullable, defaultValue: col.defaultValue || '', opt: col.opt || '' };
                });
            } else {
                $view.html('<div class="empty-state"><p>未找到字段信息</p></div>');
            }
        },
        error: function() {
            $view.html('<div class="empty-state"><p>加载失败</p></div>');
        }
    });
}

// 保存表结构修改
function saveTableStructure(title, dbName, tableName) {
    var columns = [];
    $('#structureView tbody tr').each(function() {
        var $row = $(this);
        var baseType = $row.find('.struct-type-select').val();
        var length = $row.find('.struct-type-length').val();
        var fullType = length ? baseType + '(' + length + ')' : baseType;
        columns.push({
            colunmName: $row.find('.struct-field-name').val(),
            columnType: fullType,
            primaryKey: $row.find('.struct-pk').is(':checked'),
            unique: $row.find('.struct-unique').is(':checked'),
            nullable: $row.find('.struct-nullable').is(':checked'),
            defaultValue: $row.find('.struct-default').val(),
            opt: $row.find('.struct-comment').val()
        });
    });

    if (!window._originalColumns) {
        layer.msg('无法获取原始字段信息');
        return;
    }

    $.ajax({
        url: "/webdb/session/alterTable",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            title: title,
            dbName: dbName,
            tableName: tableName,
            columns: columns,
            originalColumns: window._originalColumns
        }),
        success: function(result) {
            if (result.code === 0) {
                var data = result.data;
                if (typeof data === 'string') {
                    layer.msg(data);
                } else {
                    layer.msg('修改成功，执行了 ' + data.count + ' 条语句');
                    // 刷新表结构
                    window._originalColumns = columns;
                    loadTableStructure(title, dbName, tableName);
                }
            } else {
                layer.msg(result.msg || '修改失败');
            }
        },
        error: function() {
            layer.msg('请求失败');
        }
    });
}



// 当前编辑的数据表上下文
var _dataCtx = {};

function loadTableData(title, dbName, tableName) {
    var $view = $('#dataView');
    $view.html('<div style="padding:10px;color:#999;">正在加载数据...</div>');
    var sql = 'SELECT * FROM ' + dbName + '.' + tableName + ' LIMIT 100';
    $.ajax({
        url: "/webdb/db/mysql/executeQuery",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ title: title, sql: sql }),
        success: function(result) {
            if (result.code === 0 && result.data && result.data.data && result.data.data.length > 0) {
                var rows = result.data.data;
                var count = result.data.count;
                var duration = result.data.duration;
                var cols = [];
                for (var key in rows[0]) {
                    if (rows[0].hasOwnProperty(key)) cols.push(key);
                }
                _dataCtx = { title: title, dbName: dbName, tableName: tableName, cols: cols };

                var html = '<div style="padding:5px 8px;font-size:13px;color:#666;border-bottom:1px solid #eee;">';
                html += '📊 ' + tableName + ' (' + count + ' 行, ' + duration + ' 秒) <span style="color:#999;font-size:11px;">双击行可编辑</span>';
                html += '</div>';
                html += '<div style="overflow:auto;max-height:calc(100vh - 180px);">';
                html += '<table class="layui-table data-edit-table" lay-size="sm" style="margin:0;">';
                html += '<thead><tr>';
                cols.forEach(function(col) {
                    html += '<th style="white-space:nowrap;">' + col + '</th>';
                });
                html += '</tr></thead><tbody>';
                rows.forEach(function(row, idx) {
                    html += '<tr data-row-idx="' + idx + '">';
                    cols.forEach(function(col) {
                        var val = row[col];
                        var isNull = (val === null || val === undefined);
                        var display = isNull ? '<span style="color:#ccc;">NULL</span>' : val;
                        var raw = isNull ? '' : String(val).replace(/"/g, '&quot;');
                        html += '<td data-col="' + col + '" data-val="' + raw + '" data-null="' + isNull + '" style="white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + display + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                $view.html(html);

                // 保存原始行数据
                _dataCtx.rows = rows;

                // 绑定双击编辑
                bindDataRowEdit();
            } else if (result.code === 0 && result.data && result.data.count === 0) {
                $view.html('<div class="empty-state"><p>表中没有数据</p></div>');
            } else {
                $view.html('<div class="empty-state"><p>' + (result.msg || '加载失败') + '</p></div>');
            }
        },
        error: function() {
            $view.html('<div class="empty-state"><p>请求失败</p></div>');
        }
    });
}

function bindDataRowEdit() {
    var $tbody = $('#dataView .data-edit-table tbody');
    var editingRow = null;

    $tbody.on('dblclick', 'tr', function() {
        var $row = $(this);
        if ($row.hasClass('editing')) return;

        // 先保存之前正在编辑的行
        if (editingRow) {
            saveEditingRow(editingRow);
        }

        // 进入编辑模式
        $row.addClass('editing');
        $row.css('background-color', '#fffbe6');
        editingRow = $row;

        $row.find('td').each(function() {
            var $td = $(this);
            var col = $td.data('col');
            var val = $td.data('val');
            var isNull = $td.data('null');
            var inputVal = isNull ? '' : val;
            $td.html('<input type="text" class="data-cell-input" data-col="' + col + '" value="' + String(inputVal).replace(/"/g, '&quot;') + '" placeholder="NULL" style="width:100%;padding:1px 3px;border:1px solid #409eff;border-radius:2px;font-size:12px;height:24px;box-sizing:border-box;">');
        });

        // 聚焦第一个输入框
        $row.find('input:first').focus();
    });

    // 点击其他地方保存
    $(document).on('click', function(e) {
        if (!editingRow) return;
        if ($(e.target).closest('.editing').length > 0) return;
        saveEditingRow(editingRow);
        editingRow = null;
    });
}

function saveEditingRow($row) {
    if (!$row || !$row.hasClass('editing')) return;

    var rowIdx = $row.data('row-idx');
    var origRow = _dataCtx.rows[rowIdx];
    var cols = _dataCtx.cols;
    var newValues = {};
    var changed = false;

    $row.find('input.data-cell-input').each(function() {
        var col = $(this).data('col');
        var newVal = $(this).val();
        var origVal = origRow[col];
        var origStr = (origVal === null || origVal === undefined) ? '' : String(origVal);
        newValues[col] = newVal;
        if (newVal !== origStr) changed = true;
    });

    // 退出编辑模式，恢复显示
    $row.removeClass('editing');
    $row.css('background-color', '');
    $row.find('td').each(function() {
        var $td = $(this);
        var col = $td.data('col');
        var val = newValues[col];
        if (val === '' || val === undefined) {
            $td.data('val', '');
            $td.data('null', true);
            $td.html('<span style="color:#ccc;">NULL</span>');
        } else {
            $td.data('val', val);
            $td.data('null', false);
            $td.html(val);
        }
    });

    if (!changed) return;

    // 构建 UPDATE SQL
    var setClauses = [];
    var whereClauses = [];
    cols.forEach(function(col) {
        var origVal = origRow[col];
        var newVal = newValues[col];
        var origStr = (origVal === null || origVal === undefined) ? '' : String(origVal);
        // SET
        if (newVal !== origStr) {
            if (newVal === '') {
                setClauses.push('`' + col + '` = NULL');
            } else {
                setClauses.push('`' + col + "` = '" + newVal.replace(/'/g, "\\'") + "'");
            }
        }
        // WHERE (用所有原始值定位行)
        if (origVal === null || origVal === undefined) {
            whereClauses.push('`' + col + '` IS NULL');
        } else {
            whereClauses.push('`' + col + "` = '" + String(origVal).replace(/'/g, "\\'") + "'");
        }
    });

    var sql = 'UPDATE ' + _dataCtx.dbName + '.' + _dataCtx.tableName + ' SET ' + setClauses.join(', ') + ' WHERE ' + whereClauses.join(' AND ') + ' LIMIT 1';

    $.ajax({
        url: "/webdb/db/mysql/executeUpdate",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ title: _dataCtx.title, sql: sql }),
        success: function(result) {
            if (result.code === 0) {
                // 更新本地缓存
                cols.forEach(function(col) {
                    origRow[col] = newValues[col] === '' ? null : newValues[col];
                });
                layer.msg('保存成功');
            } else {
                layer.msg('保存失败: ' + (result.msg || '未知错误'), { icon: 2, time: 3000 });
            }
        },
        error: function() {
            layer.msg('请求失败', { icon: 2 });
        }
    });
}

// 执行 SQL 查询
function runQuery() {
    // 找到当前活跃的查询 tab
    var activeTab = $('.tab-item.active').data('tab');
    var $sqlInput, $result, $info;
    
    if (activeTab === 'query') {
        $sqlInput = $('#sqlInput');
        $result = $('#queryResult');
        $info = $('#queryInfo');
    } else if (activeTab && activeTab.startsWith('query-')) {
        $sqlInput = $('.sqlInput[data-tab="' + activeTab + '"]');
        $result = $('.queryResult[data-tab="' + activeTab + '"]');
        $info = $('#queryInfo-' + activeTab);
    } else {
        layer.msg('请先切换到查询标签页');
        return;
    }

    var sql = $sqlInput.val().trim();
    if (!sql) { layer.msg('请输入 SQL 语句'); return; }

    var zTree = $.fn.zTree.getZTreeObj("sessionTree");
    var title = null;
    if (zTree) {
        zTree.getNodes().forEach(function(n) { if (n.connected) title = n.title; });
    }
    if (!title) { layer.msg('请先连接一个数据库'); return; }

    $result.html('<div style="padding:10px;color:#999;">正在执行...</div>');
    $info.text('');

    var isSelect = sql.toUpperCase().trimStart().startsWith('SELECT') || sql.toUpperCase().trimStart().startsWith('SHOW') || sql.toUpperCase().trimStart().startsWith('DESC');
    var url = isSelect ? "/webdb/db/mysql/executeQuery" : "/webdb/db/mysql/executeUpdate";

    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ title: title, sql: sql }),
        success: function(result) {
            if (result.code === 0 && result.data) {
                if (isSelect) {
                    var rows = result.data.data || [];
                    var count = result.data.count || 0;
                    var duration = result.data.duration || 0;
                    $info.text(count + ' 行, ' + duration + ' 秒');

                    if (rows.length === 0) {
                        $result.html('<div style="padding:10px;color:#999;">查询结果为空</div>');
                        return;
                    }
                    var cols = [];
                    for (var key in rows[0]) { if (rows[0].hasOwnProperty(key)) cols.push(key); }

                    var html = '<div style="overflow:auto;max-height:calc(100vh - 280px);">';
                    html += '<table class="layui-table" lay-size="sm" style="margin:0;">';
                    html += '<thead><tr>';
                    cols.forEach(function(col) { html += '<th style="white-space:nowrap;">' + col + '</th>'; });
                    html += '</tr></thead><tbody>';
                    rows.forEach(function(row) {
                        html += '<tr>';
                        cols.forEach(function(col) {
                            var val = row[col];
                            if (val === null || val === undefined) val = '<span style="color:#ccc;">NULL</span>';
                            html += '<td style="white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + val + '</td>';
                        });
                        html += '</tr>';
                    });
                    html += '</tbody></table></div>';
                    $result.html(html);
                } else {
                    var affected = result.data.affectedRows || 0;
                    var duration = result.data.duration || 0;
                    $info.text('影响 ' + affected + ' 行, ' + duration + ' 秒');
                    $result.html('<div style="padding:10px;color:#28a745;">执行成功，影响 ' + affected + ' 行</div>');
                }
            } else {
                $result.html('<div style="padding:10px;color:#dc3545;">' + (result.msg || '执行失败') + '</div>');
            }
        },
        error: function() {
            $result.html('<div style="padding:10px;color:#dc3545;">请求失败</div>');
        }
    });
}

function clearQuery() {
    $('#sqlInput').val('');
    $('#queryResult').html('<div class="empty-state" style="padding:30px 0;"><p style="color:#999;">输入 SQL 语句并执行</p></div>');
    $('#queryInfo').text('');
}

// 初始化数据库对象树（保留兼容）
function initDatabaseTree() {
    // 数据库对象树现在集成在会话树中
}
