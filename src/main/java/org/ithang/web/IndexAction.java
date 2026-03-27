package org.ithang.web;


import java.sql.Connection;
import java.util.List;

import org.ithang.handler.DbHandler;
import org.ithang.handler.DbHandlerFactory;
import org.ithang.service.ConfigService;
import org.ithang.tools.model.DBInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.alibaba.fastjson2.JSON;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class IndexAction {
    
	@Autowired
	private ConfigService configService;
	
	@Autowired
	private DbHandlerFactory handlerFactory;
	
	/**
	 * 返回主页面
	 * @return
	 */
	@GetMapping
	public String index(Model model) {
		List<DBInfo> infos = configService.listAll();
		if (infos == null || infos.isEmpty()) {
			return "index";
		}
		return home(model);
	}
	
	@GetMapping("home")
	public String home(Model model) {
		List<DBInfo> infos = configService.listAll();
		model.addAttribute("infos", infos);
		model.addAttribute("infosJsonStr", JSON.toJSONString(infos));
		return "home";
	}
	
	/**
	 * 返回数据显示页面
	 * @return
	 */
	@GetMapping("data")
	public String data() {
		return "data";
	}
	
	@GetMapping("connect")
	public String connect(long id,Model model) {
		DBInfo info=configService.get(id);
		DbHandler handler=handlerFactory.getHandler(info.getTitle());
		try {
			Connection conn=handler.getDataSource().getConnection();
		    model.addAttribute("infos",List.of(info));
		    if(!conn.isClosed()) {
		    	conn.close();
		    }
		    log.info("{}连接成功!",info.getTitle());
		    return "redirect:/home";
		}catch(Exception e) {
			model.addAttribute("errorInfo", "<p>"+e.getMessage()+"</p>");
			log.error(e.getMessage());
			e.printStackTrace();
			return "index";
		}
		
	}
	
}
