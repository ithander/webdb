package org.ithang.model;

import lombok.Data;

@Data
public class TableInfo {

	private String tableName;
	private String size;
	private String unit;//单位b k m
	private long total;
	
}
