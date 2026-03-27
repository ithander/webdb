package org.ithang.handler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.ithang.service.ConfigService;
import org.ithang.service.DbService;
import org.ithang.service.MySQLDbService;
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
		}
		return null;
	}
	
	public DbHandler getHandler(String title) {
		DbHandler handler=null;
		if(handlerMap.containsKey(title)) {
			handler=handlerMap.get(title);
		}else {
			DBInfo dbInfo=configService.getInfoByTitle(title);//获取数据库配置信息
			handler=createHandler(dbInfo);
			handlerMap.put(title, handler);
			infos.add(dbInfo);
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
	}
	
	
}
