var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#toolMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: '刷新',
		id: 400
	},{ type: '-' }, {
		title: '用户管理',
		id: 401
	}, {
		title: '导出数据库为SQL脚本',
		id: 202
	},{ type: '-' }, {
		title: '首选项',
		id: 203
	}
	],
	click: function(obj) {
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});