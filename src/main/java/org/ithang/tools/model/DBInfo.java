package org.ithang.tools.model;

import lombok.Data;

@Data
public class DBInfo {

	private long id;
	private String title;
	private String host;
	private String uname;
	private String upass;
	private int port;
	
	private String dbname;
	private String dbtype;//mysql,maria,dameng,h2
	private String opt;//备注
}
