package org.ithang.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.ithang.handler.PostgresDbHandler;
import org.ithang.model.ColumnInfo;
import org.ithang.model.TableInfo;
import org.springframework.jdbc.core.RowMapper;

public class PostgresDbService extends DbService {

    private static final String LIST_TABLES = """
            SELECT t.tablename AS table_name,
                   c.reltuples::bigint AS total
            FROM pg_catalog.pg_tables t
            JOIN pg_catalog.pg_class c ON c.relname = t.tablename
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
            WHERE t.schemaname = ?
            ORDER BY t.tablename
            """;

    private PostgresDbHandler handler;

    public PostgresDbService(PostgresDbHandler handler) {
        this.handler = handler;
    }

    @Override
    public List<TableInfo> tables() {
        return tables("public");
    }

    @Override
    public List<TableInfo> tables(String schemaName) {
        return handler.getJdbcTemplate().query(LIST_TABLES, new RowMapper<TableInfo>() {
            @Override
            public TableInfo mapRow(ResultSet rs, int rowNum) throws SQLException {
                TableInfo info = new TableInfo();
                info.setTableName(rs.getString("table_name"));
                info.setTotal(Math.max(0, rs.getLong("total")));
                info.setSize("0");
                return info;
            }
        }, schemaName);
    }

    @Override
    public List<ColumnInfo> columns(String tableName) {
        return null;
    }
}
