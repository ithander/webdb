// ========== 查询 Tab ==========
function runQuery() {
    var activeTab = $('.tab-item.active').data('tab');
    var $sqlInput, $result, $info;
    if (activeTab === 'query') { $sqlInput = $('#sqlInput'); $result = $('#queryResult'); $info = $('#queryInfo'); }
    else if (activeTab && activeTab.startsWith('query-')) { $sqlInput = $('.sqlInput[data-tab="' + activeTab + '"]'); $result = $('.queryResult[data-tab="' + activeTab + '"]'); $info = $('#queryInfo-' + activeTab); }
    else { layer.msg('请先切换到查询标签页'); return; }
    var sql = $sqlInput.val().trim();
    if (!sql) { layer.msg('请输入 SQL 语句'); return; }
    var zTree = $.fn.zTree.getZTreeObj("sessionTree"), title = null;
    if (zTree) { zTree.getNodes().forEach(function(n) { if (n.connected) title = n.title; }); }
    if (!title) { layer.msg('请先连接一个数据库'); return; }
    $result.html('<div style="padding:10px;color:#999;">正在执行...</div>');
    $info.text('');
    var isSelect = sql.toUpperCase().trimStart().startsWith('SELECT') || sql.toUpperCase().trimStart().startsWith('SHOW') || sql.toUpperCase().trimStart().startsWith('DESC');
    var url = isSelect ? "/webdb/db/mysql/executeQuery" : "/webdb/db/mysql/executeUpdate";
    $.ajax({ url: url, type: "POST", contentType: "application/json", data: JSON.stringify({ title: title, sql: sql }),
        success: function(result) {
            if (result.code === 0 && result.data) {
                if (isSelect) {
                    var rows = result.data.data || [], count = result.data.count || 0, duration = result.data.duration || 0;
                    $info.html(count + ' 行, ' + duration + ' 秒 <span id="qryExportBtn-' + (activeTab || 'query') + '" style="margin-left:10px;color:#409eff;cursor:pointer;font-size:12px;">📥 导出 ▾</span>');
                    if (rows.length === 0) { $result.html('<div style="padding:10px;color:#999;">查询结果为空</div>'); return; }
                    var cols = []; for (var key in rows[0]) { if (rows[0].hasOwnProperty(key)) cols.push(key); }
                    var pagerId = 'qryPager-' + (activeTab || 'query');
                    window['_qryData_' + activeTab] = { rows: rows, cols: cols, $result: $result, sql: sql };
                    window._lastQueryRows = rows; window._lastQueryCols = cols; window._lastQuerySql = sql;
                    renderQueryPage(activeTab, 1, 50);
                    $result.find('.qry-pager-box').attr('id', pagerId);
                    layui.laypage.render({ elem: pagerId, count: rows.length, curr: 1, limit: 50, limits: [50, 100, 200, 500], layout: ['count', 'prev', 'page', 'next', 'limit', 'skip'],
                        jump: function(obj, first) { if (!first) renderQueryPage(activeTab, obj.curr, obj.limit); }
                    });
                    bindQueryExportBtn(activeTab, rows, cols);
                    if (typeof updateExportBtn === 'function') updateExportBtn();
                } else {
                    var affected = result.data.affectedRows || 0, duration = result.data.duration || 0;
                    $info.text('影响 ' + affected + ' 行, ' + duration + ' 秒');
                    $result.html('<div style="padding:10px;color:#28a745;">执行成功，影响 ' + affected + ' 行</div>');
                }
            } else { $result.html('<div style="padding:10px;color:#dc3545;">' + (result.msg || '执行失败') + '</div>'); }
        },
        error: function() { $result.html('<div style="padding:10px;color:#dc3545;">请求失败</div>'); }
    });
}

