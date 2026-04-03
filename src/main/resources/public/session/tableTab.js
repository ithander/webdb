// ========== 表结构 Tab ==========
var MYSQL_TYPES = [
    'int','bigint','smallint','tinyint','mediumint',
    'decimal','float','double',
    'varchar','char','text','mediumtext','longtext','tinytext',
    'date','datetime','timestamp','time','year',
    'blob','mediumblob','longblob','tinyblob',
    'json','enum','set','bit','boolean'
];

function buildTypeSelect(currentType) {
    var baseType = currentType.replace(/\(.*\)/, '').trim().toLowerCase();
    var lengthMatch = currentType.match(/\(([^)]+)\)/);
    var length = lengthMatch ? lengthMatch[1] : '';
    var html = '<div style="display:flex;align-items:center;gap:3px;">';
    html += '<select class="struct-type-select" style="padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
    MYSQL_TYPES.forEach(function(t) { html += '<option value="' + t + '"' + (t === baseType ? ' selected' : '') + '>' + t + '</option>'; });
    html += '</select>';
    html += '<input type="text" class="struct-type-length" value="' + length + '" placeholder="长度" style="width:50px;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
    html += '</div>';
    return html;
}

var MYSQL_CHARSETS = ['utf8mb4','utf8','latin1','gbk','gb2312','big5','ascii','binary','utf16','utf32'];
var MYSQL_ENGINES = ['InnoDB','MyISAM','MEMORY','CSV','ARCHIVE','BLACKHOLE','MERGE','FEDERATED','NDB'];

function loadTableStructure(title, dbName, tableName) {
    var $view = $('#structureView');
    $view.html('<div style="padding:10px;color:#999;">正在加载表结构...</div>');
    // 获取当前连接的dbtype
    var dbtype = '';
    var zTree = $.fn.zTree.getZTreeObj("sessionTree");
    if (zTree) { zTree.getNodes().forEach(function(n) { if (n.title === title) dbtype = n.dbtype || ''; }); }

    // 先获取表信息（引擎、字符集），再获取字段
    var tableInfo = {};
    var afterInfo = function() {
        $.ajax({ url: "/webdb/session/columns", type: "GET", data: { title: title, dbName: dbName, tableName: tableName },
            success: function(result) {
                if (result.code === 0 && result.data && result.data.length > 0) {
                    var html = '';
                    // 表名编辑区
                    html += '<div style="padding:8px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
                    html += '<label style="font-size:12px;color:#666;">表名:</label>';
                    html += '<input id="structTableName" type="text" value="' + tableName + '" style="padding:3px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;width:160px;">';
                    if (dbtype === 'mysql' || dbtype === 'mariadb') {
                        html += '<label style="font-size:12px;color:#666;margin-left:10px;">字符集:</label>';
                        html += '<select id="structCharset" style="padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
                        MYSQL_CHARSETS.forEach(function(c) { html += '<option value="' + c + '"' + (c === (tableInfo.charset || 'utf8mb4') ? ' selected' : '') + '>' + c + '</option>'; });
                        html += '</select>';
                        html += '<label style="font-size:12px;color:#666;margin-left:10px;">引擎:</label>';
                        html += '<select id="structEngine" style="padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;">';
                        MYSQL_ENGINES.forEach(function(e) { html += '<option value="' + e + '"' + (e === (tableInfo.engine || 'InnoDB') ? ' selected' : '') + '>' + e + '</option>'; });
                        html += '</select>';
                    }
                    html += '</div>';
                    // 操作栏
                    html += '<div style="padding:5px 8px;font-size:13px;color:#666;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">';
                    html += '<span>📋 ' + tableName + ' (' + result.data.length + ' 个字段)</span>';
                    html += '<div style="display:flex;gap:5px;">';
                    html += '<button class="layui-btn layui-btn-sm" onclick="addStructField(\'' + title + '\',\'' + dbName + '\',\'' + tableName + '\')">+ 新增字段</button>';
                    html += '<button class="layui-btn layui-btn-sm layui-btn-normal" onclick="saveTableStructure(\'' + title + '\',\'' + dbName + '\',\'' + tableName + '\')">保存修改</button>';
                    html += '</div></div>';
                    html += '<table class="layui-table" lay-size="sm" style="margin:0;"><thead><tr>';
                    html += '<th style="width:30px;">#</th><th>字段名</th><th>类型</th><th>默认值</th><th style="width:70px;">允许NULL</th><th style="width:50px;">主键</th><th style="width:50px;">唯一</th><th>备注</th><th style="width:50px;">操作</th>';
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
                        html += '<td style="text-align:center;"><a style="color:#dc3545;cursor:pointer;font-size:12px;" onclick="deleteStructField(this,\'' + title + '\',\'' + dbName + '\',\'' + tableName + '\',\'' + col.colunmName + '\')">删除</a></td>';
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                    $view.html(html);
                    window._originalColumns = result.data.map(function(col) {
                        return { colunmName: col.colunmName, columnType: col.columnType, primaryKey: col.primaryKey, unique: col.unique, nullable: col.nullable, defaultValue: col.defaultValue || '', opt: col.opt || '' };
                    });
                    window._structTableInfo = { title: title, dbName: dbName, tableName: tableName, dbtype: dbtype, charset: tableInfo.charset, engine: tableInfo.engine };
                } else { $view.html('<div class="empty-state"><p>未找到字段信息</p></div>'); }
            },
            error: function() { $view.html('<div class="empty-state"><p>加载失败</p></div>'); }
        });
    };

    // MySQL/MariaDB: 先查表状态获取引擎和字符集
    if (dbtype === 'mysql' || dbtype === 'mariadb') {
        $.ajax({ url: "/webdb/db/mysql/executeQuery", type: "POST", contentType: "application/json",
            data: JSON.stringify({ title: title, sql: "SHOW TABLE STATUS FROM `" + dbName + "` LIKE '" + tableName + "'" }),
            success: function(r) {
                if (r.code === 0 && r.data && r.data.data && r.data.data.length > 0) {
                    var row = r.data.data[0];
                    tableInfo.engine = row.Engine || row.engine || '';
                    var collation = row.Collation || row.collation || '';
                    tableInfo.charset = collation ? collation.split('_')[0] : '';
                }
                afterInfo();
            },
            error: function() { afterInfo(); }
        });
    } else { afterInfo(); }
}

