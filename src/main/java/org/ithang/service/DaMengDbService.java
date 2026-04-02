package org.ithang.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.ithang.handler.DaMengDbHandler;
import org.ithang.model.ColumnInfo;
import org.ithang.model.TableInfo;
import org.springframework.jdbc.core.RowMapper;

public class DaMengDbService extends DbService {

    private static final String LIST_TABLES = """
            SELECT TABLE_NAME, NUM_ROWS AS TOTAL
            FROM ALL_TABLES
            WHERE OWNER = ?
            ORDER BY TABLE_NAME
            """;

    private DaMengDbHandler handler;

    public DaMengDbService(DaMengDbHandler handler) {
        this.handler = handler;
    }

    @Override
    public List<TableInfo> tables() {
        return tables(handler.getInfo().getDbname().toUpperCase());
    }

    @Override
    public List<TableInfo> tables(String schemaName) {
        return handler.getJdbcTemplate().query(LIST_TABLES, new RowMapper<TableInfo>() {
            @Override
            public TableInfo mapRow(ResultSet rs, int rowNum) throws SQLException {
                TableInfo info = new TableInfo();
                info.setTableName(rs.getString("TABLE_NAME"));
                info.setTotal(rs.getLong("TOTAL"));
                info.setSize("0");
                return info;
            }
        }, schemaName.toUpperCase());
    }

    @Override
    public List<ColumnInfo> columns(String tableName) {
        return null;
    }
}
