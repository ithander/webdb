var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#editMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: 'SQL格式化',
		id: 200
	}
	],
	click: function(obj) {
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});