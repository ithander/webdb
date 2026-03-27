# WebDB 查询功能使用指南

## 🎯 功能概述

在【查询】标签页中，用户可以输入 SQL 语句并执行，查询结果将使用 Layui Table 组件以表格形式展示。

## 🔧 技术实现

### 后端接口

#### 1. 执行查询（SELECT）
```
POST /webdb/db/mysql/executeQuery
Content-Type: application/json

{
  "title": "会话标题",
  "sql": "SELECT * FROM users"
}
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "data": [
      {"id": 1, "name": "John", "email": "john@example.com"},
      {"id": 2, "name": "Jane", "email": "jane@example.com"}
    ],
    "count": 2,
    "duration": 0.05,
    "sql": "SELECT * FROM users"
  }
}
```

#### 2. 执行更新（INSERT/UPDATE/DELETE）
```
POST /webdb/db/mysql/executeUpdate
Content-Type: application/json

{
  "title": "会话标题",
  "sql": "UPDATE users SET status = 'active' WHERE id = 1"
}
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "affectedRows": 1,
    "duration": 0.03,
    "sql": "UPDATE users SET status = 'active' WHERE id = 1"
  }
}
```

### 前端实现

#### 1. SQL 语句类型判断
```javascript
var sqlUpper = sql.toUpperCase().trim();
var isQuery = sqlUpper.startsWith('SELECT') || 
              sqlUpper.startsWith('SHOW') || 
              sqlUpper.startsWith('DESCRIBE') ||
              sqlUpper.startsWith('DESC') ||
              sqlUpper.startsWith('EXPLAIN');
```

支持的查询语句：
- `SELECT` - 查询数据
- `SHOW` - 显示数据库信息
- `DESCRIBE` / `DESC` - 显示表结构
- `EXPLAIN` - 查询执行计划

#### 2. Layui Table 渲染
```javascript
layui.use('table', function(){
  var table = layui.table;
  
  table.render({
    elem: '#resultTable',
    data: rows,
    cols: [columns],
    page: true,
    limit: 50,
    limits: [10, 20, 50, 100, 200],
    skin: 'line',
    even: true,
    size: 'sm'
  });
});
```

**配置说明**：
- `page: true` - 启用分页
- `limit: 50` - 每页显示 50 条
- `limits: [10, 20, 50, 100, 200]` - 可选的每页条数
- `skin: 'line'` - 表格样式（行边框）
- `even: true` - 隔行变色
- `size: 'sm'` - 小尺寸表格

## 📝 使用步骤

### 1. 输入 SQL 语句
在 SQL 编辑器中输入查询语句：
```sql
SELECT * FROM users WHERE status = 'active' LIMIT 10;
```

### 2. 执行查询
点击【执行】按钮或按 `F9` 快捷键

### 3. 查看结果
- **查询语句**：结果以表格形式展示，支持分页
- **更新语句**：显示影响的行数和执行时间

### 4. 状态信息
底部状态栏显示：
- 执行状态（就绪/执行中/成功/失败）
- 连接信息
- 查询耗时和返回行数

## 🎨 界面展示

### 查询成功
```
┌─────────────────────────────────────────────┐
│ SELECT * FROM users;                        │
│                                             │
└─────────────────────────────────────────────┘
  [执行 (F9)]  [清空]

┌─────────────────────────────────────────────┐
│ ┌────┬──────┬──────────────────┬─────────┐ │
│ │ id │ name │ email            │ status  │ │
│ ├────┼──────┼──────────────────┼─────────┤ │
│ │ 1  │ John │ john@example.com │ active  │ │
│ │ 2  │ Jane │ jane@example.com │ active  │ │
│ │ 3  │ Bob  │ bob@example.com  │ pending │ │
│ └────┴──────┴──────────────────┴─────────┘ │
│                                             │
│ [< 上一页]  1/3  [下一页 >]  每页 50 条     │
└─────────────────────────────────────────────┘

状态栏: 查询成功 | 已连接: localhost | 查询耗时: 0.05 秒 | 返回 3 行
```

### 更新成功
```
┌─────────────────────────────────────────────┐
│ UPDATE users SET status = 'active';         │
│                                             │
└─────────────────────────────────────────────┘
  [执行 (F9)]  [清空]

┌─────────────────────────────────────────────┐
│ ✓ 执行成功                                   │
│ 影响行数: 5                                  │
│ 耗时: 0.03 秒                                │
└─────────────────────────────────────────────┘

状态栏: 执行成功 | 已连接: localhost | 执行耗时: 0.03 秒 | 影响 5 行
```

