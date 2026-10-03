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
			infos = WebdbCrypto.loadConfigs();
			var zTree = $.fn.zTree.getZTreeObj("sessionTree");
			if (zTree) zTree.destroy();
			initSessionTree();
			$.ajax({ url: '/webdb/config/sync', type: 'POST', contentType: 'application/json', data: JSON.stringify(infos) });
		}
	});
	window._configManagerIdx = layerIdx;
}

// 刷新会话管理界面内容
function refreshConfigManager() {
	if (window._configManagerIdx) {
		var $content = $('#layui-layer' + window._configManagerIdx).find('.layui-layer-content');
		if ($content.length) {
			$content.html(buildConfigListHtml());
		}
	}
}

// 刷新左侧会话树
function refreshSessionTree() {
	infos = WebdbCrypto.loadConfigs();
	var zTree = $.fn.zTree.getZTreeObj("sessionTree");
	if (zTree) zTree.destroy();
	initSessionTree();
	$.ajax({ url: '/webdb/config/sync', type: 'POST', contentType: 'application/json', data: JSON.stringify(infos) });
}

function buildConfigListHtml() {
	var configs = WebdbCrypto.loadConfigs();
	var html = '<div style="padding:15px;">';
	
	// 添加"新增会话"按钮到左上角
	html += '<div style="margin-bottom:15px;">';
	html += '<button class="layui-btn layui-btn-sm layui-btn-normal" onclick="showNewSessionDialog()">';
	html += '<i class="layui-icon layui-icon-add-1"></i> 新增会话';
	html += '</button>';
	html += '</div>';
	
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
		html += '<p style="color:#999;text-align:center;padding:30px 0;">暂无会话配置，请点击上方"新增会话"按钮创建</p>';
	}
	html += '</div>';
	return html;
}

