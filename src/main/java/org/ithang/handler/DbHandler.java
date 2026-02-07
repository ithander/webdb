package org.ithang.handler;

import org.ithang.tools.model.DBInfo;
import org.springframework.jdbc.core.JdbcTemplate;

import com.zaxxer.hikari.HikariDataSource;

/**
 * 以标准SQL为准
 */
public class DbHandler {
	
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
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        
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
	
	private String url(DBInfo info) {
		String url=null;
		switch(info.getDbtype()) {
		    case "mysql":{
		    	url = String.format("jdbc:mysql://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };
		    case "maria":{
		    	url = String.format("jdbc:mariadb://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };break;
		    case "dameng":{
		    	url = String.format("jdbc:dm://%s:%d/%s?useSSL=true", info.getHost(),info.getPort(),info.getDbname());
		    };break;
		}
		return url;
	}
	
	/**
	 * 执行命令或SQL
	 * @param cmdSQL
	 */
	public void execute(String cmdSQL) {
		jdbcTemplate.execute(cmdSQL);
	}
	
	
}
