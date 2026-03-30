var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#fileMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: '会话管理器',
		id: 100
	}, {
		title: '新建窗口',
		id: 101
	}, 
	{ type: '-' },
	{
		title: '加载SQL文件',
		id: 106
	}, {
		title: '保存SQL',
		id: 108
	}
		, {
		title: '导出配置文件',
		id: 109
	}
		, {
		title: '导入配置文件',
		id: 110
	},
	{ type: '-' },
	{
		title: '退出',
		id: 111
	}
	],
	click: function(obj) {
		switch(obj.id){
			case 100:{
				configManager();
			}break;
			case 101:{
				window.open(window.location.href, '_blank');
			}break;
			case 106:{
				layer.open({
					type: 1,
					title: '加载SQL文件',
					area: ['400px', '180px'],
					content: '<div style="padding:20px;text-align:center;"><form><input type="file" id="sqlFileChooser" accept=".sql,.txt" style="font-size:14px;"></form><p style="color:#999;margin-top:10px;">支持 .sql 和 .txt 文件</p></div>',
					success: function() {
						$('#sqlFileChooser').on('change', function(e) {
							var file = e.target.files[0];
							if (!file) return;
							var reader = new FileReader();
							reader.onload = function(ev) {
								layer.closeAll();
								newQuery();
								setTimeout(function() {
									var activeTab = $('.tab-item.active').data('tab');
									if (activeTab === 'query') {
										$('#sqlInput').val(ev.target.result);
									} else if (activeTab && String(activeTab).startsWith('query-')) {
										$('.sqlInput[data-tab="' + activeTab + '"]').val(ev.target.result);
									}
									if (typeof updateClearSqlBtn === 'function') updateClearSqlBtn();
									layer.msg('已加载: ' + file.name);
								}, 200);
							};
							reader.readAsText(file, 'UTF-8');
						});
					}
				});
			}break;
			case 108:{
				saveSqlFile();
			}break;
			case 109:{
				exportConfig();
			}break;
			case 110:{
				importConfig();
			}break;
		}
	}
});



function configManager(){
	var layerIdx = layer.open({
		type: 1,
		title: '会话管理',
		shadeClose: true,
		area: ['650px', '400px'],
		content: buildConfigListHtml(),
		end: function() {
			infos = JSON.parse(localStorage.getItem('webdb_configs') || '[]');
			var zTree = $.fn.zTree.getZTreeObj("sessionTree");
			if (zTree) zTree.destroy();
			initSessionTree();
			$.ajax({ url: '/webdb/config/sync', type: 'POST', contentType: 'application/json', data: JSON.stringify(infos) });
		}
	});
	window._configManagerIdx = layerIdx;
}

function buildConfigListHtml() {
	var configs = JSON.parse(localStorage.getItem('webdb_configs') || '[]');
	var html = '<div style="padding:15px;">';
	if (configs.length > 0) {
		html += '<table class="layui-table" lay-size="sm">';
		html += '<thead><tr><th>名称</th><th>主机</th><th>端口</th><th>数据库</th><th>类型</th><th>用户</th><th style="width:60px;">操作</th></tr></thead><tbody>';
		configs.forEach(function(c, i) {
			html += '<tr>';
			html += '<td>' + (c.title || '') + '</td>';
			html += '<td>' + (c.host || '') + '</td>';
			html += '<td>' + (c.port || '') + '</td>';
			html += '<td>' + (c.dbname || '') + '</td>';
			html += '<td>' + (c.dbtype || '') + '</td>';
			html += '<td>' + (c.uname || '') + '</td>';
			html += '<td><a style="color:#dc3545;cursor:pointer;" onclick="deleteConfigByIdx(' + i + ')">删除</a></td>';
			html += '</tr>';
		});
		html += '</tbody></table>';
	} else {
		html += '<p style="color:#999;text-align:center;padding:30px 0;">暂无会话配置</p>';
	}
	html += '</div>';
	return html;
}

function deleteConfigByIdx(idx) {
	layer.confirm('确定删除该会话？', function(confirmIdx) {
		layer.close(confirmIdx);
		var configs = JSON.parse(localStorage.getItem('webdb_configs') || '[]');
		var removed = configs.splice(idx, 1)[0];
		localStorage.setItem('webdb_configs', JSON.stringify(configs));
		if (removed) {
			$.ajax({ url: '/webdb/config/del', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: removed.title }) });
		}
		// 用 layerIdx 精确定位弹窗内容并刷新
		var $content = $('#layui-layer' + window._configManagerIdx).find('.layui-layer-content');
		$content.html(buildConfigListHtml());
		layer.msg('删除成功');
	});
}


function loadSqlFile() {
	// 由 case 106 的 layer 弹窗处理
}

function saveSqlFile() {
	var activeTab = $('.tab-item.active').data('tab');
	var sql = '';
	var tabName = '';

	if (activeTab === 'query') {
		sql = $('#sqlInput').val();
		tabName = '查询';
	} else if (activeTab && String(activeTab).startsWith('query-')) {
		sql = $('.sqlInput[data-tab="' + activeTab + '"]').val();
		tabName = $('.tab-item.active span:first').text();
	} else {
		layer.msg('请先切换到查询标签页');
		return;
	}

	if (!sql || !sql.trim()) {
		layer.msg('SQL内容为空');
		return;
	}

	var blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = tabName + '.sql';
	a.click();
	URL.revokeObjectURL(a.href);
	layer.msg('已保存: ' + a.download);
}

function exportConfig() {
	var configs = JSON.parse(localStorage.getItem('webdb_configs') || '[]');
	if (configs.length === 0) {
		layer.msg('暂无配置可导出');
		return;
	}
	var blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json;charset=utf-8' });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = 'webdb-config.json';
	a.click();
	URL.revokeObjectURL(a.href);
	layer.msg('已导出: webdb-config.json');
}

function importConfig() {
	layer.open({
		type: 1,
		title: '导入配置文件',
		area: ['400px', '180px'],
		content: '<div style="padding:20px;text-align:center;"><input type="file" id="configFileChooser" accept=".json" style="font-size:14px;"><p style="color:#999;margin-top:10px;">支持 .json 格式的配置文件</p></div>',
		success: function() {
			$('#configFileChooser').on('change', function(e) {
				var file = e.target.files[0];
				if (!file) return;
				var reader = new FileReader();
				reader.onload = function(ev) {
					try {
						var imported = JSON.parse(ev.target.result);
						if (!Array.isArray(imported)) {
							layer.msg('文件格式错误');
							return;
						}
						var existing = JSON.parse(localStorage.getItem('webdb_configs') || '[]');
						var added = 0;
						imported.forEach(function(cfg) {
							if (cfg.title && !existing.some(function(c) { return c.title === cfg.title; })) {
								existing.push(cfg);
								added++;
							}
						});
						localStorage.setItem('webdb_configs', JSON.stringify(existing));
						layer.closeAll();
						layer.msg('导入成功，新增 ' + added + ' 条配置');
						// 刷新树
						infos = existing;
						var zTree = $.fn.zTree.getZTreeObj("sessionTree");
						if (zTree) zTree.destroy();
						initSessionTree();
						$.ajax({ url: '/webdb/config/sync', type: 'POST', contentType: 'application/json', data: JSON.stringify(existing) });
					} catch(ex) {
						layer.msg('文件解析失败: ' + ex.message);
					}
				};
				reader.readAsText(file, 'UTF-8');
			});
		}
	});
}