function deleteConfigByIdx(idx) {
	layer.confirm('确定删除该会话？', function(confirmIdx) {
		layer.close(confirmIdx);
		var configs = WebdbCrypto.loadConfigs();
		var removed = configs.splice(idx, 1)[0];
		WebdbCrypto.saveConfigs(configs);
		if (removed) {
			$.ajax({ url: '/webdb/config/del', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: removed.title }) });
		}
		// 刷新会话管理界面
		refreshConfigManager();
		// 刷新左侧会话树
		refreshSessionTree();
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
	var configs = WebdbCrypto.loadConfigs();
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
						var existing = WebdbCrypto.loadConfigs();
						var added = 0;
						imported.forEach(function(cfg) {
							if (cfg.title && !existing.some(function(c) { return c.title === cfg.title; })) {
								existing.push(cfg);
								added++;
							}
						});
						WebdbCrypto.saveConfigs(existing);
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
// 显示新增会话对话框（使用最早的弹框方法）
function showNewSessionDialog() {
	layer.open({
		type: 2,
		title: '新增数据库配置',
		shadeClose: true,
		area: ['550px', '520px'],
		content: '/webdb/config/form',
		btn: ['保存', '取消'],
		yes: function(index) {
			if (window.saveForm) {
				window.saveForm().then(function(r) {
					if (r && r.code === 0) {
						layer.close(index);
						layer.msg('保存成功');
						// 刷新配置列表和会话树
						infos = WebdbCrypto.loadConfigs();
						var zTree = $.fn.zTree.getZTreeObj("sessionTree");
						if (zTree) zTree.destroy();
						initSessionTree();
						$.ajax({
							url: '/webdb/config/sync',
							type: 'POST',
							contentType: 'application/json',
							data: JSON.stringify(infos)
						});
						// 刷新会话管理界面
						refreshConfigManager();
					}
				});
			}
		}
	});
}

// 构建新增会话表单
function buildNewSessionForm() {
	var html = '<div style="padding:20px;">';
	html += '<form class="layui-form" id="newSessionForm" lay-filter="newSessionForm">';
	
	// 数据库类型选择
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">数据库类型</label>';
	html += '<div class="layui-input-block">';
	html += '<select name="dbtype" lay-verify="required" lay-filter="dbtypeSelect">';
	html += '<option value="">请选择数据库类型</option>';
	html += '<option value="mysql">MySQL</option>';
	html += '<option value="h2">H2</option>';
	html += '<option value="postgres">PostgreSQL</option>';
	html += '<option value="oracle">Oracle</option>';
	html += '<option value="dameng">达梦</option>';
	html += '<option value="mariadb">MariaDB</option>';
	html += '</select>';
	html += '</div>';
	html += '</div>';
	
	// 连接名称
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接名称</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="title" lay-verify="required" placeholder="请输入连接名称" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 主机地址
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">主机地址</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="host" lay-verify="required" placeholder="如：localhost 或 127.0.0.1" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 端口
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">端口</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="number" name="port" lay-verify="required|number" placeholder="数据库端口" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 数据库名
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">数据库名</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="dbname" lay-verify="required" placeholder="数据库名称" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 用户名
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">用户名</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="uname" lay-verify="required" placeholder="数据库用户名" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 密码
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">密码</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="password" name="upass" placeholder="数据库密码" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 高级选项（折叠）
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">高级选项</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="checkbox" name="showAdvanced" lay-skin="switch" lay-text="展开|收起" lay-filter="advancedSwitch">';
	html += '</div>';
	html += '</div>';
	
	// 高级选项内容
	html += '<div id="advancedOptions" style="display:none;">';
	
	// 编码
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">编码</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="charset" placeholder="如：utf8mb4" autocomplete="off" class="layui-input" value="utf8mb4">';
	html += '</div>';
	html += '</div>';
	
	// 超时时间
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接超时</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="number" name="timeout" placeholder="秒" autocomplete="off" class="layui-input" value="30">';
	html += '</div>';
	html += '</div>';
	
	// 连接参数
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接参数</label>';
	html += '<div class="layui-input-block">';
	html += '<textarea name="opt" placeholder="如：useSSL=false&serverTimezone=UTC" class="layui-textarea"></textarea>';
	html += '</div>';
	html += '</div>';
	
	html += '</div>'; // 结束高级选项
	
	// 测试连接按钮
	html += '<div class="layui-form-item">';
	html += '<div class="layui-input-block">';
	html += '<button type="button" class="layui-btn layui-btn-sm layui-btn-primary" onclick="testConnection()">测试连接</button>';
	html += '<span id="testResult" style="margin-left:10px;"></span>';
	html += '</div>';
	html += '</div>';
	
	html += '</form>';
	html += '</div>';
	
	return html;
}

// 保存新会话
function saveNewSession() {
	layui.form.verify();
	
	var formData = layui.form.getValues('newSessionForm');
	
	// 验证必填字段
	if (!formData.dbtype) {
		layer.msg('请选择数据库类型');
		return false;
	}
	if (!formData.title) {
		layer.msg('请输入连接名称');
		return false;
	}
	if (!formData.host) {
		layer.msg('请输入主机地址');
		return false;
	}
	if (!formData.port) {
		layer.msg('请输入端口');
		return false;
	}
	if (!formData.dbname) {
		layer.msg('请输入数据库名');
		return false;
	}
	if (!formData.uname) {
		layer.msg('请输入用户名');
		return false;
	}
	
	// 检查连接名称是否已存在
	var configs = WebdbCrypto.loadConfigs();
	if (configs.some(function(c) { return c.title === formData.title; })) {
		layer.msg('连接名称已存在，请使用其他名称');
		return false;
	}
	
	// 设置默认端口
	if (!formData.port) {
		switch(formData.dbtype) {
			case 'mysql':
			case 'mariadb':
				formData.port = 3306;
				break;
			case 'h2':
				formData.port = 8082;
				break;
			case 'postgres':
				formData.port = 5432;
				break;
			case 'oracle':
				formData.port = 1521;
				break;
			case 'dameng':
				formData.port = 5236;
				break;
		}
	}
	
	// 保存到本���存储
	configs.push(formData);
	WebdbCrypto.saveConfigs(configs);
	
	// 同步到服务器
	$.ajax({
		url: '/webdb/config/add',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(formData),
		success: function(result) {
			if (result.code === 0) {
				layer.msg('新增会话成功');
				layer.closeAll();
				
				// 刷新会话管理界面
				refreshConfigManager();
				// 刷新左侧会话树
				refreshSessionTree();
			} else {
				layer.msg('保存失败: ' + (result.msg || ''));
			}
		},
		error: function() {
			layer.msg('网络错误，配置已保存到本地');
			layer.closeAll();
			
			// 刷新会话管理界面
			var $content = $('#layui-layer' + window._configManagerIdx).find('.layui-layer-content');
			$content.html(buildConfigListHtml());
			
			// 刷新左侧会话树
			infos = configs;
			var zTree = $.fn.zTree.getZTreeObj("sessionTree");
			if (zTree) zTree.destroy();
			initSessionTree();
		}
	});
	
	return false;
}

// 测试连接
function testConnection() {
	var formData = layui.form.getValues('newSessionForm');
	
	if (!formData.dbtype || !formData.host || !formData.port || !formData.dbname || !formData.uname) {
		layer.msg('请填写完整连接信息');
		return;
	}
	
	$('#testResult').html('<span style="color:#999;">测试连接中...</span>');
	
	// 构建测试连接数据
	var testData = {
		dbtype: formData.dbtype,
		host: formData.host,
		port: formData.port,
		dbname: formData.dbname,
		uname: formData.uname,
		upass: formData.upass || '',
		title: 'test_connection_' + Date.now()
	};
	
	// 发送测试请求
	$.ajax({
		url: '/webdb/config/test',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(testData),
		success: function(result) {
			if (result.code === 0) {
				$('#testResult').html('<span style="color:#52c41a;"><i class="layui-icon layui-icon-ok-circle"></i> 连接成功</span>');
			} else {
				$('#testResult').html('<span style="color:#ff5722;"><i class="layui-icon layui-icon-close"></i> ' + (result.msg || '连接失败') + '</span>');
			}
		},
		error: function() {
			$('#testResult').html('<span style="color:#ff5722;"><i class="layui-icon layui-icon-close"></i> 测试请求失败</span>');
		}
	});
}

// 初始化表单功能
$(function() {
	layui.use(['form', 'layer'], function() {
		var form = layui.form;
		var layer = layui.layer;
		
		// 监听数据库类型选择，设置默认端口
		form.on('select(dbtypeSelect)', function(data) {
			var portInput = $('input[name="port"]');
			if (!portInput.val()) {
				switch(data.value) {
					case 'mysql':
					case 'mariadb':
						portInput.val('3306');
						break;
					case 'h2':
						portInput.val('8082');
						break;
					case 'postgres':
						portInput.val('5432');
						break;
					case 'oracle':
						portInput.val('1521');
						break;
					case 'dameng':
						portInput.val('5236');
						break;
				}
			}
		});
		
		// 监听高级选项开关
		form.on('switch(advancedSwitch)', function(data) {
			if (data.elem.checked) {
				$('#advancedOptions').slideDown();
			} else {
				$('#advancedOptions').slideUp();
			}
		});
	});
});
// 编辑会话配置
function editConfigByIdx(idx) {
	var configs = WebdbCrypto.loadConfigs();
	if (idx < 0 || idx >= configs.length) {
		layer.msg('配置不存在');
		return;
	}
	
	var config = configs[idx];
	window._editingConfigIdx = idx;
	window._editingOriginalTitle = config.title;
	
	var layerIdx = layer.open({
		type: 1,
		title: '编辑会话配置 - ' + config.title,
		shadeClose: true,
		area: ['450px', '500px'],
		content: buildEditSessionForm(config),
		btn: ['保存', '取消'],
		yes: function(index, layero) {
			saveEditedSession(idx);
		},
		btn2: function(index, layero) {
			layer.close(index);
		}
	});
}

// 构建编辑会话表单
function buildEditSessionForm(config) {
	var html = '<div style="padding:20px;">';
	html += '<form class="layui-form" id="editSessionForm" lay-filter="editSessionForm">';
	
	// 数据库类型选择
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">数据库类型</label>';
	html += '<div class="layui-input-block">';
	html += '<select name="dbtype" lay-verify="required" lay-filter="editDbtypeSelect">';
	html += '<option value="">请选择数据库类型</option>';
	html += '<option value="mysql" ' + (config.dbtype === 'mysql' ? 'selected' : '') + '>MySQL</option>';
	html += '<option value="h2" ' + (config.dbtype === 'h2' ? 'selected' : '') + '>H2</option>';
	html += '<option value="postgres" ' + (config.dbtype === 'postgres' ? 'selected' : '') + '>PostgreSQL</option>';
	html += '<option value="oracle" ' + (config.dbtype === 'oracle' ? 'selected' : '') + '>Oracle</option>';
	html += '<option value="dameng" ' + (config.dbtype === 'dameng' ? 'selected' : '') + '>达梦</option>';
	html += '<option value="mariadb" ' + (config.dbtype === 'mariadb' ? 'selected' : '') + '>MariaDB</option>';
	html += '</select>';
	html += '</div>';
	html += '</div>';
	
	// 连接名称
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接名称</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="title" lay-verify="required" placeholder="请输入连接名称" value="' + (config.title || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 主机地址
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">主机地址</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="host" lay-verify="required" placeholder="如：localhost 或 127.0.0.1" value="' + (config.host || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 端口
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">端口</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="number" name="port" lay-verify="required|number" placeholder="数据库端口" value="' + (config.port || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 数据库名
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">数据库名</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="dbname" lay-verify="required" placeholder="数据库名称" value="' + (config.dbname || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 用户名
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">用户名</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="uname" lay-verify="required" placeholder="数据库用户名" value="' + (config.uname || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 密码
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">密码</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="password" name="upass" placeholder="数据库密码" value="' + (config.upass || '') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 高级选项（折叠）
	var showAdvanced = config.charset || config.timeout || config.opt;
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">高级选项</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="checkbox" name="showAdvanced" lay-skin="switch" lay-text="展开|收起" lay-filter="editAdvancedSwitch" ' + (showAdvanced ? 'checked' : '') + '>';
	html += '</div>';
	html += '</div>';
	
	// 高级选项内容
	html += '<div id="editAdvancedOptions" style="' + (showAdvanced ? '' : 'display:none;') + '">';
	
	// 编码
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">编码</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="text" name="charset" placeholder="如：utf8mb4" value="' + (config.charset || 'utf8mb4') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 超时时间
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接超时</label>';
	html += '<div class="layui-input-block">';
	html += '<input type="number" name="timeout" placeholder="秒" value="' + (config.timeout || '30') + '" autocomplete="off" class="layui-input">';
	html += '</div>';
	html += '</div>';
	
	// 连接参数
	html += '<div class="layui-form-item">';
	html += '<label class="layui-form-label">连接参数</label>';
	html += '<div class="layui-input-block">';
	html += '<textarea name="opt" placeholder="如：useSSL=false&serverTimezone=UTC" class="layui-textarea">' + (config.opt || '') + '</textarea>';
	html += '</div>';
	html += '</div>';
	
	html += '</div>'; // 结束高级选项
	
	// 测试连接按钮
	html += '<div class="layui-form-item">';
	html += '<div class="layui-input-block">';
	html += '<button type="button" class="layui-btn layui-btn-sm layui-btn-primary" onclick="testEditConnection()">测试连接</button>';
	html += '<span id="editTestResult" style="margin-left:10px;"></span>';
	html += '</div>';
	html += '</div>';
	
	html += '</form>';
	html += '</div>';
	
	return html;
}

// 保存编辑的会话
function saveEditedSession(idx) {
	layui.form.verify();
	
	var formData = layui.form.getValues('editSessionForm');
	var configs = WebdbCrypto.loadConfigs();
	
	// 验证必填字段
	if (!formData.dbtype) {
		layer.msg('请选择数据库类型');
		return false;
	}
	if (!formData.title) {
		layer.msg('请输入连接名称');
		return false;
	}
	if (!formData.host) {
		layer.msg('请输入主机地址');
		return false;
	}
	if (!formData.port) {
		layer.msg('请输入端口');
		return false;
	}
	if (!formData.dbname) {
		layer.msg('请输入数据库名');
		return false;
	}
	if (!formData.uname) {
		layer.msg('请输入用户名');
		return false;
	}
	
	// 检查连接名称是否已存在（排除当前编辑的配置）
	var originalTitle = window._editingOriginalTitle;
	if (formData.title !== originalTitle && configs.some(function(c, i) { 
		return i !== idx && c.title === formData.title; 
	})) {
		layer.msg('连接名称已存在，请使用其他名称');
		return false;
	}
	
	// 更新配置
	configs[idx] = formData;
	WebdbCrypto.saveConfigs(configs);
	
	// 同步到服务器
	$.ajax({
		url: '/webdb/config/update',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			oldTitle: originalTitle,
			newConfig: formData
		}),
		success: function(result) {
			if (result.code === 0) {
				layer.msg('更新会话成功');
				layer.closeAll();
				
				// 刷新会话管理界面
				refreshConfigManager();
				// 刷新左侧会话树
				refreshSessionTree();
			} else {
				layer.msg('更新失败: ' + (result.msg || ''));
			}
		},
		error: function() {
			layer.msg('网络错误，配置已保存到本地');
			layer.closeAll();
			
			// 刷新会话管理界面
			var $content = $('#layui-layer' + window._configManagerIdx).find('.layui-layer-content');
			$content.html(buildConfigListHtml());
			
			// 刷新左侧会话树
			infos = configs;
			var zTree = $.fn.zTree.getZTreeObj("sessionTree");
			if (zTree) zTree.destroy();
			initSessionTree();
		}
	});
	
	return false;
}