function addStructField(title, dbName, tableName) {
    var $tbody = $('#structureView table tbody');
    var rowCount = $tbody.find('tr').length + 1;
    var html = '<tr data-col="" data-new="true" style="background-color:#f0fff0;">';
    html += '<td style="color:#28a745;font-weight:bold;">' + rowCount + '</td>';
    html += '<td><input type="text" class="struct-field-name" value="" placeholder="字段名" style="width:100%;padding:2px 4px;border:1px solid #28a745;border-radius:3px;font-size:12px;height:26px;"></td>';
    html += '<td>' + buildTypeSelect('varchar(255)') + '</td>';
    html += '<td><input type="text" class="struct-default" value="" style="width:100%;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;"></td>';
    html += '<td style="text-align:center;"><input type="checkbox" class="struct-nullable" checked></td>';
    html += '<td style="text-align:center;"><input type="checkbox" class="struct-pk"></td>';
    html += '<td style="text-align:center;"><input type="checkbox" class="struct-unique"></td>';
    html += '<td><input type="text" class="struct-comment" value="" style="width:100%;padding:2px 4px;border:1px solid #ddd;border-radius:3px;font-size:12px;height:26px;"></td>';
    html += '<td style="text-align:center;"><a style="color:#999;cursor:pointer;font-size:12px;" onclick="$(this).closest(\'tr\').remove();">取消</a></td>';
    html += '</tr>';
    $tbody.append(html);
    $tbody.find('tr:last .struct-field-name').focus();
}

function deleteStructField(el, title, dbName, tableName, colName) {
    layer.confirm('确定删除字段 <b>' + colName + '</b> ？', function(idx) {
        layer.close(idx);
        $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
            data: JSON.stringify({ title: title, sql: 'ALTER TABLE ' + dbName + '.' + tableName + ' DROP COLUMN `' + colName + '`' }),
            success: function(r) { if (r.code === 0) { layer.msg('字段已删除'); loadTableStructure(title, dbName, tableName); } else { layer.msg('删除失败: ' + (r.msg || '')); } },
            error: function() { layer.msg('请求失败'); }
        });
    });
}

