package org.ithang.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.ithang.handler.MySQLDbHandler;
import org.ithang.model.ColumnInfo;
import org.ithang.model.TableInfo;
import org.springframework.jdbc.core.RowMapper;

public class MySQLDbService extends DbService{

	private final static String ListTableName="""
			SELECT 
			    table_name, 
			    table_rows AS `total`, 
			    ROUND((data_length + index_length) / 1024 / 1024, 2) AS `size` 
			FROM 
			    information_schema.TABLES 
			WHERE 
			    table_schema = ?
			ORDER BY 
			    table_name DESC;
			""";
	
	private MySQLDbHandler handler=null;
	
	public MySQLDbService(MySQLDbHandler handler) {
		this.handler=handler;
	}

	@Override
	public List<TableInfo> tables() {
		return handler.getJdbcTemplate().query(ListTableName, new RowMapper<TableInfo>() {

			@Override
			public TableInfo mapRow(ResultSet rs, int rowNum) throws SQLException {
				TableInfo info=new TableInfo();
				info.setTableName(rs.getString("table_name"));
				info.setSize(rs.getString("size")+"(MB)");
				info.setTotal(rs.getLong("total"));
				return info;
			}
			
		}, handler.getInfo().getDbname());
	}
	
	@Override
	public List<TableInfo> tables(String dbName) {
		return handler.getJdbcTemplate().query(ListTableName, new RowMapper<TableInfo>() {

			@Override
			public TableInfo mapRow(ResultSet rs, int rowNum) throws SQLException {
				TableInfo info=new TableInfo();
				info.setTableName(rs.getString("table_name"));
				info.setSize(rs.getString("size")+"(MB)");
				info.setTotal(rs.getLong("total"));
				return info;
			}
			
		}, dbName);
	}

	@Override
	public List<ColumnInfo> columns(String tableName) {
		// TODO Auto-generated method stub
		return null;
	}
	
}
