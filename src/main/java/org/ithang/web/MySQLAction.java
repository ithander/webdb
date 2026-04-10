package org.ithang.web;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.ithang.ActionResult;
import org.ithang.handler.DbHandler;
import org.ithang.handler.DbHandlerFactory;
import org.ithang.model.TableInfo;
import org.ithang.service.ConfigService;
import org.ithang.service.MySQLDbService;
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
@RequestMapping("db/mysql")
public class MySQLAction extends DbAction{
	
	@Autowired
	private DbHandlerFactory handlerFactory;
	
	@Autowired
	private ConfigService configService;
	
	/**
	 * 根据 dbName 切换数据库上下文
	 */
	private void switchDbContext(DbHandler handler, String title, String dbName) {
		if (StrUtil.isBlank(dbName)) return;
		try {
			DBInfo info = configService.getInfoByTitle(title);
			String dbtype = info != null ? info.getDbtype() : "mysql";
			if ("pg".equals(dbtype)) {
				handler.getJdbcTemplate().execute("SET search_path TO " + dbName);
			} else if ("oracle".equals(dbtype) || "dm".equals(dbtype)) {
				handler.getJdbcTemplate().execute("ALTER SESSION SET CURRENT_SCHEMA = " + dbName);
			} else {
				handler.getJdbcTemplate().execute("USE " + dbName);
			}
		} catch (Exception e) {
			log.warn("切换数据库上下文失败: {}", e.getMessage());
		}
	}

	/**
	 * 查询库中所有表
	 * dbName 数据库名称
	 */
	@GetMapping("tables")
	@Override
	public ActionResult tables(@RequestParam("title")String title,
			                   @RequestParam(value="dbName",required = false)String dbName) {
		MySQLDbService mysqlService=handlerFactory.getMySQLService(title);
		List<TableInfo> tableInfos=null;
		if(StrUtil.isNotBlank(dbName)) {
			tableInfos=mysqlService.tables(dbName);
		}else {
			tableInfos=mysqlService.tables();
		}
		return success(0, tableInfos);
	}

	/**
	 * 查询指定表字段
	 */
	@Override
	public ActionResult tableColumns(String title,String dbName,String tableName) {
		return null;
	}
	
	/**
	 * 执行 SQL 查询
	 * @param params 包含 title 和 sql 的参数
	 * @return 查询结果
	 */
	@PostMapping("executeQuery")
	public ActionResult executeQuery(@RequestBody Map<String, String> params) {
		String title = params.get("title");
		String sql = params.get("sql");
		String dbName = params.get("dbName");
		
		if (StrUtil.isBlank(title)) {
			return fail("会话标题不能为空");
		}
		
		if (StrUtil.isBlank(sql)) {
			return fail("SQL 语句不能为空");
		}
		
		try {
			log.info("执行 SQL 查询 - 会话: {}, 数据库: {}, SQL: {}", title, dbName, sql);
			
			long startTime = System.currentTimeMillis();
			
			// 获取数据库处理器
			DbHandler handler = handlerFactory.getHandler(title);
			if (handler == null) {
				return fail("未找到会话: " + title);
			}
			
			// 切换数据库上下文
			switchDbContext(handler, title, dbName);
			
			// 执行查询
			List<Map<String, Object>> resultList = handler.getJdbcTemplate().queryForList(sql);
			
			long endTime = System.currentTimeMillis();
			double duration = (endTime - startTime) / 1000.0;
			
			// 构建返回结果
			Map<String, Object> result = new HashMap<>();
			result.put("data", resultList);
			result.put("count", resultList.size());
			result.put("duration", duration);
			result.put("sql", sql);
			
			log.info("查询成功 - 返回 {} 行数据, 耗时: {} 秒", resultList.size(), duration);
			
			// 使用 ActionResult 构造器
			ActionResult actionResult = new ActionResult();
			actionResult.setCode(0);
			actionResult.setMsg("success");
			actionResult.setData(result);
			return actionResult;
			
		} catch (Exception e) {
			log.error("执行 SQL 查询失败: {}", e.getMessage(), e);
			return fail("查询失败: " + e.getMessage());
		}
	}
	
	/**
	 * 执行 SQL 更新（INSERT, UPDATE, DELETE）
	 * @param params 包含 title 和 sql 的参数
	 * @return 执行结果
	 */
	@PostMapping("executeUpdate")
	public ActionResult executeUpdate(@RequestBody Map<String, String> params) {
		String title = params.get("title");
		String sql = params.get("sql");
		String dbName = params.get("dbName");
		
		if (StrUtil.isBlank(title)) {
			return fail("会话标题不能为空");
		}
		
		if (StrUtil.isBlank(sql)) {
			return fail("SQL 语句不能为空");
		}
		
		try {
			log.info("执行 SQL 更新 - 会话: {}, 数据库: {}, SQL: {}", title, dbName, sql);
			
			long startTime = System.currentTimeMillis();
			
			// 获取数据库处理器
			DbHandler handler = handlerFactory.getHandler(title);
			if (handler == null) {
				return fail("未找到会话: " + title);
			}
			
			// 切换数据库上下文
			switchDbContext(handler, title, dbName);
			
			// 执行更新
			int affectedRows = handler.getJdbcTemplate().update(sql);
			
			long endTime = System.currentTimeMillis();
			double duration = (endTime - startTime) / 1000.0;
			
			// 构建返回结果
			Map<String, Object> result = new HashMap<>();
			result.put("affectedRows", affectedRows);
			result.put("duration", duration);
			result.put("sql", sql);
			
			log.info("更新成功 - 影响 {} 行, 耗时: {} 秒", affectedRows, duration);
			
			// 使用 ActionResult 构造器
			ActionResult actionResult = new ActionResult();
			actionResult.setCode(0);
			actionResult.setMsg("success");
			actionResult.setData(result);
			return actionResult;
			
		} catch (Exception e) {
			log.error("执行 SQL 更新失败: {}", e.getMessage(), e);
			return fail("更新失败: " + e.getMessage());
		}
	}

}
