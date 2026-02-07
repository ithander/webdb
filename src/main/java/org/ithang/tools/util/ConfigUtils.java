package org.ithang.tools.util;

import java.io.File;

import org.ithang.tools.model.ConfigInfo;
import org.ithang.tools.model.DBInfo;

import cn.hutool.core.io.FileUtil;
import cn.hutool.json.JSONUtil;

public class ConfigUtils {
	
	private static ConfigInfo config=null;
	
    public static ConfigInfo getConfig() {
    	return ConfigUtils.config;
    }
    
    public static DBInfo getDbInfo(String title) {
    	DBInfo info=null;
    	if(null!=config.getMysqls()&&!config.getMysqls().isEmpty()) {
    		for(DBInfo db:config.getMysqls()) {
    			if(title.equals(db.getTitle())){
    				info=db;
    			}
    		}
    	}
    	if(null!=config.getMarias()&&!config.getMarias().isEmpty()) {
    		for(DBInfo db:config.getMarias()) {
    			if(title.equals(db.getTitle())){
    				info=db;
    			}
    		}
    	}
    	return info;
    }

	/**
	 * 保存配置到文件中
	 * @param info
	 */
	public static void saveConf(ConfigInfo info) {
		FileUtil.writeUtf8String(JSONUtil.toJsonStr(info), new File("./conf.json"));
	}
	
	/**
	 * 读取文件中的配置
	 * @return
	 */
	public static void readConf() {
		String conf=FileUtil.readUtf8String(new File("./conf.json"));
		config = JSONUtil.toBean(conf, ConfigInfo.class);
	}
}