// 测试编辑连接
function testEditConnection() {
	var formData = layui.form.getValues('editSessionForm');
	
	if (!formData.dbtype || !formData.host || !formData.port || !formData.dbname || !formData.uname) {
		layer.msg('请填写完整连接信息');
		return;
	}
	
	$('#editTestResult').html('<span style="color:#999;">测试连接中...</span>');
	
	// 构建测试连接数据
	var testData = {
		dbtype: formData.dbtype,
		host: formData.host,
		port: formData.port,
		dbname: formData.dbname,
		uname: formData.uname,
		upass: formData.upass || '',
		title: 'test_connection_' + Date.now()
	};
	
	// 发送测试请求
	$.ajax({
		url: '/webdb/config/test',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(testData),
		success: function(result) {
			if (result.code === 0) {
				$('#editTestResult').html('<span style="color:#52c41a;"><i class="layui-icon layui-icon-ok-circle"></i> 连接成功</span>');
			} else {
				$('#editTestResult').html('<span style="color:#ff5722;"><i class="layui-icon layui-icon-close"></i> ' + (result.msg || '连接失败') + '</span>');
			}
		},
		error: function() {
			$('#editTestResult').html('<span style="color:#ff5722;"><i class="layui-icon layui-icon-close"></i> 测试请求失败</span>');
		}
	});
}

