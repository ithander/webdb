var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#queryMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [ {
		title: '清除',
		id: 303
	},
	{ type: '-' },
	 {
		title: '运行',
		id: 304
	}, {
		title: '执行选择部分',
		id: 305
	},
	{ type: '-' },
	{
		title: '格式化SQL',
		id: 306
	},
	{ type: '-' },
	{
		title: '解析当前查询',
		id: 307
	}
	],
	click: function(obj) {
		//alert(123);
		//this.elem.find('span').text(obj.title);
	}
});