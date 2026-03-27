var setting = {
	    render:{
			name:'tableName'
		}
	};
	console.log('${tableNames!}');
var zNodes = eval('${tableNames!}');
$(document).ready(function(){
	console.log(zNodes)
	$.fn.zTree.init($("#leftTree"), setting, zNodes);
});