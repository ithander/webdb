package org.ithang.web;

import org.ithang.Action;
import org.ithang.ActionResult;

public abstract class DbAction extends Action{

	
	public abstract ActionResult tables(String title,String dbName);
	
	public abstract ActionResult tableColumns(String title,String dbName,String tableName);
	
}
