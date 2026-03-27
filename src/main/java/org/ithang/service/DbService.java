package org.ithang.service;

import java.util.List;

import org.ithang.model.ColumnInfo;
import org.ithang.model.TableInfo;

public abstract class DbService {

	/**
	 * 查询所有表信息
	 * @return
	 */
	public abstract List<TableInfo> tables();
	
	/**
	 * 查询所有表信息
	 * @return
	 */
	public abstract List<TableInfo> tables(String dbName);
	
	/**
	 * 查询指定表字段信息
	 * @param tableName
	 * @return
	 */
	public abstract List<ColumnInfo> columns(String tableName);
	
}
