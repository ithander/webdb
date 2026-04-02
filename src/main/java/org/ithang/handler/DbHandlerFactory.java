package org.ithang.handler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.ithang.service.ConfigService;
import org.ithang.service.DaMengDbService;
import org.ithang.service.DbService;
import org.ithang.service.MySQLDbService;
import org.ithang.service.OracleDbService;
import org.ithang.service.PostgresDbService;
import org.ithang.tools.model.DBInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DbHandlerFactory {

	@Autowired
	private ConfigService configService;
	private final static List<DBInfo> infos=new ArrayList<>();
	private final static Map<String,DbHandler> handlerMap=new HashMap<>();//存放对应的handler类
	private final static Map<String,DbService> serviceMap=new HashMap<>();//存放对应的service类
	
	public DbHandler createHandler(DBInfo dbInfo) {
		switch(dbInfo.getDbtype()) {
		    case "mysql": return new MySQLDbHandler(dbInfo);
		    case "maria": return new MySQLDbHandler(dbInfo);
		    case "dm": return new DaMengDbHandler(dbInfo);
		    case "oracle": return new OracleDbHandler(dbInfo);
		    case "pg": return new PostgresDbHandler(dbInfo);
		}
		return null;
	}
	
	public DbHandler getHandler(String title) {
		DbHandler handler=null;
		if(handlerMap.containsKey(title)) {
			handler=handlerMap.get(title);
			// 检查连接池是否已关闭，如果关闭则重新创建
			if(handler != null && handler.getDataSource() instanceof com.zaxxer.hikari.HikariDataSource) {
				com.zaxxer.hikari.HikariDataSource ds = (com.zaxxer.hikari.HikariDataSource) handler.getDataSource();
				if(ds.isClosed()) {
					handlerMap.remove(title);
					serviceMap.remove(title);
					handler = null;
				}
			}
		}
		if(handler == null) {
			DBInfo dbInfo=configService.getInfoByTitle(title);
			if(dbInfo != null) {
				handler=createHandler(dbInfo);
				handlerMap.put(title, handler);
			}
		}
		return handler;
	}
	
	public MySQLDbService getMySQLService(String title) {
		if(serviceMap.containsKey(title)) {
			return (MySQLDbService)serviceMap.get(title);
		}else {
			DbHandler handler=getHandler(title);
			if(null!=handler) {
				MySQLDbService mysqlService=new MySQLDbService(((MySQLDbHandler)handler));
				serviceMap.put(title, mysqlService);
				return mysqlService;
			}
		}
		return null;
	}

	public DaMengDbService getDaMengService(String title) {
		if(serviceMap.containsKey(title)) {
			return (DaMengDbService)serviceMap.get(title);
		}else {
			DbHandler handler=getHandler(title);
			if(null!=handler && handler instanceof DaMengDbHandler) {
				DaMengDbService dmService=new DaMengDbService((DaMengDbHandler)handler);
				serviceMap.put(title, dmService);
				return dmService;
			}
		}
		return null;
	}

	public OracleDbService getOracleService(String title) {
		if(serviceMap.containsKey(title)) {
			return (OracleDbService)serviceMap.get(title);
		}else {
			DbHandler handler=getHandler(title);
			if(null!=handler && handler instanceof OracleDbHandler) {
				OracleDbService oracleService=new OracleDbService((OracleDbHandler)handler);
				serviceMap.put(title, oracleService);
				return oracleService;
			}
		}
		return null;
	}

	public PostgresDbService getPostgresService(String title) {
		if(serviceMap.containsKey(title)) {
			return (PostgresDbService)serviceMap.get(title);
		}else {
			DbHandler handler=getHandler(title);
			if(null!=handler && handler instanceof PostgresDbHandler) {
				PostgresDbService pgService=new PostgresDbService((PostgresDbHandler)handler);
				serviceMap.put(title, pgService);
				return pgService;
			}
		}
		return null;
	}

	/**
	 * 根据数据库类型获取对应的 DbService
	 */
	public DbService getDbService(String title) {
		DBInfo info = configService.getInfoByTitle(title);
		if (info == null) return null;
		switch(info.getDbtype()) {
			case "mysql":
			case "maria":
				return getMySQLService(title);
			case "dm":
				return getDaMengService(title);
			case "oracle":
				return getOracleService(title);
			case "pg":
				return getPostgresService(title);
			default:
				return getMySQLService(title);
		}
	}
	
	/**
	 * 判断是否有 已经连好的handler
	 * @return
	 */
	public boolean hasHandler() {
		return !handlerMap.isEmpty();
	}
	
	/**
	 * 获取所有练级好的infos
	 * @return
	 */
	public List<DBInfo> getInfos() {
		return infos;
	}
	
	public void delHandler(String title) {
		if(handlerMap.containsKey(title)) {
			DbHandler handler=handlerMap.get(title);
			if(null!=handler) {
				handler.close();
			}
			handlerMap.remove(title);
		}
		serviceMap.remove(title);
	}
	
	
}
