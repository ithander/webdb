package org.ithang.web;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import java.sql.Connection;

import org.ithang.ActionResult;
import org.ithang.handler.DbHandler;
import org.ithang.handler.DbHandlerFactory;
import org.ithang.model.ColumnInfo;
import org.ithang.service.ConfigService;
import org.ithang.service.DbService;
import org.ithang.service.MySQLDbService;
import org.ithang.model.TableInfo;
import org.ithang.tools.model.DBInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("session")
public class SessionAction extends DbAction {

    @Autowired
    private DbHandlerFactory handlerFactory;

    @Autowired
    private ConfigService configService;

    /**
     * 连接指定会话（建立数据库连接）
     */
    @GetMapping("connect")
    public ActionResult connect(@RequestParam("title") String title) {
        if (StrUtil.isBlank(title)) {
            return fail("会话标题不能为空");
        }
        try {
            DBInfo info = configService.getInfoByTitle(title);
            if (info == null) {
                return fail("未找到会话配置: " + title);
            }
            DbHandler handler = handlerFactory.getHandler(title);
            if (handler == null) {
                return fail("创建连接失败");
            }
            // 测试连接是否可用
            Connection conn = handler.getDataSource().getConnection();
            conn.close();
            log.info("会话 {} 连接成功", title);
            return success(0, "连接成功");
        } catch (Exception e) {
            log.error("连接失败: {}", e.getMessage(), e);
            return fail("连接失败: " + e.getMessage());
        }
    }

