package org.ithang.handler;

import java.util.List;
import java.util.Map;

import org.ithang.tools.model.DBInfo;

public class MySQLDbHandler extends DbHandler{

	public MySQLDbHandler(DBInfo info) {
		super(info);
	}
	
	public void dropTable(String tableName) {
		execute("drop table "+tableName);
	}
	
	public void createTable(String sql) {
		execute(sql);
	}
	
	/**
	 * 默认查询整个表 select * from tableName，page默认为1，limit默认为100,
	 * 
	 * @param page
	 * @param limit
	 * @return
	 */
	public List<Map<String,Object>> data(String tableName,int page,int limit){
		return null;
	}
	
	/**
	 * 如果sql中没有Limit则 默认Limt 100
	 * @param sql
	 * @return
	 */
	public List<Map<String,Object>> data(String sql){
		return null;
	}

}
