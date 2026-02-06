var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#helpMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: 'SQL帮助',
		id: 500
	}, {
		title: '通用帮助',
		id: 501
	}, { type: '-' },{
		title: '检查更新',
		id: 502
	}, {
		title: '关于webdb',
		id: 503
	}
	],
	click: function(obj) {
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});