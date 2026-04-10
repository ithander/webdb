// ========== 数据 Tab ==========
var _dataCtx = {};
var _dataPager = { page: 1, pageSize: 50, total: 0 };
var _dataSort = { col: null, dir: null }; // 排序状态: col=列名, dir='ASC'|'DESC'|null

function loadTableData(title, dbName, tableName, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || _dataPager.pageSize || 50;
    _dataPager.page = page;
    _dataPager.pageSize = pageSize;
    var $view = $('#dataView');
    $view.html('<div style="padding:10px;color:#999;">正在加载数据...</div>');
    var countSql = 'SELECT COUNT(*) AS cnt FROM ' + dbName + '.' + tableName;
    var dbtype = _getDbtype(title);
    var dataSql = 'SELECT * FROM ' + dbName + '.' + tableName;
    if (_dataSort.col) dataSql += ' ORDER BY ' + _q(dbtype) + _dataSort.col + _q(dbtype) + ' ' + _dataSort.dir;
    dataSql = _pageSql(dbtype, dataSql, pageSize, (page - 1) * pageSize);
    $.ajax({ url: "/webdb/db/mysql/executeQuery", type: "POST", contentType: "application/json", data: JSON.stringify({ title: title, sql: countSql }),
        success: function(countResult) {
            var total = 0;
            if (countResult.code === 0 && countResult.data && countResult.data.data && countResult.data.data.length > 0) total = countResult.data.data[0].cnt || 0;
            _dataPager.total = total;
            $.ajax({ url: "/webdb/db/mysql/executeQuery", type: "POST", contentType: "application/json", data: JSON.stringify({ title: title, sql: dataSql }),
                success: function(result) {
                    if (result.code === 0 && result.data && result.data.data && result.data.data.length > 0) {
                        var rows = result.data.data, duration = result.data.duration, cols = [];
                        for (var key in rows[0]) { if (rows[0].hasOwnProperty(key)) cols.push(key); }
                        _dataCtx = { title: title, dbName: dbName, tableName: tableName, cols: cols, dbtype: dbtype };
                        var startIdx = (page - 1) * pageSize;
                        var html = '<div style="padding:5px 8px;font-size:13px;color:#666;border-bottom:1px solid #eee;">📊 ' + tableName + ' (共 ' + total + ' 行, ' + duration + ' 秒) <span style="color:#999;font-size:11px;">双击行可编辑</span></div>';
                        html += '<div style="overflow:auto;max-height:calc(100vh - 230px);"><table class="layui-table data-edit-table" lay-size="sm" style="margin:0;"><thead><tr>';
                        html += '<th style="white-space:nowrap;width:40px;color:#999;">#</th>';
                        cols.forEach(function(col) {
                            var arrow = '', style = 'white-space:nowrap;cursor:pointer;user-select:none;';
                            if (_dataSort.col === col) { arrow = _dataSort.dir === 'ASC' ? ' ▲' : ' ▼'; style += 'color:#409eff;'; }
                            html += '<th data-sort-col="' + col + '" style="' + style + '">' + col + '<span style="font-size:10px;">' + arrow + '</span></th>';
                        });
                        html += '</tr></thead><tbody>';
                        rows.forEach(function(row, idx) {
                            html += '<tr data-row-idx="' + idx + '"><td style="color:#999;text-align:center;">' + (startIdx + idx + 1) + '</td>';
                            cols.forEach(function(col) {
                                var val = row[col], isNull = (val === null || val === undefined);
                                var display = isNull ? '<span style="color:#ccc;">NULL</span>' : val;
                                var raw = isNull ? '' : String(val).replace(/"/g, '&quot;');
                                html += '<td data-col="' + col + '" data-val="' + raw + '" data-null="' + isNull + '" style="white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + display + '</td>';
                            });
                            html += '</tr>';
                        });
                        html += '</tbody></table></div><div id="dataPagerBox" style="padding:5px 8px;border-top:1px solid #eee;"></div>';
                        $view.html(html);
                        _dataCtx.rows = rows;
                        bindDataRowEdit();
                        bindDataSortHeaders();
                        if (typeof updateExportBtn === 'function') updateExportBtn();
                        layui.laypage.render({ elem: 'dataPagerBox', count: total, curr: page, limit: pageSize, limits: [50, 100, 200, 500], layout: ['count', 'prev', 'page', 'next', 'limit', 'skip'],
                            jump: function(obj, first) { if (!first) loadTableData(title, dbName, tableName, obj.curr, obj.limit); }
                        });
                    } else if (total === 0) {
                        // 表为空，但仍显示列名和右键菜单
                        $.ajax({ url: "/webdb/session/columns", type: "GET", data: { title: title, dbName: dbName, tableName: tableName },
                            success: function(colResult) {
                                var cols = [];
                                if (colResult.code === 0 && colResult.data) { colResult.data.forEach(function(c) { cols.push(c.colunmName); }); }
                                _dataCtx = { title: title, dbName: dbName, tableName: tableName, cols: cols, rows: [], dbtype: dbtype };
                                var html = '<div style="padding:5px 8px;font-size:13px;color:#666;border-bottom:1px solid #eee;">📊 ' + tableName + ' (共 0 行)</div>';
                                html += '<div style="overflow:auto;max-height:calc(100vh - 230px);"><table class="layui-table data-edit-table" lay-size="sm" style="margin:0;"><thead><tr>';
                                html += '<th style="white-space:nowrap;width:40px;color:#999;">#</th>';
                                cols.forEach(function(col) { html += '<th style="white-space:nowrap;">' + col + '</th>'; });
                                html += '</tr></thead><tbody>';
                                html += '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;color:#999;padding:20px;">表中没有数据</td></tr>';
                                html += '</tbody></table></div>';
                                $view.html(html);
                                bindDataContextMenu($('#dataView .data-edit-table tbody'));
                            },
                            error: function() { $view.html('<div class="empty-state"><p>加载列信息失败</p></div>'); }
                        });
                    }
                    else { $view.html('<div class="empty-state"><p>' + (result.msg || '加载失败') + '</p></div>'); }
                },
                error: function() { $view.html('<div class="empty-state"><p>请求失败</p></div>'); }
            });
        },
        error: function() { $view.html('<div class="empty-state"><p>请求失败</p></div>'); }
    });
}

function bindDataSortHeaders() {
    $('#dataView .data-edit-table thead th[data-sort-col]').on('click', function() {
        var col = $(this).data('sort-col');
        if (_dataSort.col === col) {
            if (_dataSort.dir === 'ASC') _dataSort.dir = 'DESC';
            else if (_dataSort.dir === 'DESC') { _dataSort.col = null; _dataSort.dir = null; }
        } else { _dataSort.col = col; _dataSort.dir = 'ASC'; }
        loadTableData(_dataCtx.title, _dataCtx.dbName, _dataCtx.tableName, 1, _dataPager.pageSize);
    });
}

function bindDataRowEdit() {
    var $tbody = $('#dataView .data-edit-table tbody');
    var editingRow = null;
    $tbody.on('click', 'td', function(e) {
        var $td = $(this), $row = $td.closest('tr');
        $tbody.find('td').removeClass('cell-highlight');
        $tbody.find('tr').removeClass('row-highlight');
        if (!$td.data('col')) { $row.addClass('row-highlight'); var range = document.createRange(); range.selectNodeContents($row[0]); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
        else { $td.addClass('cell-highlight'); var range = document.createRange(); range.selectNodeContents($td[0]); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
    });
    $tbody.on('dblclick', 'tr', function() {
        var $row = $(this);
        if ($row.hasClass('editing')) return;
        if (editingRow) saveEditingRow(editingRow);
        $row.addClass('editing').css('background-color', '#fffbe6');
        editingRow = $row;
        $row.find('td').each(function() {
            var $td = $(this), col = $td.data('col');
            if (!col) return;
            var val = $td.data('val'), isNull = $td.data('null'), inputVal = isNull ? '' : val;
            $td.html('<input type="text" class="data-cell-input" data-col="' + col + '" value="' + String(inputVal).replace(/"/g, '&quot;') + '" placeholder="NULL" style="width:100%;padding:1px 3px;border:1px solid #409eff;border-radius:2px;font-size:12px;height:24px;box-sizing:border-box;">');
        });
        $row.find('input:first').focus();
    });
    $(document).on('click', function(e) {
        if (!editingRow) return;
        if ($(e.target).closest('.editing').length > 0) return;
        if ($(e.target).closest('#dataContextMenu').length > 0) return;
        saveEditingRow(editingRow); editingRow = null;
    });
    bindDataContextMenu($tbody);
}

function saveEditingRow($row) {
    if (!$row || !$row.hasClass('editing')) return;
    var rowIdx = $row.data('row-idx'), origRow = _dataCtx.rows[rowIdx], cols = _dataCtx.cols, newValues = {}, changed = false;
    $row.find('input.data-cell-input').each(function() {
        var col = $(this).data('col'), newVal = $(this).val(), origVal = origRow[col];
        var origStr = (origVal === null || origVal === undefined) ? '' : String(origVal);
        newValues[col] = newVal; if (newVal !== origStr) changed = true;
    });
    $row.removeClass('editing').css('background-color', '');
    $row.find('td').each(function() {
        var $td = $(this), col = $td.data('col');
        if (!col) return;
        var val = newValues[col];
        if (val === '' || val === undefined) { $td.data('val', '').data('null', true).html('<span style="color:#ccc;">NULL</span>'); }
        else { $td.data('val', val).data('null', false).html(val); }
    });
    if (!changed) return;
    var dbtype = _dataCtx.dbtype || 'mysql';
    var q = _q(dbtype);
    var setClauses = [], whereClauses = [];
    cols.forEach(function(col) {
        var origVal = origRow[col], newVal = newValues[col], origStr = (origVal === null || origVal === undefined) ? '' : String(origVal);
        if (newVal !== origStr) { setClauses.push(newVal === '' ? q + col + q + ' = NULL' : q + col + q + " = '" + _escVal(dbtype, newVal) + "'"); }
        whereClauses.push(origVal === null || origVal === undefined ? q + col + q + ' IS NULL' : q + col + q + " = '" + _escVal(dbtype, String(origVal)) + "'");
    });
    var sql = _updateSql(dbtype, _dataCtx.dbName, _dataCtx.tableName, setClauses, whereClauses);
    $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json", data: JSON.stringify({ title: _dataCtx.title, sql: sql }),
        success: function(result) { if (result.code === 0) { cols.forEach(function(col) { origRow[col] = newValues[col] === '' ? null : newValues[col]; }); layer.msg('保存成功'); } else { layer.msg('保存失败: ' + (result.msg || '')); } },
        error: function() { layer.msg('请求失败'); }
    });
}

function bindDataContextMenu($tbody) {
    if ($('#dataContextMenu').length === 0) {
        var items = [
            { id: 'ctx-copy', text: '复制', icon: '📋' },
            { id: 'ctx-copy-as', text: '复制为', icon: '📄', children: [
                { id: 'ctx-copy-excel', text: 'Excel CSV' }, { id: 'ctx-copy-delimited', text: 'Delimited Text' }, { id: 'ctx-copy-html', text: 'HTML Table' }, { type: 'sep' },
                { id: 'ctx-copy-insert', text: 'SQL Inserts' }, { id: 'ctx-copy-replace', text: 'SQL Replace' }, { id: 'ctx-copy-update', text: 'SQL Updates' }, { type: 'sep' },
                { id: 'ctx-copy-json', text: 'JSON' }, { id: 'ctx-copy-jsonline', text: 'JSON Line' }
            ]},
            { type: 'sep' },
            { id: 'ctx-insert', text: '插入记录行', icon: '➕' }, { id: 'ctx-copy-row-nopk', text: '不带主键复制行', icon: '📑' }, { id: 'ctx-copy-row-pk', text: '带主键复制行', icon: '📑' },
            { id: 'ctx-submit', text: '提交', icon: '✅' }, { id: 'ctx-cancel-edit', text: '取消编辑', icon: '↩️' }, { id: 'ctx-delete-row', text: '删除记录行', icon: '🗑️' },
            { type: 'sep' }, { id: 'ctx-export', text: '导出数据', icon: '📥' }, { id: 'ctx-refresh', text: '刷新', icon: '🔄' }
        ];
        var menuHtml = '<div id="dataContextMenu" style="display:none;position:fixed;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:180px;padding:4px 0;font-size:13px;">';
        items.forEach(function(item) {
            if (item.type === 'sep') { menuHtml += '<div style="border-top:1px solid #eee;margin:4px 0;"></div>'; }
            else if (item.children) {
                menuHtml += '<div class="ctx-menu-item ctx-has-sub" data-action="' + item.id + '" style="padding:5px 15px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:space-between;position:relative;">';
                menuHtml += '<span style="display:flex;align-items:center;gap:8px;"><span style="width:18px;text-align:center;">' + (item.icon||'') + '</span><span>' + item.text + '</span></span><span style="color:#999;">▶</span>';
                menuHtml += '<div class="ctx-submenu" style="display:none;position:absolute;left:100%;top:-4px;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:160px;padding:4px 0;z-index:100000;">';
                item.children.forEach(function(sub) { if (sub.type === 'sep') menuHtml += '<div style="border-top:1px solid #eee;margin:4px 0;"></div>'; else menuHtml += '<div class="ctx-menu-item ctx-sub-item" data-action="' + sub.id + '" style="padding:5px 15px;cursor:pointer;white-space:nowrap;">' + sub.text + '</div>'; });
                menuHtml += '</div></div>';
            } else { menuHtml += '<div class="ctx-menu-item" data-action="' + item.id + '" style="padding:5px 15px;cursor:pointer;display:flex;align-items:center;gap:8px;"><span style="width:18px;text-align:center;">' + (item.icon||'') + '</span><span>' + item.text + '</span></div>'; }
        });
        menuHtml += '</div>';
        $('body').append(menuHtml);
        $(document).on('mouseenter', '.ctx-menu-item', function() { $(this).css('background', '#f0f0f0'); });
        $(document).on('mouseleave', '.ctx-menu-item', function() { $(this).css('background', ''); });
        $(document).on('mouseenter', '.ctx-has-sub', function() { $(this).find('.ctx-submenu').show(); });
        $(document).on('mouseleave', '.ctx-has-sub', function() { $(this).find('.ctx-submenu').hide(); });
        $(document).on('click', '.ctx-menu-item', function() { var action = $(this).data('action'); $('#dataContextMenu').hide(); handleDataContextAction(action); });
        $(document).on('click', function(e) { if (!$(e.target).closest('#dataContextMenu').length) $('#dataContextMenu').hide(); });
    }
    $tbody.on('contextmenu', 'td', function(e) {
        e.preventDefault();
        window._ctxTarget = { $td: $(this), $row: $(this).closest('tr'), rowIdx: $(this).closest('tr').data('row-idx') };
        $('#dataContextMenu').css({ left: e.clientX, top: e.clientY }).show();
    });
}

function handleDataContextAction(action) {
    var ctx = window._ctxTarget; if (!ctx) return;
    var $row = ctx.$row, rowIdx = ctx.rowIdx;
    switch(action) {
        case 'ctx-copy': { var text = ctx.$td.data('col') ? (ctx.$td.data('null') === true ? '' : ctx.$td.data('val')) : ctx.$td.text(); navigator.clipboard.writeText(text).then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-copy-as': break;
        case 'ctx-copy-excel': { copyRowAs('CSV', rowIdx); } break;
        case 'ctx-copy-delimited': { var row = _dataCtx.rows[rowIdx]; if (!row) return; navigator.clipboard.writeText(_dataCtx.cols.map(function(c) { var v = row[c]; return v === null ? '' : String(v); }).join('\t')).then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-copy-html': { var row = _dataCtx.rows[rowIdx]; if (!row) return; var h = '<table border="1"><tr>' + _dataCtx.cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr><tr>' + _dataCtx.cols.map(function(c) { return '<td>' + (row[c] === null ? '' : row[c]) + '</td>'; }).join('') + '</tr></table>'; navigator.clipboard.writeText(h).then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-copy-insert': { copyRowAs('INSERT SQL', rowIdx); } break;
        case 'ctx-copy-replace': { var row = _dataCtx.rows[rowIdx]; if (!row) return; var dt = _dataCtx.dbtype || 'mysql'; var q = _q(dt); var c = _dataCtx.cols.map(function(c) { return q + c + q; }).join(', '); var v = _dataCtx.cols.map(function(c) { var val = row[c]; return val === null ? 'NULL' : "'" + _escVal(dt, String(val)) + "'"; }).join(', '); navigator.clipboard.writeText('REPLACE INTO ' + _dataCtx.dbName + '.' + _dataCtx.tableName + ' (' + c + ') VALUES (' + v + ');').then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-copy-update': { var row = _dataCtx.rows[rowIdx]; if (!row) return; var dt = _dataCtx.dbtype || 'mysql'; var q = _q(dt); var s = _dataCtx.cols.map(function(c) { var v = row[c]; return q + c + q + ' = ' + (v === null ? 'NULL' : "'" + _escVal(dt, String(v)) + "'"); }).join(', '); navigator.clipboard.writeText('UPDATE ' + _dataCtx.dbName + '.' + _dataCtx.tableName + ' SET ' + s + ' WHERE 1=1;').then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-copy-json': { copyRowAs('JSON', rowIdx); } break;
        case 'ctx-copy-jsonline': { var row = _dataCtx.rows[rowIdx]; if (row) navigator.clipboard.writeText(JSON.stringify(row)).then(function() { layer.msg('已复制'); }); } break;
        case 'ctx-insert': { insertNewDataRow(rowIdx); } break;
        case 'ctx-copy-row-nopk': { var row = _dataCtx.rows[rowIdx]; if (!row) return; var vals = {}; _dataCtx.cols.forEach(function(c) { vals[c] = row[c]; }); $('#structureView tbody tr').each(function() { if ($(this).find('.struct-pk').is(':checked')) delete vals[$(this).find('.struct-field-name').val()]; }); navigator.clipboard.writeText(JSON.stringify(vals, null, 2)).then(function() { layer.msg('已复制(不含主键)'); }); } break;
        case 'ctx-copy-row-pk': { var row = _dataCtx.rows[rowIdx]; if (row) navigator.clipboard.writeText(JSON.stringify(row, null, 2)).then(function() { layer.msg('已复制(含主键)'); }); } break;
        case 'ctx-submit': { if ($row.hasClass('editing')) { saveEditingRow($row); } else { layer.msg('当前行未在编辑状态'); } } break;
        case 'ctx-cancel-edit': { if ($row.hasClass('editing')) { var origRow = _dataCtx.rows[rowIdx]; $row.removeClass('editing').css('background-color', ''); $row.find('td').each(function() { var $td = $(this), col = $td.data('col'); if (!col) return; var val = origRow[col], isNull = (val === null || val === undefined); $td.data('val', isNull ? '' : val).data('null', isNull).html(isNull ? '<span style="color:#ccc;">NULL</span>' : val); }); } } break;
        case 'ctx-delete-row': { var row = _dataCtx.rows[rowIdx]; if (!row) return; layer.confirm('确定删除该行数据？', function(idx) { layer.close(idx); var dt = _dataCtx.dbtype || 'mysql'; var q = _q(dt); var w = []; _dataCtx.cols.forEach(function(col) { var v = row[col]; w.push(v === null || v === undefined ? q + col + q + ' IS NULL' : q + col + q + " = '" + _escVal(dt, String(v)) + "'"); }); $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json", data: JSON.stringify({ title: _dataCtx.title, sql: _deleteSql(dt, _dataCtx.dbName, _dataCtx.tableName, w) }), success: function(r) { if (r.code === 0) { layer.msg('已删除'); loadTableData(_dataCtx.title, _dataCtx.dbName, _dataCtx.tableName, _dataPager.page, _dataPager.pageSize); } else { layer.msg('删除失败: ' + (r.msg || '')); } }, error: function() { layer.msg('请求失败'); } }); }); } break;
        case 'ctx-export': { if (!_dataCtx.rows || !_dataCtx.cols) return; var csv = _dataCtx.cols.join(',') + '\n'; _dataCtx.rows.forEach(function(row) { csv += _dataCtx.cols.map(function(c) { var v = row[c]; if (v === null || v === undefined) return ''; var s = String(v); return (s.indexOf(',') > -1 || s.indexOf('"') > -1) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',') + '\n'; }); var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = _dataCtx.tableName + '.csv'; a.click(); layer.msg('已导出'); } break;
        case 'ctx-refresh': { loadTableData(_dataCtx.title, _dataCtx.dbName, _dataCtx.tableName, _dataPager.page, _dataPager.pageSize); } break;
    }
}

function copyRowAs(format, rowIdx) {
    var row = _dataCtx.rows[rowIdx]; if (!row) return;
    var dt = _dataCtx.dbtype || 'mysql';
    var q = _q(dt);
    var text = '';
    if (format === 'JSON') text = JSON.stringify(row, null, 2);
    else if (format === 'CSV') { text = _dataCtx.cols.join(',') + '\n' + _dataCtx.cols.map(function(c) { var v = row[c]; return v === null ? '' : String(v); }).join(','); }
    else if (format === 'INSERT SQL') { var cols = _dataCtx.cols.map(function(c) { return q + c + q; }).join(', '); var vals = _dataCtx.cols.map(function(c) { var v = row[c]; return v === null || v === undefined ? 'NULL' : "'" + _escVal(dt, String(v)) + "'"; }).join(', '); text = 'INSERT INTO ' + _dataCtx.dbName + '.' + _dataCtx.tableName + ' (' + cols + ') VALUES (' + vals + ');'; }
    navigator.clipboard.writeText(text).then(function() { layer.msg('已复制为 ' + format); });
}

function insertNewDataRow(afterRowIdx) {
    var cols = _dataCtx.cols;
    if (!cols || cols.length === 0) { layer.msg('无列信息'); return; }
    var $tbody = $('#dataView .data-edit-table tbody');
    var $afterRow = (typeof afterRowIdx === 'number') ? $tbody.find('tr[data-row-idx="' + afterRowIdx + '"]') : null;

    var html = '<tr class="editing new-row" style="background-color:#f0fff0;">';
    html += '<td style="color:#28a745;text-align:center;font-weight:bold;">+</td>';
    cols.forEach(function(col) {
        html += '<td data-col="' + col + '"><input type="text" class="data-cell-input" data-col="' + col + '" value="" placeholder="NULL" style="width:100%;padding:1px 3px;border:1px solid #28a745;border-radius:2px;font-size:12px;height:24px;box-sizing:border-box;"></td>';
    });
    html += '</tr>';

    if ($afterRow && $afterRow.length) { $afterRow.after(html); }
    else { $tbody.append(html); }

    var $newRow = $tbody.find('tr.new-row').last();
    $newRow.find('input:first').focus();

    // 点击其它地方时保存
    setTimeout(function() {
        $(document).on('click.newrow', function(e) {
            if ($(e.target).closest('.new-row').length > 0) return;
            if ($(e.target).closest('#dataContextMenu').length > 0) return;
            $(document).off('click.newrow');
            saveNewRow($newRow);
        });
    }, 100);
}

function saveNewRow($row) {
    var cols = _dataCtx.cols;
    var values = {}, hasValue = false;
    $row.find('.data-cell-input').each(function() {
        var col = $(this).data('col'), val = $(this).val();
        values[col] = val;
        if (val !== '') hasValue = true;
    });
    if (!hasValue) { $row.remove(); return; }

    var colNames = [], colValues = [];
    var dbtype = _dataCtx.dbtype || 'mysql';
    var q = _q(dbtype);
    cols.forEach(function(col) {
        var val = values[col];
        if (val !== undefined && val !== '') {
            colNames.push(q + col + q);
            colValues.push("'" + _escVal(dbtype, val) + "'");
        }
    });
    if (colNames.length === 0) { $row.remove(); return; }

    var sql = 'INSERT INTO ' + _dataCtx.dbName + '.' + _dataCtx.tableName + ' (' + colNames.join(', ') + ') VALUES (' + colValues.join(', ') + ')';
    $.ajax({ url: "/webdb/db/mysql/executeUpdate", type: "POST", contentType: "application/json",
        data: JSON.stringify({ title: _dataCtx.title, sql: sql }),
        success: function(r) {
            if (r.code === 0) { layer.msg('插入成功'); loadTableData(_dataCtx.title, _dataCtx.dbName, _dataCtx.tableName, _dataPager.page, _dataPager.pageSize); }
            else { layer.msg('插入失败: ' + (r.msg || '')); }
        },
        error: function() { layer.msg('请求失败'); }
    });
}