// 初始化编辑表单功能
$(function() {
	layui.use(['form', 'layer'], function() {
		var form = layui.form;
		var layer = layui.layer;
		
		// 监听编辑表单数据库类型选择，设置默认端口
		form.on('select(editDbtypeSelect)', function(data) {
			var portInput = $('input[name="port"]');
			if (!portInput.val()) {
				switch(data.value) {
					case 'mysql':
					case 'mariadb':
						portInput.val('3306');
						break;
					case 'h2':
						portInput.val('8082');
						break;
					case 'postgres':
						portInput.val('5432');
						break;
					case 'oracle':
						portInput.val('1521');
						break;
					case 'dameng':
						portInput.val('5236');
						break;
				}
			}
		});
		
		// 监听编辑表单高级选项开关
		form.on('switch(editAdvancedSwitch)', function(data) {
			if (data.elem.checked) {
				$('#editAdvancedOptions').slideDown();
			} else {
				$('#editAdvancedOptions').slideUp();
			}
		});
	});
});
// 构建统一的会话管理页面（包含表单和列表）- 已弃用，使用简单的会话管理界面
// function buildSessionManagerHtml() {
// 	var configs = WebdbCrypto.loadConfigs();
// 	var html = '<div style="padding:15px;">';
// 	
// 	// 标题和标签切换
// 	html += '<div style="margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:10px;">';
// 	html += '<h3 style="margin:0 0 15px 0;color:#333;">会话管理</h3>';
// 	html += '<div class="layui-tab layui-tab-brief">';
// 	html += '<ul class="layui-tab-title">';
// 	html += '<li class="layui-this" data-tab="list"><i class="layui-icon layui-icon-list"></i> 会话列表</li>';
// 	html += '<li data-tab="form"><i class="layui-icon layui-icon-add-1"></i> 新增会话</li>';
// 	html += '</ul>';
// 	html += '</div>';
// 	html += '</div>';
// 	
// 	// 标签内容
// 	html += '<div class="layui-tab-content">';
// 	
// 	// 会话列表标签内容
// 	html += '<div class="layui-tab-item layui-show" id="session-list-tab">';
// 	if (configs.length > 0) {
// 		html += '<table class="layui-table" lay-size="sm">';
// 		html += '<thead><tr><th>名称</th><th>主机</th><th>端口</th><th>数据库</th><th>类型</th><th>用户</th><th style="width:100px;">操作</th></tr></thead><tbody>';
// 		configs.forEach(function(c, i) {
// 			html += '<tr>';
// 			html += '<td>' + (c.title || '') + '</td>';
// 			html += '<td>' + (c.host || '') + '</td>';
// 			html += '<td>' + (c.port || '') + '</td>';
// 			html += '<td>' + (c.dbname || '') + '</td>';
// 			html += '<td>' + (c.dbtype || '') + '</td>';
// 			html += '<td>' + (c.uname || '') + '</td>';
// 			html += '<td>';
// 			html += '<a style="color:#409eff;cursor:pointer;margin-right:10px;" onclick="editConfigByIdx(' + i + ')">编辑</a>';
// 			html += '<a style="color:#dc3545;cursor:pointer;" onclick="deleteConfigByIdx(' + i + ')">删除</a>';
// 			html += '</td>';
// 			html += '</tr>';
// 		});
// 		html += '</tbody></table>';
// 	} else {
// 		html += '<p style="color:#999;text-align:center;padding:30px 0;">暂无会话配置，点击"新增会话"标签创建</p>';
// 	}
// 	html += '</div>'; // 结束会话列表标签
// 	
// 	// 新增会话标签内容
// 	html += '<div class="layui-tab-item" id="session-form-tab">';
// 	html += buildNewSessionForm();
// 	html += '</div>'; // 结束新增会话标签
// 	
// 	html += '</div>'; // 结束layui-tab-content
// 	html += '</div>'; // 结束padding div
// 	
// 	return html;
// }

