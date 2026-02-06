var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#fileMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: '会话管理器',
		id: 100
	}, {
		title: '连接到',
		id: 101
	}, {
		title: '新建窗口',
		id: 102
	}, {
		title: '新建查询标签页',
		id: 103
	}, {
		title: '关闭查询标签页',
		id: 104
	}, {
		title: '关闭所有查询标签页',
		id: 105
	},
	{ type: '-' },
	{
		title: '加载SQL文件',
		id: 106
	}
		, {
		title: '运行SQL文件',
		id: 107
	}
		, {
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
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});