function saveTableStructure(title, dbName, tableName) {
    var columns = [], newColumns = [];
    $('#structureView tbody tr').each(function() {
        var $row = $(this);
        var baseType = $row.find('.struct-type-select').val();
        var length = $row.find('.struct-type-length').val();
        var fullType = length ? baseType + '(' + length + ')' : baseType;
        var col = { colunmName: $row.find('.struct-field-name').val(), columnType: fullType, primaryKey: $row.find('.struct-pk').is(':checked'), unique: $row.find('.struct-unique').is(':checked'), nullable: $row.find('.struct-nullable').is(':checked'), defaultValue: $row.find('.struct-default').val(), opt: $row.find('.struct-comment').val() };
        if ($row.data('new')) { if (col.colunmName && col.colunmName.trim()) newColumns.push(col); }
        else { columns.push(col); }
    });
    if (!window._originalColumns) { layer.msg('无法获取原始字段信息'); return; }

    var info = window._structTableInfo || {};
    var pendingAlters = [];

    // 表名修改
    var newTableName = ($('#structTableName').val() || '').trim();
    if (newTableName && newTableName !== tableName) {
        pendingAlters.push('ALTER TABLE ' + dbName + '.' + tableName + ' RENAME TO ' + dbName + '.' + newTableName);
    }
    var effectiveTable = (newTableName && newTableName !== tableName) ? newTableName : tableName;

    // MySQL: 字符集和引擎修改
    if (info.dbtype === 'mysql' || info.dbtype === 'mariadb') {
        var newCharset = $('#structCharset').val();
        var newEngine = $('#structEngine').val();
        var alterParts = [];
        if (newEngine && newEngine !== info.engine) alterParts.push('ENGINE = ' + newEngine);
        if (newCharset && newCharset !== info.charset) alterParts.push('DEFAULT CHARSET = ' + newCharset);
        if (alterParts.length > 0) pendingAlters.push('ALTER TABLE ' + dbName + '.' + effectiveTable + ' ' + alterParts.join(', '));
    }

    // 先执行表级别修改，再执行字段修改
    var runAlters = function(idx) {
        if (idx >= pendingAlters.length) { doFieldChanges(); return; }
        $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
            data: JSON.stringify({ title: title, sql: pendingAlters[idx] }),
            success: function(r) { if (r.code !== 0) layer.msg('执行失败: ' + (r.msg || '')); runAlters(idx + 1); },
            error: function() { layer.msg('请求失败'); runAlters(idx + 1); }
        });
    };

    var doFieldChanges = function() {
        var addPending = newColumns.length;
        var addDone = function() {
            $.ajax({ url: "/webdb/session/alterTable", type: "POST", contentType: "application/json",
                data: JSON.stringify({ title: title, dbName: dbName, tableName: effectiveTable, columns: columns, originalColumns: window._originalColumns }),
                success: function(result) {
                    if (result.code === 0) {
                        var data = result.data;
                        var msg = (typeof data === 'string') ? data : '修改成功，执行了 ' + data.count + ' 条语句';
                        if (newColumns.length > 0) msg = '新增 ' + newColumns.length + ' 个字段，' + msg;
                        if (effectiveTable !== tableName) msg = '表已重命名为 ' + effectiveTable + '，' + msg;
                        layer.msg(msg);
                        loadTableStructure(title, dbName, effectiveTable);
                        if (effectiveTable !== tableName) refreshTree();
                    } else { layer.msg(result.msg || '修改失败'); }
                },
                error: function() { layer.msg('请求失败'); }
            });
        };
        if (newColumns.length === 0) { addDone(); return; }
        var addErrors = [];
        newColumns.forEach(function(col) {
            var sql = 'ALTER TABLE ' + dbName + '.' + effectiveTable + ' ADD COLUMN `' + col.colunmName + '` ' + col.columnType;
            if (!col.nullable) sql += ' NOT NULL'; else sql += ' NULL';
            if (col.defaultValue) sql += " DEFAULT '" + col.defaultValue.replace(/'/g, "\\'") + "'";
            if (col.opt) sql += " COMMENT '" + col.opt.replace(/'/g, "\\'") + "'";
            $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json", data: JSON.stringify({ title: title, sql: sql }),
                success: function(r) { if (r.code !== 0) addErrors.push(col.colunmName + ': ' + (r.msg || '')); addPending--; if (addPending === 0) { if (addErrors.length > 0) layer.msg('部分字段添加失败'); addDone(); } },
                error: function() { addErrors.push(col.colunmName + ': 请求失败'); addPending--; if (addPending === 0) addDone(); }
            });
        });
    };

    if (pendingAlters.length > 0) runAlters(0);
    else doFieldChanges();
}