// 切换到新增会话表单 - 已弃用，使用简单的会话管理界面
// function switchToNewSessionForm() {
// 	if (window._configManagerIdx) {
// 		// 获取当前弹窗
// 		var $layer = $('#layui-layer' + window._configManagerIdx);
// 		if ($layer.length) {
// 			// 更新内容为统一页面
// 			var $content = $layer.find('.layui-layer-content');
// 			$content.html(buildSessionManagerHtml());
// 			
// 			// 切换到表单标签
// 			setTimeout(function() {
// 				$('.layui-tab-title li[data-tab="form"]').click();
// 			}, 100);
// 		}
// 	}
// }

// 初始化标签切换功能
$(function() {
	layui.use(['form', 'layer', 'element'], function() {
		var form = layui.form;
		var layer = layui.layer;
		var element = layui.element;
		
		// 监听标签切换
		element.on('tab(session-tabs)', function(data) {
			// 标签切换时重新渲染表单
			if (data.index === 1) { // 切换到表单标签
				setTimeout(function() {
					layui.form.render();
					
					// 监听数据库类型选择，设置默认端口
					form.on('select(dbtypeSelect)', function(data) {
						var portInput = $('input[name="port"]');
						if (!portInput.val()) {
							switch(data.value) {
								case 'mysql':
								case 'mariadb':
									portInput.val('3306');
									break;
								case 'h2':
									portInput.val('8082');
									break;
								case 'postgres':
									portInput.val('5432');
									break;
								case 'oracle':
									portInput.val('1521');
									break;
								case 'dameng':
									portInput.val('5236');
									break;
							}
						}
					});
					
					// 监听高级选项开关
					form.on('switch(advancedSwitch)', function(data) {
						if (data.elem.checked) {
							$('#advancedOptions').slideDown();
						} else {
							$('#advancedOptions').slideUp();
						}
					});
					
					// 监听编辑表单数据库类型选择
					form.on('select(editDbtypeSelect)', function(data) {
						var portInput = $('input[name="port"]');
						if (!portInput.val()) {
							switch(data.value) {
								case 'mysql':
								case 'mariadb':
									portInput.val('3306');
									break;
								case 'h2':
									portInput.val('8082');
									break;
								case 'postgres':
									portInput.val('5432');
									break;
								case 'oracle':
									portInput.val('1521');
									break;
								case 'dameng':
									portInput.val('5236');
									break;
							}
						}
					});
					
					// 监听编辑表单高级选项开关
					form.on('switch(editAdvancedSwitch)', function(data) {
						if (data.elem.checked) {
							$('#editAdvancedOptions').slideDown();
						} else {
							$('#editAdvancedOptions').slideUp();
						}
					});
				}, 100);
			}
		});
	});
});

