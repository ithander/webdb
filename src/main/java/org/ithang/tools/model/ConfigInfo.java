package org.ithang.tools.model;

import java.util.List;

import lombok.Data;

@Data
public class ConfigInfo {

	List<MySQLInfo> mysqls;
	List<MariaDBInfo> marias;
	
}