function renderQueryPage(activeTab, page, pageSize) {
    var data = window['_qryData_' + activeTab]; if (!data) return;
    var rows = data.rows, cols = data.cols, $result = data.$result;
    var start = (page - 1) * pageSize, end = Math.min(start + pageSize, rows.length), pageRows = rows.slice(start, end);
    var html = '<div style="overflow:auto;max-height:calc(100vh - 320px);"><table class="layui-table qry-result-table" lay-size="sm" style="margin:0;"><thead><tr>';
    html += '<th style="white-space:nowrap;width:40px;color:#999;">#</th>';
    cols.forEach(function(col) { html += '<th style="white-space:nowrap;">' + col + '</th>'; });
    html += '</tr></thead><tbody>';
    pageRows.forEach(function(row, idx) {
        html += '<tr data-row-idx="' + (start + idx) + '"><td style="color:#999;text-align:center;">' + (start + idx + 1) + '</td>';
        cols.forEach(function(col) {
            var val = row[col], isNull = (val === null || val === undefined);
            var display = isNull ? '<span style="color:#ccc;">NULL</span>' : val;
            var raw = isNull ? '' : String(val).replace(/"/g, '&quot;');
            html += '<td data-col="' + col + '" data-val="' + raw + '" style="white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + display + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody></table></div><div class="qry-pager-box" style="padding:5px 8px;border-top:1px solid #eee;"></div>';
    $result.html(html);
    // 右键菜单
    $result.find('.qry-result-table tbody').on('contextmenu', 'td', function(e) {
        e.preventDefault();
        window._ctxTarget = { $td: $(this), $row: $(this).closest('tr'), rowIdx: $(this).closest('tr').data('row-idx') };
        _dataCtx = { title: '', dbName: '', tableName: '', cols: cols, rows: rows };
        $('#dataContextMenu').css({ left: e.clientX, top: e.clientY }).show();
    });
}

function bindQueryExportBtn(activeTab, rows, cols) {
    var btnId = 'qryExportBtn-' + (activeTab || 'query');
    $(document).off('click', '#' + btnId).on('click', '#' + btnId, function(e) {
        e.stopPropagation(); $('#qryExportMenu').remove();
        var items = [{ text: 'Excel CSV', format: 'csv' }, { text: 'JSON', format: 'json' }, { text: 'JSON Line', format: 'jsonline' }, { text: 'SQL Inserts', format: 'sql' }];
        var html = '<div id="qryExportMenu" style="position:absolute;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:2px 2px 8px rgba(0,0,0,0.15);min-width:130px;padding:4px 0;font-size:13px;">';
        items.forEach(function(item) { html += '<div class="qry-export-item" data-format="' + item.format + '" style="padding:5px 15px;cursor:pointer;">' + item.text + '</div>'; });
        html += '</div>'; $('body').append(html);
        var offset = $(this).offset(); $('#qryExportMenu').css({ left: offset.left, top: offset.top + $(this).outerHeight() + 2 });
        $('.qry-export-item').on('mouseenter', function() { $(this).css('background', '#f0f0f0'); }).on('mouseleave', function() { $(this).css('background', ''); });
        $('.qry-export-item').on('click', function() { var format = $(this).data('format'); $('#qryExportMenu').remove(); exportQueryResult(rows, cols, format); });
        $(document).one('click', function() { $('#qryExportMenu').remove(); });
    });
}

function exportQueryResult(rows, cols, format) {
    var content = '', filename = 'query-result', mime = 'text/plain';
    if (format === 'csv') { content = '\uFEFF' + cols.join(',') + '\n'; rows.forEach(function(row) { content += cols.map(function(c) { var v = row[c]; if (v === null || v === undefined) return ''; var s = String(v); return (s.indexOf(',') > -1 || s.indexOf('"') > -1) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',') + '\n'; }); filename += '.csv'; mime = 'text/csv;charset=utf-8'; }
    else if (format === 'json') { content = JSON.stringify(rows, null, 2); filename += '.json'; mime = 'application/json;charset=utf-8'; }
    else if (format === 'jsonline') { rows.forEach(function(row) { content += JSON.stringify(row) + '\n'; }); filename += '.json'; mime = 'application/x-ndjson;charset=utf-8'; }
    else if (format === 'sql') { var sqlTbl = 'table_name'; var m = (window._lastQuerySql || '').match(/\bFROM\s+([^\s,;(]+)/i); if (m) { var _t = m[1].replace(/`/g, ''); sqlTbl = _t.indexOf('.') > -1 ? _t.split('.').pop() : _t; } rows.forEach(function(row) { var c = cols.map(function(c) { return '`' + c + '`'; }).join(', '); var v = cols.map(function(c) { var val = row[c]; return val === null || val === undefined ? 'NULL' : "'" + String(val).replace(/'/g, "\\'") + "'"; }).join(', '); content += 'INSERT INTO ' + sqlTbl + ' (' + c + ') VALUES (' + v + ');\n'; }); filename += '.sql'; }
    var blob = new Blob([content], { type: mime }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); layer.msg('已导出: ' + filename);
}

function clearQuery() {
    $('#sqlInput').val('');
    $('#queryResult').html('<div class="empty-state" style="padding:30px 0;"><p style="color:#999;">输入 SQL 语句并执行</p></div>');
    $('#queryInfo').text('');
    updateClearSqlBtn();
}

function clearCurrentSql() {
    var activeTab = $('.tab-item.active').data('tab');
    if (activeTab === 'query') { $('#sqlInput').val(''); $('#queryResult').html('<div class="empty-state" style="padding:30px 0;"><p style="color:#999;">输入 SQL 语句并执行</p></div>'); $('#queryInfo').text(''); }
    else if (activeTab && String(activeTab).startsWith('query-')) { $('.sqlInput[data-tab="' + activeTab + '"]').val(''); $('.queryResult[data-tab="' + activeTab + '"]').html('<div class="empty-state" style="padding:30px 0;"><p style="color:#999;">输入 SQL 语句并执行</p></div>'); $('#queryInfo-' + activeTab).text(''); }
    updateClearSqlBtn();
}

function updateClearSqlBtn() {
    var activeTab = $('.tab-item.active').data('tab'), hasSql = false;
    if (activeTab === 'query') hasSql = $('#sqlInput').val().trim().length > 0;
    else if (activeTab && String(activeTab).startsWith('query-')) hasSql = $('.sqlInput[data-tab="' + activeTab + '"]').val().trim().length > 0;
    // 清空按钮
    var btnClear = document.getElementById('btnClearSql');
    if (btnClear) { btnClear.disabled = !hasSql; btnClear.style.opacity = hasSql ? '1' : '0.5'; btnClear.style.cursor = hasSql ? 'pointer' : 'not-allowed'; }
    // 复制按钮
    var btnCopy = document.getElementById('btnCopySql');
    if (btnCopy) { btnCopy.disabled = !hasSql; btnCopy.style.opacity = hasSql ? '1' : '0.5'; btnCopy.style.cursor = hasSql ? 'pointer' : 'not-allowed'; }
}

function copyCurrentSql() {
    var activeTab = $('.tab-item.active').data('tab'), sql = '';
    if (activeTab === 'query') sql = $('#sqlInput').val();
    else if (activeTab && String(activeTab).startsWith('query-')) sql = $('.sqlInput[data-tab="' + activeTab + '"]').val();
    if (sql && sql.trim()) {
        navigator.clipboard.writeText(sql).then(function() { layer.msg('已复制SQL'); });
    }
}
