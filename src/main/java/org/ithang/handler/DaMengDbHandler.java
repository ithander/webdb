package org.ithang.handler;

import java.util.List;
import java.util.Map;

import org.ithang.tools.model.DBInfo;

public class DaMengDbHandler extends DbHandler {

    public DaMengDbHandler(DBInfo info) {
        super(info);
    }

    public void dropTable(String tableName) {
        execute("DROP TABLE IF EXISTS " + tableName);
    }

    public void createTable(String sql) {
        execute(sql);
    }

    public List<Map<String, Object>> data(String tableName, int page, int limit) {
        int offset = (page - 1) * limit;
        String sql = String.format("SELECT * FROM %s LIMIT %d OFFSET %d", tableName, limit, offset);
        return getJdbcTemplate().queryForList(sql);
    }

    public List<Map<String, Object>> data(String sql) {
        return getJdbcTemplate().queryForList(sql);
    }
}
