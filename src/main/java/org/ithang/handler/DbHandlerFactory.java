package org.ithang.handler;

import java.util.HashMap;
import java.util.Map;

import org.ithang.tools.model.DBInfo;
import org.ithang.tools.util.ConfigUtils;
import org.springframework.stereotype.Service;

@Service
public class DbHandlerFactory {

	private Map<String,DbHandler> handlerMap=new HashMap<>();
	
	public DbHandler createHandler(DBInfo dbInfo) {
		switch(dbInfo.getDbtype()) {
		    case "mysql":return new MySQLDbHandler(dbInfo);
		}
		return null;
	}
	
	public DbHandler getHandler(String title) {
		DbHandler handler=null;
		if(handlerMap.containsKey(title)) {
			handler=handlerMap.get(title);
		}else {
			DBInfo dbInfo=ConfigUtils.getDbInfo(title);
			handler=createHandler(dbInfo);
			handlerMap.put(title, handler);
		}
		return handler;
	}
	
	
}
