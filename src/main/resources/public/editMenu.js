var dropdown = layui.dropdown;
// 渲染
dropdown.render({
	elem: '#editMenu', // 绑定元素选择器，此处指向 class 可同时绑定多个元素
	data: [{
		title: 'SQL格式化（基本）',
		id: 200
	}, {
		title: 'SQL格式化（高级）',
		id: 201
	}
	],
	click: function(obj) {
		switch(obj.id) {
			case 200: {
				formatSql('basic');
			}break;
			case 201: {
				formatSql('advanced');
			}break;
		}
	}
});

// SQL格式化函数
function formatSql(mode) {
	// 获取当前活动的tab
	var activeTab = $('.tab-item.active').data('tab');
	var $sqlInput = null;
	var sqlText = '';
	
	// 检查是否在查询tab中
	if (activeTab === 'query') {
		// 主查询tab
		$sqlInput = $('#sqlInput');
		sqlText = $sqlInput.val();
	} else if (activeTab && activeTab.indexOf('query-') === 0) {
		// 新建的查询tab
		$sqlInput = $('.sqlInput[data-tab="' + activeTab + '"]');
		sqlText = $sqlInput.val();
	}
	
	if (!$sqlInput || !$sqlInput.length) {
		layer.msg('请先切换到查询标签页');
		return;
	}
	
	if (!sqlText || !sqlText.trim()) {
		layer.msg('SQL内容为空');
		return;
	}
	
	try {
		// 调用SQL格式化函数
		var formattedSql = mode === 'advanced' ? formatSqlTextAdvanced(sqlText) : formatSqlTextBasic(sqlText);
		$sqlInput.val(formattedSql);
		layer.msg('SQL格式化成功 (' + (mode === 'advanced' ? '高级' : '基本') + '模式)');
	} catch (error) {
		layer.msg('SQL格式化失败: ' + error.message);
	}
}

// 基本SQL格式化函数（简单快速）
function formatSqlTextBasic(sql) {
	if (!sql || !sql.trim()) {
		return sql;
	}
	
	var formatted = sql.trim();
	
	// 1. 统一换行符
	formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	
	// 2. 主要关键字前添加换行
	var mainKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'INSERT INTO', 'UPDATE', 'DELETE FROM'];
	
	mainKeywords.forEach(function(keyword) {
		var regex = new RegExp('\\s+' + keyword + '\\s+', 'gi');
		formatted = formatted.replace(regex, '\n' + keyword + ' ');
	});
	
	// 3. SELECT子句中的逗号后换行
	formatted = formatted.replace(/SELECT\s+(.*?)(?=\b(?:FROM|$))/gis, function(match, selectList) {
		var formattedSelect = selectList.replace(/,\s*/g, ',\n    ');
		return 'SELECT\n    ' + formattedSelect;
	});
	
	// 4. 添加基本缩进
	var lines = formatted.split('\n');
	var resultLines = [];
	var indentLevel = 0;
	
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		
		if (!line) {
			resultLines.push('');
			continue;
		}
		
		// 减少缩进的关键字
		if (line.match(/^(FROM|WHERE|GROUP BY|ORDER BY|HAVING|UNION)/i)) {
			indentLevel = Math.max(0, indentLevel - 1);
		}
		
		// 添加缩进
		var indent = '    '.repeat(indentLevel);
		resultLines.push(indent + line);
		
		// 增加缩进的关键字
		if (line.match(/^(SELECT|FROM|WHERE|JOIN|AND|OR)/i)) {
			indentLevel++;
		}
	}
	
	return resultLines.join('\n').trim();
}

// SQL格式化函数
function formatSql() {
	// 获取当前活动的tab
	var activeTab = $('.tab-item.active').data('tab');
	var $sqlInput = null;
	var sqlText = '';
	
	// 检查是否在查询tab中
	if (activeTab === 'query') {
		// 主查询tab
		$sqlInput = $('#sqlInput');
		sqlText = $sqlInput.val();
	} else if (activeTab && activeTab.indexOf('query-') === 0) {
		// 新建的查询tab
		$sqlInput = $('.sqlInput[data-tab="' + activeTab + '"]');
		sqlText = $sqlInput.val();
	}
	
	if (!$sqlInput || !$sqlInput.length) {
		layer.msg('请先切换到查询标签页');
		return;
	}
	
	if (!sqlText || !sqlText.trim()) {
		layer.msg('SQL内容为空');
		return;
	}
	
	try {
		// 调用SQL格式化函数
		var formattedSql = formatSqlText(sqlText);
		$sqlInput.val(formattedSql);
		layer.msg('SQL格式化成功');
	} catch (error) {
		layer.msg('SQL格式化失败: ' + error.message);
	}
}

