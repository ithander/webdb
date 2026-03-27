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
            List<Map<String, Object>> dbs = handler.getJdbcTemplate().queryForList("SHOW DATABASES");
            List<String> dbNames = new ArrayList<>();
            for (Map<String, Object> db : dbs) {
                for (Object val : db.values()) {
                    dbNames.add(val.toString());
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
            MySQLDbService mysqlService = handlerFactory.getMySQLService(title);
            if (mysqlService == null) {
                return fail("未找到会话: " + title);
            }
            List<TableInfo> tableInfos;
            if (StrUtil.isNotBlank(dbName)) {
                tableInfos = mysqlService.tables(dbName);
            } else {
                tableInfos = mysqlService.tables();
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
            String sql = "SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT " +
                         "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? " +
                         "ORDER BY ORDINAL_POSITION";
            List<Map<String, Object>> rows = handler.getJdbcTemplate().queryForList(sql, dbName, tableName);

            List<ColumnInfo> columns = new ArrayList<>();
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
