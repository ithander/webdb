package org.ithang.handler;

import java.util.List;
import java.util.Map;

import org.ithang.tools.model.DBInfo;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class H2DbHandler extends DbHandler {

    public H2DbHandler(DBInfo info) {
        super(info);
    }
    
      
    /**
     * 删除表
     * @param tableName 表名
     */
    public void dropTable(String tableName) {
        execute("DROP TABLE IF EXISTS " + tableName);
    }
    
    /**
     * 创建表
     * @param sql 建表SQL
     */
    public void createTable(String sql) {
        execute(sql);
    }
    
    /**
     * 分页查询表数据
     * @param tableName 表名
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @return 查询结果
     */
    public List<Map<String, Object>> data(String tableName, int page, int limit) {
        int offset = (page - 1) * limit;
        String sql = String.format("SELECT * FROM %s LIMIT %d OFFSET %d", tableName, limit, offset);
        return getJdbcTemplate().queryForList(sql);
    }
    
    /**
     * 执行查询SQL，如果没有LIMIT则默认LIMIT 100
     * @param sql 查询SQL
     * @return 查询结果
     */
    public List<Map<String, Object>> data(String sql) {
        String upperSql = sql.trim().toUpperCase();
        if (!upperSql.contains("LIMIT")) {
            sql = sql + " LIMIT 100";
        }
        return getJdbcTemplate().queryForList(sql);
    }
    
    /**
     * 获取所有表名
     * @return 表名列表
     */
    public List<String> getTables() {
        String sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='PUBLIC'";
        return getJdbcTemplate().queryForList(sql, String.class);
    }
    
    /**
     * 获取表结构信息
     * @param tableName 表名
     * @return 列信息
     */
    public List<Map<String, Object>> getTableStructure(String tableName) {
        String sql = "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE " +
                     "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?";
        return getJdbcTemplate().queryForList(sql, tableName.toUpperCase());
    }
}
