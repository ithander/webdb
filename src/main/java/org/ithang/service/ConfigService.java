package org.ithang.service;

import java.util.List;

import org.ithang.ModelDao;
import org.ithang.tools.model.DBInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ConfigService extends ModelDao<DBInfo>{

	public ConfigService(JdbcTemplate jdbcTemplate) {
		super(jdbcTemplate);
		initConfigTable();
	}
	
	public void initConfigTable() {
		String createTableSql = 
                "CREATE TABLE IF NOT EXISTS db_config (" +
		        "  id INT NOT NULL PRIMARY KEY,"+
                "  title VARCHAR(255) NOT NULL UNIQUE," +
                "  host VARCHAR(255) NOT NULL," +
                "  uname VARCHAR(255) NOT NULL," +
                "  upass VARCHAR(255) NOT NULL," +
                "  port INT NOT NULL," +
                "  dbname VARCHAR(255) NOT NULL," +
                "  dbtype VARCHAR(50) NOT NULL," +
                "  user_id VARCHAR(100)," +
                "  last_time VARCHAR(20)," +
                "  opt VARCHAR(200) " +
                ")";
        List<String> tables=listsColumn("select table_name from information_schema.tables where  table_schema='PUBLIC'",String.class);
        if(tables != null && (tables.contains("db_config")||tables.contains("DB_CONFIG "))) {
        	log.info("不用初始化db_config");
        }else {
        	updatesSQL(createTableSql);
        }
	}
	
	public int getMaxId() {
		return getsInt("select max(id) from db_config");
	}
	
	public DBInfo getInfoByTitle(String title) {
		return getsBean("select * from db_config where title=?",title);
	}
	
	public boolean hasInfo(String title) {
		return getsColumn("select count(0) from db_config where title='"+title+"'",Integer.class)>0;
	}
	
	public void dropTable(String tableName) {
		updatesSQL("drop table "+tableName);
	}

}