// 修改保存新会话和编辑会话后的刷新逻辑 - 已弃用，使用简单的会话管理界面
// function refreshSessionManager() {
// 	if (window._configManagerIdx) {
// 		var $layer = $('#layui-layer' + window._configManagerIdx);
// 		if ($layer.length) {
// 			var $content = $layer.find('.layui-layer-content');
// 			$content.html(buildSessionManagerHtml());
// 			
// 			// 重新初始化标签功能
// 			setTimeout(function() {
// 				layui.element.init();
// 			}, 100);
// 		}
// 	}
// }

// 更新删除配置后的刷新
function deleteConfigByIdx(idx) {
	layer.confirm('确定删除该会话？', function(confirmIdx) {
		layer.close(confirmIdx);
		var configs = WebdbCrypto.loadConfigs();
		var removed = configs.splice(idx, 1)[0];
		WebdbCrypto.saveConfigs(configs);
		if (removed) {
			$.ajax({ url: '/webdb/config/del', type: 'POST', contentType: 'application/json', data: JSON.stringify({ title: removed.title }) });
		}
		// 刷新会话管理界面
		refreshConfigManager();
		// 刷新左侧会话树
		refreshSessionTree();
		layer.msg('删除成功');
	});
}

// 修改编辑配置函数，在统一页面中打开编辑
function editConfigByIdx(idx) {
	var configs = WebdbCrypto.loadConfigs();
	if (idx < 0 || idx >= configs.length) {
		layer.msg('配置不存在');
		return;
	}
	
	var config = configs[idx];
	window._editingConfigIdx = idx;
	window._editingOriginalTitle = config.title;
	
	layer.open({
		type: 1,
		title: '编辑会话配置 - ' + config.title,
		shadeClose: true,
		area: ['450px', '500px'],
		content: buildEditSessionForm(config),
		btn: ['保存', '取消'],
		yes: function(index, layero) {
			saveEditedSession(idx);
		},
		btn2: function(index, layero) {
			layer.close(index);
		}
	});
}

