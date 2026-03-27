package org.ithang.web;

import java.util.Map;

import org.ithang.Action;
import org.ithang.ActionResult;
import org.ithang.PageResult;
import org.ithang.handler.DbHandlerFactory;
import org.ithang.service.ConfigService;
import org.ithang.tools.model.DBInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import cn.hutool.core.util.StrUtil;

@Controller
@RequestMapping("config")
public class ConfigAction extends Action{

	@Autowired
	private ConfigService configService;
	
	@Autowired
	private DbHandlerFactory handlerFactory;
	
	@GetMapping
	public String index() {
		return "config";
	}
	
	
	@GetMapping("form")
	public String form(@RequestParam(value="id",required = false,defaultValue = "0")long id,Model model) {
		if(id>0) {
			DBInfo info=configService.get(id);
			model.addAttribute("info", info);
		}else {
			model.addAttribute("info", new DBInfo());
		}
		return "configForm";
	}
	
	@ResponseBody
	@PostMapping("form")
	public Object formData(DBInfo info) {
			if(info.getId()>0) {
				int r=configService.upBean(info);
				if(r>0) {
					handlerFactory.delHandler(info.getTitle());
				}
			}else {
				if(configService.hasInfo(info.getTitle())) {
					return fail("会话名称重复！");
				}
				int id=configService.getMaxId();
				info.setId(id+1);
				configService.save(info);
			}
		return success();
	}
	
	@ResponseBody
	@PostMapping("del")
	public Object delteUsers(String ids) {
		if(null!=ids&&ids.trim().length()>0) {
			String[] delIds=ids.split(",");
			for(String id:delIds) {
				configService.deleteById(id);
			}
		}
		return success();
	}
	
	@ResponseBody
	@GetMapping("list")
	public Object list(@RequestParam(value="keyword",required = false,defaultValue = "") String keyword,
			           @RequestParam(value="page",required = false,defaultValue = "0") int page,
			           @RequestParam(value="limit",required = false,defaultValue = "10") int limit,Model model) {
		model.addAttribute("keyword", keyword==null?"":keyword.trim());
		PageResult<Map<String,Object>> pageResult=configService.page("select * from db_config where 1=1 "+(StrUtil.isNotBlank(keyword)?" and title like '%"+keyword+"%'":""), page, limit);
		return success(pageResult.getTotal(), pageResult.getData());
	}
	
	@ResponseBody
	@PostMapping("drop")
	public ActionResult drop() {
		configService.dropTable("db_config");
		return success();
	}
	
}