    /**
     * 获取指定会话下的所有数据库名称
     */
    @GetMapping("databases")
    public ActionResult databases(@RequestParam("title") String title) {
        if (StrUtil.isBlank(title)) {
            return fail("会话标题不能为空");
        }
        try {
            DbHandler handler = handlerFactory.getHandler(title);
            if (handler == null) {
                return fail("未找到会话: " + title);
            }
            DBInfo info = configService.getInfoByTitle(title);
            String dbtype = info != null ? info.getDbtype() : "mysql";

            List<String> dbNames = new ArrayList<>();
            if ("dm".equals(dbtype)) {
                // 达梦：查询所有 schema
                List<Map<String, Object>> schemas = handler.getJdbcTemplate().queryForList(
                    "SELECT DISTINCT OWNER FROM ALL_TABLES ORDER BY OWNER");
                for (Map<String, Object> s : schemas) {
                    dbNames.add(s.values().iterator().next().toString());
                }
            } else if ("oracle".equals(dbtype)) {
                // Oracle：查询所有 schema
                List<Map<String, Object>> schemas = handler.getJdbcTemplate().queryForList(
                    "SELECT DISTINCT OWNER FROM ALL_TABLES ORDER BY OWNER");
                for (Map<String, Object> s : schemas) {
                    dbNames.add(s.values().iterator().next().toString());
                }
            } else if ("pg".equals(dbtype)) {
                // PostgreSQL：查询所有 schema
                List<Map<String, Object>> schemas = handler.getJdbcTemplate().queryForList(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY schema_name");
                for (Map<String, Object> s : schemas) {
                    dbNames.add(s.values().iterator().next().toString());
                }
            } else {
                // MySQL/MariaDB
                List<Map<String, Object>> dbs = handler.getJdbcTemplate().queryForList("SHOW DATABASES");
                for (Map<String, Object> db : dbs) {
                    for (Object val : db.values()) {
                        dbNames.add(val.toString());
                    }
                }
            }
            return success(0, dbNames);
        } catch (Exception e) {
            log.error("获取数据库列表失败: {}", e.getMessage(), e);
            return fail("获取数据库列表失败: " + e.getMessage());
        }
    }

    /**
     * 获取指定数据库下的所有表
     */
    @Override
    @GetMapping("tables")
    public ActionResult tables(@RequestParam("title") String title,
                               @RequestParam(value = "dbName", required = false) String dbName) {
        if (StrUtil.isBlank(title)) {
            return fail("会话标题不能为空");
        }
        try {
            DbService dbService = handlerFactory.getDbService(title);
            if (dbService == null) {
                return fail("未找到会话: " + title);
            }
            List<TableInfo> tableInfos;
            if (StrUtil.isNotBlank(dbName)) {
                tableInfos = dbService.tables(dbName);
            } else {
                tableInfos = dbService.tables();
            }
            return success(0, tableInfos);
        } catch (Exception e) {
            log.error("获取表列表失败: {}", e.getMessage(), e);
            return fail("获取表列表失败: " + e.getMessage());
        }
    }

    /**
     * 获取指定表的字段信息
     */
    @Override
    @GetMapping("columns")
    public ActionResult tableColumns(@RequestParam("title") String title,
                                     @RequestParam("dbName") String dbName,
                                     @RequestParam("tableName") String tableName) {
        if (StrUtil.isBlank(title) || StrUtil.isBlank(tableName)) {
            return fail("参数不能为空");
        }
        try {
            DbHandler handler = handlerFactory.getHandler(title);
            if (handler == null) {
                return fail("未找到会话: " + title);
            }
            DBInfo info = configService.getInfoByTitle(title);
            String dbtype = info != null ? info.getDbtype() : "mysql";

            List<ColumnInfo> columns = new ArrayList<>();

            if ("dm".equals(dbtype)) {
                // 达梦字段查询
                String sql = "SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT " +
                             "FROM ALL_TAB_COLUMNS WHERE OWNER = ? AND TABLE_NAME = ? " +
                             "ORDER BY COLUMN_ID";
                List<Map<String, Object>> rows = handler.getJdbcTemplate().queryForList(sql, dbName.toUpperCase(), tableName.toUpperCase());
                String pkSql = "SELECT COLUMN_NAME FROM ALL_CONS_COLUMNS ACC " +
                               "JOIN ALL_CONSTRAINTS AC ON ACC.CONSTRAINT_NAME = AC.CONSTRAINT_NAME AND ACC.OWNER = AC.OWNER " +
                               "WHERE AC.CONSTRAINT_TYPE = 'P' AND AC.OWNER = ? AND AC.TABLE_NAME = ?";
                List<String> pkCols = handler.getJdbcTemplate().queryForList(pkSql, String.class, dbName.toUpperCase(), tableName.toUpperCase());

                for (Map<String, Object> row : rows) {
                    ColumnInfo col = new ColumnInfo();
                    String colName = String.valueOf(row.get("COLUMN_NAME"));
                    String dataType = String.valueOf(row.get("DATA_TYPE"));
                    Object dataLen = row.get("DATA_LENGTH");
                    col.setColunmName(colName);
                    col.setColumnType(dataLen != null ? dataType + "(" + dataLen + ")" : dataType);
                    col.setPrimaryKey(pkCols.contains(colName));
                    col.setNullable("Y".equals(String.valueOf(row.get("NULLABLE"))));
                    Object defVal = row.get("DATA_DEFAULT");
                    col.setDefaultValue(defVal != null ? String.valueOf(defVal).trim() : "");
                    col.setOpt("");
                    columns.add(col);
                }
            } else if ("oracle".equals(dbtype)) {
                // Oracle 字段查询
                String sql = "SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE, DATA_DEFAULT " +
                             "FROM ALL_TAB_COLUMNS WHERE OWNER = ? AND TABLE_NAME = ? " +
                             "ORDER BY COLUMN_ID";
                List<Map<String, Object>> rows = handler.getJdbcTemplate().queryForList(sql, dbName.toUpperCase(), tableName.toUpperCase());
                String pkSql = "SELECT ACC.COLUMN_NAME FROM ALL_CONS_COLUMNS ACC " +
                               "JOIN ALL_CONSTRAINTS AC ON ACC.CONSTRAINT_NAME = AC.CONSTRAINT_NAME AND ACC.OWNER = AC.OWNER " +
                               "WHERE AC.CONSTRAINT_TYPE = 'P' AND AC.OWNER = ? AND AC.TABLE_NAME = ?";
                List<String> pkCols = handler.getJdbcTemplate().queryForList(pkSql, String.class, dbName.toUpperCase(), tableName.toUpperCase());
                // 查询字段注释
                String commentSql = "SELECT COLUMN_NAME, COMMENTS FROM ALL_COL_COMMENTS WHERE OWNER = ? AND TABLE_NAME = ?";
                Map<String, String> commentMap = new HashMap<>();
                handler.getJdbcTemplate().queryForList(commentSql, dbName.toUpperCase(), tableName.toUpperCase())
                    .forEach(r -> commentMap.put(String.valueOf(r.get("COLUMN_NAME")), String.valueOf(r.getOrDefault("COMMENTS", ""))));

                for (Map<String, Object> row : rows) {
                    ColumnInfo col = new ColumnInfo();
                    String colName = String.valueOf(row.get("COLUMN_NAME"));
                    String dataType = String.valueOf(row.get("DATA_TYPE"));
                    Object precision = row.get("DATA_PRECISION");
                    Object scale = row.get("DATA_SCALE");
                    Object dataLen = row.get("DATA_LENGTH");
                    // Oracle 类型显示：NUMBER(10,2)、VARCHAR2(100)
                    if (precision != null && !"null".equals(String.valueOf(precision))) {
                        col.setColumnType(scale != null && !"0".equals(String.valueOf(scale)) && !"null".equals(String.valueOf(scale))
                            ? dataType + "(" + precision + "," + scale + ")"
                            : dataType + "(" + precision + ")");
                    } else if (dataLen != null) {
                        col.setColumnType(dataType + "(" + dataLen + ")");
                    } else {
                        col.setColumnType(dataType);
                    }
                    col.setColunmName(colName);
                    col.setPrimaryKey(pkCols.contains(colName));
                    col.setNullable("Y".equals(String.valueOf(row.get("NULLABLE"))));
                    Object defVal = row.get("DATA_DEFAULT");
                    col.setDefaultValue(defVal != null ? String.valueOf(defVal).trim() : "");
                    col.setOpt(commentMap.getOrDefault(colName, ""));
                    columns.add(col);
                }
            } else if ("pg".equals(dbtype)) {
                // PostgreSQL 字段查询
                String sql = "SELECT c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale, " +
                             "c.is_nullable, c.column_default, " +
                             "pgd.description AS column_comment " +
                             "FROM information_schema.columns c " +
                             "LEFT JOIN pg_catalog.pg_statio_all_tables st ON st.schemaname = c.table_schema AND st.relname = c.table_name " +
                             "LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position " +
                             "WHERE c.table_schema = ? AND c.table_name = ? " +
                             "ORDER BY c.ordinal_position";
                List<Map<String, Object>> rows = handler.getJdbcTemplate().queryForList(sql, dbName, tableName);
                // 查询主键
                String pkSql = "SELECT kcu.column_name FROM information_schema.table_constraints tc " +
                               "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema " +
                               "WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ? AND tc.table_name = ?";
                List<String> pkCols = handler.getJdbcTemplate().queryForList(pkSql, String.class, dbName, tableName);
                // 查询唯一约束
                String uqSql = "SELECT kcu.column_name FROM information_schema.table_constraints tc " +
                               "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema " +
                               "WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = ? AND tc.table_name = ?";
                List<String> uqCols = handler.getJdbcTemplate().queryForList(uqSql, String.class, dbName, tableName);

                for (Map<String, Object> row : rows) {
                    ColumnInfo col = new ColumnInfo();
                    String colName = String.valueOf(row.get("column_name"));
                    String dataType = String.valueOf(row.get("data_type"));
                    Object charLen = row.get("character_maximum_length");
                    Object numPrec = row.get("numeric_precision");
                    Object numScale = row.get("numeric_scale");
                    // 类型显示
                    if (charLen != null) {
                        col.setColumnType(dataType + "(" + charLen + ")");
                    } else if (numPrec != null) {
                        col.setColumnType(numScale != null && !"0".equals(String.valueOf(numScale))
                            ? dataType + "(" + numPrec + "," + numScale + ")"
                            : dataType + "(" + numPrec + ")");
                    } else {
                        col.setColumnType(dataType);
                    }
                    col.setColunmName(colName);
                    col.setPrimaryKey(pkCols.contains(colName));
                    col.setUnique(uqCols.contains(colName));
                    col.setNullable("YES".equals(String.valueOf(row.get("is_nullable"))));
                    Object defVal = row.get("column_default");
                    col.setDefaultValue(defVal != null ? String.valueOf(defVal) : "");
                    Object comment = row.get("column_comment");
                    col.setOpt(comment != null ? String.valueOf(comment) : "");
                    columns.add(col);
                }
            } else {
                // MySQL/MariaDB
                String sql = "SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT " +
                             "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? " +
                             "ORDER BY ORDINAL_POSITION";
                List<Map<String, Object>> rows = handler.getJdbcTemplate().queryForList(sql, dbName, tableName);

                for (Map<String, Object> row : rows) {
                    ColumnInfo col = new ColumnInfo();
                    col.setColunmName(String.valueOf(row.get("COLUMN_NAME")));
                    col.setColumnType(String.valueOf(row.get("COLUMN_TYPE")));
                    col.setPrimaryKey("PRI".equals(String.valueOf(row.get("COLUMN_KEY"))));
                    col.setUnique("UNI".equals(String.valueOf(row.get("COLUMN_KEY"))));
                    col.setNullable("YES".equals(String.valueOf(row.get("IS_NULLABLE"))));
                    Object defVal = row.get("COLUMN_DEFAULT");
                    col.setDefaultValue(defVal != null ? String.valueOf(defVal) : "");
                    col.setOpt(String.valueOf(row.getOrDefault("COLUMN_COMMENT", "")));
                    columns.add(col);
                }
            }
            return success(0, columns);
        } catch (Exception e) {
            log.error("获取字段信息失败: {}", e.getMessage(), e);
            return fail("获取字段信息失败: " + e.getMessage());
        }
    }

    /**
     * 修改表结构 - 对比原始字段和修改后的字段，生成 ALTER TABLE 语句执行
     */
    @PostMapping("alterTable")
    public ActionResult alterTable(@RequestBody Map<String, Object> params) {
        String title = (String) params.get("title");
        String dbName = (String) params.get("dbName");
        String tableName = (String) params.get("tableName");
        List<Map<String, Object>> columns = (List<Map<String, Object>>) params.get("columns");
        List<Map<String, Object>> originalColumns = (List<Map<String, Object>>) params.get("originalColumns");

        if (StrUtil.isBlank(title) || StrUtil.isBlank(tableName) || columns == null) {
            return fail("参数不能为空");
        }

        try {
            DbHandler handler = handlerFactory.getHandler(title);
            if (handler == null) {
                return fail("未找到会话: " + title);
            }

            List<String> sqls = new ArrayList<>();
            String fullTableName = StrUtil.isNotBlank(dbName) ? dbName + "." + tableName : tableName;

            for (int i = 0; i < columns.size(); i++) {
                Map<String, Object> col = columns.get(i);
                String colName = (String) col.get("colunmName");
                String colType = (String) col.get("columnType");
                String comment = (String) col.get("opt");

                if (i < originalColumns.size()) {
                    // 修改已有字段
                    Map<String, Object> orig = originalColumns.get(i);
                    String origName = (String) orig.get("colunmName");
                    String origType = (String) orig.get("columnType");
                    String origComment = (String) orig.get("opt");
                    String origDefault = String.valueOf(orig.getOrDefault("defaultValue", ""));
                    Boolean origNullable = (Boolean) orig.get("nullable");

                    Boolean nullable = (Boolean) col.get("nullable");
                    String defaultValue = String.valueOf(col.getOrDefault("defaultValue", ""));

                    boolean nameChanged = !colName.equals(origName);
                    boolean typeChanged = !colType.equals(origType);
                    boolean commentChanged = !String.valueOf(comment).equals(String.valueOf(origComment));
                    boolean defaultChanged = !defaultValue.equals(origDefault);
                    boolean nullableChanged = (nullable != null && origNullable != null) ? !nullable.equals(origNullable) : false;

                    if (nameChanged || typeChanged || commentChanged || defaultChanged || nullableChanged) {
                        StringBuilder sb = new StringBuilder();
                        sb.append("ALTER TABLE ").append(fullTableName);
                        if (nameChanged) {
                            sb.append(" CHANGE COLUMN `").append(origName).append("` `").append(colName).append("` ").append(colType);
                        } else {
                            sb.append(" MODIFY COLUMN `").append(colName).append("` ").append(colType);
                        }
                        // nullable
                        if (nullable != null && !nullable) {
                            sb.append(" NOT NULL");
                        } else {
                            sb.append(" NULL");
                        }
                        // default value
                        if (StrUtil.isNotBlank(defaultValue)) {
                            sb.append(" DEFAULT '").append(defaultValue.replace("'", "\\'")).append("'");
                        }
                        if (StrUtil.isNotBlank(comment)) {
                            sb.append(" COMMENT '").append(comment.replace("'", "\\'")).append("'");
                        }
                        sqls.add(sb.toString());
                    }
                }
            }

            if (sqls.isEmpty()) {
                return success(0, "没有需要修改的内容");
            }

            // 逐条执行 ALTER 语句
            List<String> executed = new ArrayList<>();
            for (String sql : sqls) {
                log.info("执行 ALTER: {}", sql);
                handler.getJdbcTemplate().execute(sql);
                executed.add(sql);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("executed", executed);
            result.put("count", executed.size());
            return success(0, result);

        } catch (Exception e) {
            log.error("修改表结构失败: {}", e.getMessage(), e);
            return fail("修改失败: " + e.getMessage());
        }
    }
}