// 更新保存新会话后的刷新逻辑
function saveNewSession() {
	layui.form.verify();
	
	var formData = layui.form.getValues('newSessionForm');
	
	// 验证必填字段
	if (!formData.dbtype) {
		layer.msg('请选择数据库类型');
		return false;
	}
	if (!formData.title) {
		layer.msg('请输入连接名称');
		return false;
	}
	if (!formData.host) {
		layer.msg('请输入主机地址');
		return false;
	}
	if (!formData.port) {
		layer.msg('请输入端口');
		return false;
	}
	if (!formData.dbname) {
		layer.msg('请输入数据库名');
		return false;
	}
	if (!formData.uname) {
		layer.msg('请输入用户名');
		return false;
	}
	
	// 检查连接名称是否已存在
	var configs = WebdbCrypto.loadConfigs();
	if (configs.some(function(c) { return c.title === formData.title; })) {
		layer.msg('连接名称已存在，请使用其他名称');
		return false;
	}
	
	// 设置默认端口
	if (!formData.port) {
		switch(formData.dbtype) {
			case 'mysql':
			case 'mariadb':
				formData.port = 3306;
				break;
			case 'h2':
				formData.port = 8082;
				break;
			case 'postgres':
				formData.port = 5432;
				break;
			case 'oracle':
				formData.port = 1521;
				break;
			case 'dameng':
				formData.port = 5236;
				break;
		}
	}
	
	// 保存到本地存储
	configs.push(formData);
	WebdbCrypto.saveConfigs(configs);
	
	// 同步到服务器
	$.ajax({
		url: '/webdb/config/add',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(formData),
		success: function(result) {
			if (result.code === 0) {
				layer.msg('新增会话成功');
				layer.closeAll();
				
				// 刷新会话管理界面
				refreshConfigManager();
				// 刷新左侧会话树
				refreshSessionTree();
			} else {
				layer.msg('保存失败: ' + (result.msg || ''));
			}
		},
		error: function() {
			layer.msg('网络错误，配置已保存到本地');
			layer.closeAll();
			
			// 刷新会话管理界面
			refreshConfigManager();
			// 刷新左侧会话树
			refreshSessionTree();
		}
	});
	
	return false;
}