### 执行失败
```
┌─────────────────────────────────────────────┐
│ SELECT * FROM non_exist_table;              │
│                                             │
└─────────────────────────────────────────────┘
  [执行 (F9)]  [清空]

┌─────────────────────────────────────────────┐
│ ✗ 执行失败                                   │
│ Table 'database.non_exist_table' doesn't    │
│ exist                                       │
└─────────────────────────────────────────────┘

状态栏: 执行失败 | 已连接: localhost
```

## 🔑 快捷键

| 快捷键 | 功能 |
|--------|------|
| F9 | 执行查询 |
| Ctrl+N | 新建查询 |
| Ctrl+A | 全选 SQL |

## 📊 Layui Table 特性

### 1. 自动列宽
- 根据数据内容自动调整列宽
- 最小宽度：120px
- 支持手动拖拽调整

### 2. 分页功能
- 默认每页 50 条
- 可选：10, 20, 50, 100, 200 条/页
- 显示总页数和当前页

### 3. 表格样式
- 行边框样式（`skin: 'line'`）
- 隔行变色（`even: true`）
- 小尺寸表格（`size: 'sm'`）

### 4. 空数据处理
- 显示友好的空数据提示
- 图标 + 文字说明

## 🚀 性能优化

### 1. 前端分页
- 使用 Layui Table 内置分页
- 减少 DOM 渲染压力
- 提升大数据集展示性能

### 2. 动态列生成
```javascript
// 从第一行数据中提取列名
var columns = [];
for (var key in firstRow) {
  columns.push({
    field: key,
    title: key,
    minWidth: 120
  });
}
```

### 3. 错误处理
- 前端验证（SQL 不能为空）
- 后端异常捕获
- 友好的错误提示

## 🔧 扩展功能（待开发）

### 1. SQL 语法高亮
```javascript
// 使用 CodeMirror 或 Monaco Editor
var editor = CodeMirror.fromTextArea(document.getElementById('sqlEditor'), {
  mode: 'text/x-mysql',
  theme: 'default',
  lineNumbers: true
});
```

### 2. 自动补全
- 表名补全
- 字段名补全
- SQL 关键字补全

### 3. 查询历史
- 保存最近执行的查询
- 快速重新执行
- 查询收藏功能

### 4. 结果导出
- 导出为 CSV
- 导出为 Excel
- 导出为 JSON

### 5. 多结果集支持
- 执行多条 SQL 语句
- 显示多个结果表格
- 标签页切换

## 📝 示例 SQL

### 查询示例
```sql
-- 简单查询
SELECT * FROM users;

-- 条件查询
SELECT id, name, email FROM users WHERE status = 'active';

-- 连接查询
SELECT u.name, o.order_no, o.amount 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id;

-- 聚合查询
SELECT status, COUNT(*) as count 
FROM users 
GROUP BY status;

-- 显示表结构
DESCRIBE users;
SHOW TABLES;
SHOW COLUMNS FROM users;
```

### 更新示例
```sql
-- 插入数据
INSERT INTO users (name, email, status) 
VALUES ('Tom', 'tom@example.com', 'active');

-- 更新数据
UPDATE users SET status = 'inactive' WHERE id = 1;

-- 删除数据
DELETE FROM users WHERE status = 'inactive';

-- 批量更新
UPDATE users SET updated_at = NOW() WHERE status = 'active';
```

## ⚠️ 注意事项

### 1. SQL 注入防护
- 后端使用 PreparedStatement（JdbcTemplate 自动处理）
- 避免直接拼接 SQL
- 验证用户输入

### 2. 权限控制
- 检查用户是否有执行权限
- 限制危险操作（DROP, TRUNCATE）
- 记录操作日志

### 3. 性能考虑
- 限制返回行数（建议使用 LIMIT）
- 避免全表扫描
- 优化复杂查询

### 4. 事务处理
- 更新操作自动提交
- 支持手动事务控制（待开发）
- 回滚机制

## 🐛 常见问题

### Q1: 查询结果不显示
**A**: 检查以下几点：
1. 是否已连接数据库
2. SQL 语句是否正确
3. 表是否存在
4. 是否有查询权限

### Q2: 中文显示乱码
**A**: 确保数据库连接使用 UTF-8 编码：
```
jdbc:mysql://localhost:3306/db?useUnicode=true&characterEncoding=utf8
```

### Q3: 查询超时
**A**: 
1. 优化 SQL 语句
2. 添加索引
3. 增加超时时间配置

### Q4: 表格列太多显示不全
**A**: 
1. 使用横向滚动条
2. 选择需要的列查询
3. 调整浏览器窗口大小

## 📚 相关文档

- [Layui Table 文档](https://layui.dev/docs/2/table/)
- [Spring JdbcTemplate 文档](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html)
- [MySQL SQL 语法](https://dev.mysql.com/doc/refman/8.0/en/sql-statements.html)

---

**更新日期**: 2026-03-06
**版本**: v1.0
