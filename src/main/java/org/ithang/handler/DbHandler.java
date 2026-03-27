package org.ithang.handler;

import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.ithang.tools.model.DBInfo;
import org.ithang.tools.model.H2Info;
import org.springframework.jdbc.core.JdbcTemplate;

import com.zaxxer.hikari.HikariDataSource;

/**
 * 以标准SQL为准
 */
public abstract class DbHandler {
	
	private DBInfo info=null;
	private HikariDataSource dataSource=null;
    private JdbcTemplate jdbcTemplate=null;
    
	public DbHandler(DBInfo info) {
		this.info=info;
		dataSource = new HikariDataSource();
        
        // 基本连接配置
        dataSource.setJdbcUrl(url(info));
        dataSource.setUsername(info.getUname());
        dataSource.setPassword(info.getUpass());
        dataSource.setDriverClassName(getDriverClassName(info.getDbtype()));
        
        // 连接池优化配置
        dataSource.setMaximumPoolSize(7);
        dataSource.setMinimumIdle(3);
        dataSource.setConnectionTimeout(30000);
        dataSource.setIdleTimeout(300000);
        dataSource.setMaxLifetime(600000);
        dataSource.setAutoCommit(true);
        
        // 启用JMX监控
        dataSource.setRegisterMbeans(false);
        
        jdbcTemplate=new JdbcTemplate(dataSource);
	}
	
	public DBInfo getInfo() {
		return this.info;
	}
	
	public JdbcTemplate getJdbcTemplate() {
		return this.jdbcTemplate;
	}
	
	public DataSource getDataSource() {
		return this.dataSource;
	}
	
	public void close() {
		this.dataSource.close();
	}
	
	private String url(DBInfo info) {
		String url=null;
		switch(info.getDbtype()) {
		    case "mysql":{
		    	url = String.format("jdbc:mysql://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };break;
		    case "maria":{
		    	url = String.format("jdbc:mariadb://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };break;
		    case "dameng":{
		    	url = String.format("jdbc:dm://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };break;
		    case "h2":{
		    	H2Info hinfo=(H2Info)info;
		    	url = String.format("jdbc:h2:file:%s;MODE=%s", hinfo.getFilePath(),hinfo.getMode());
		    };break;
		}
		return url;
	}
	
	/**
	 * 获取数据库驱动类名
	 * @param dbtype 数据库类型
	 * @return 驱动类名
	 */
	private String getDriverClassName(String dbtype) {
		switch(dbtype) {
		    case "mysql": return "com.mysql.cj.jdbc.Driver";
		    case "maria": return "org.mariadb.jdbc.Driver";
		    case "dameng": return "dm.jdbc.driver.DmDriver";
		    case "h2": return "org.h2.Driver";
		    default: return "com.mysql.cj.jdbc.Driver";
		}
	}
	
	/**
	 * 执行命令或SQL
	 * @param cmdSQL
	 */
	public void execute(String cmdSQL) {
		jdbcTemplate.execute(cmdSQL);
	}
	
	public boolean testConnect() {
		return false;
	}
	
		
		
}