// 更新保存编辑会话后的刷新逻辑
function saveEditedSession(idx) {
	layui.form.verify();
	
	var formData = layui.form.getValues('editSessionForm');
	var configs = WebdbCrypto.loadConfigs();
	
	// 验证必填字段
	if (!formData.dbtype) {
		layer.msg('请选择数据库类型');
		return false;
	}
	if (!formData.title) {
		layer.msg('请输入连接名称');
		return false;
	}
	if (!formData.host) {
		layer.msg('请输入主机地址');
		return false;
	}
	if (!formData.port) {
		layer.msg('请输入端口');
		return false;
	}
	if (!formData.dbname) {
		layer.msg('请输入数据库名');
		return false;
	}
	if (!formData.uname) {
		layer.msg('请输入用户名');
		return false;
	}
	
	// 检查连接名称是否已存在（排除当前编辑的配置）
	var originalTitle = window._editingOriginalTitle;
	if (formData.title !== originalTitle && configs.some(function(c, i) { 
		return i !== idx && c.title === formData.title; 
	})) {
		layer.msg('连接名称已存在，请使用其他名称');
		return false;
	}
	
	// 更新配置
	configs[idx] = formData;
	WebdbCrypto.saveConfigs(configs);
	
	// 同步到服务器
	$.ajax({
		url: '/webdb/config/update',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			oldTitle: originalTitle,
			newConfig: formData
		}),
		success: function(result) {
			if (result.code === 0) {
				layer.msg('更新会话成功');
				layer.closeAll();
				
				// 刷新会话管理界面
				refreshConfigManager();
				// 刷新左侧会话树
				refreshSessionTree();
			} else {
				layer.msg('更新失败: ' + (result.msg || ''));
			}
		},
		error: function() {
			layer.msg('网络错误，配置已保存到本地');
			layer.closeAll();
			
			// 刷新会话管理界面
			refreshConfigManager();
			// 刷新左侧会话树
			refreshSessionTree();
		}
	});
	
	return false;
}