// 高级SQL格式化函数（完整功能）
function formatSqlTextAdvanced(sql) {
	if (!sql || !sql.trim()) {
		return sql;
	}
	
	// 基本SQL格式化规则
	var formatted = sql.trim();
	
	// 1. 统一换行符
	formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	
	// 2. 处理常见SQL关键字，添加换行和缩进
	var keywords = [
		'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
		'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'UNION ALL', 'INSERT INTO',
		'UPDATE', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
		'VALUES', 'SET', 'LIMIT', 'OFFSET'
	];
	
	// 3. 在每个关键字前添加换行（除了第一个SELECT）
	keywords.forEach(function(keyword) {
		var regex = new RegExp('\\s+' + keyword + '\\s+', 'gi');
		formatted = formatted.replace(regex, '\n' + keyword + ' ');
	});
	
	// 4. 处理逗号分隔
	// SELECT子句中的逗号后换行
	formatted = formatted.replace(/SELECT\s+(.*?)(?=\b(?:FROM|$))/gis, function(match, selectList) {
		// 在SELECT子句中的逗号后添加换行和缩进
		var formattedSelect = selectList.replace(/,\s*/g, ',\n    ');
		return 'SELECT\n    ' + formattedSelect;
	});
	
	// INSERT VALUES中的逗号后换行
	formatted = formatted.replace(/VALUES\s*\((.*?)\)/gis, function(match, valuesList) {
		// 在VALUES子句中的逗号后添加换行和缩进
		var formattedValues = valuesList.replace(/,\s*/g, ',\n        ');
		return 'VALUES (\n        ' + formattedValues + '\n    )';
	});
	
	// 5. 处理括号缩进
	formatted = formatted.replace(/\(/g, '(\n    ').replace(/\)/g, '\n)');
	
	// 6. 添加缩进
	var lines = formatted.split('\n');
	var indentLevel = 0;
	var inParentheses = 0;
	var resultLines = [];
	
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		
		if (!line) {
			resultLines.push('');
			continue;
		}
		
		// 计算括号层级
		var openParens = (line.match(/\(/g) || []).length;
		var closeParens = (line.match(/\)/g) || []).length;
		var parenthesesDiff = openParens - closeParens;
		
		// 处理减少缩进的关键字
		if (line.match(/^(FROM|WHERE|GROUP BY|ORDER BY|HAVING|UNION|UNION ALL|SET|VALUES|LIMIT|OFFSET)/i)) {
			indentLevel = Math.max(0, indentLevel - 1);
		}
		
		// 添加缩进，考虑括号层级
		var indent = '    '.repeat(indentLevel + inParentheses);
		resultLines.push(indent + line);
		
		// 更新括号层级
		inParentheses += parenthesesDiff;
		
		// 处理增加缩进的关键字
		if (line.match(/^(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|AND|OR|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)/i)) {
			indentLevel++;
		}
		
		// 特殊处理：如果是FROM之后的JOIN，保持相同缩进
		if (line.match(/^(JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN)/i) && i > 0 && lines[i-1].match(/FROM/i)) {
			indentLevel = Math.max(0, indentLevel - 1);
		}
	}
	
	// 7. 清理多余的空行和缩进
	var finalResult = resultLines.join('\n')
		.replace(/\n\s*\n\s*\n/g, '\n\n') // 最多两个连续空行
		.replace(/\(\s*\n\s*\)/g, '()') // 清理空括号
		.replace(/\s+\)/g, ')') // 清理括号前的空格
		.replace(/\(\s+/g, '(') // 清理括号后的空格
		.trim();
	
	return finalResult;
}