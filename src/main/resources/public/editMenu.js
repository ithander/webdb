var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#editMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: '撤销',
		id: 200
	}, {
		title: '复制',
		id: 201
	}, {
		title: '粘贴',
		id: 202
	}, {
		title: '剪切',
		id: 203
	}
	],
	click: function(obj) {
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});