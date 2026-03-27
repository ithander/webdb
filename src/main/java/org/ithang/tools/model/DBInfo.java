package org.ithang.tools.model;

import org.ithang.meta.ID;
import org.ithang.meta.Table;

import lombok.Data;

@Data
@Table("db_config")
public class DBInfo {

	@ID
	private int id;
	private String title;
	private String host;
	private String uname;
	private String upass;
	private int port;
	
	private String dbname;
	private String dbtype;//mysql,maria,dameng,h2
	private String opt;//备注
}
