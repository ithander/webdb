package org.ithang.model;

import lombok.Data;

@Data
public class ColumnInfo {

	private String colunmName;
	private String columnType;
	private int size;
	private String opt;//备注
	private boolean primaryKey;
	private boolean unique;
	private boolean index;
	private String defaultValue;
	private boolean nullable;
}
