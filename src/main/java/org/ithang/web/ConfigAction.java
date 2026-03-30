package org.ithang.web;

import java.util.List;
import java.util.Map;

import org.ithang.handler.DbHandlerFactory;
import org.ithang.service.ConfigService;
import org.ithang.tools.model.DBInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequestMapping("config")
public class ConfigAction {

    @Autowired
    private ConfigService configService;

    @Autowired
    private DbHandlerFactory handlerFactory;

    @GetMapping("form")
    public String form(@RequestParam(value = "title", required = false) String title, Model model) {
        DBInfo info = null;
        if (StrUtil.isNotBlank(title)) {
            info = configService.getInfoByTitle(title);
        }
        if (info == null) {
            info = new DBInfo();
        }
        model.addAttribute("info", info);
        return "configForm";
    }

    @ResponseBody
    @GetMapping("list")
    public Map<String, Object> list() {
        List<DBInfo> infos = configService.listAll();
        return Map.of("code", 0, "data", infos);
    }

    @ResponseBody
    @PostMapping("save")
    public Map<String, Object> save(@RequestBody DBInfo info) {
        if (StrUtil.isBlank(info.getTitle())) {
            return Map.of("code", 1, "msg", "会话名称不能为空");
        }
        handlerFactory.delHandler(info.getTitle());
        configService.save(info);
        return Map.of("code", 0, "msg", "success");
    }

    @ResponseBody
    @PostMapping("del")
    public Map<String, Object> del(@RequestBody Map<String, String> params) {
        String title = params.get("title");
        if (StrUtil.isNotBlank(title)) {
            handlerFactory.delHandler(title);
            configService.delete(title);
        }
        return Map.of("code", 0, "msg", "success");
    }

    @ResponseBody
    @PostMapping("sync")
    public Map<String, Object> sync(@RequestBody List<DBInfo> infos) {
        // 清除旧的连接缓存
        List<DBInfo> oldInfos = configService.listAll();
        for (DBInfo old : oldInfos) {
            handlerFactory.delHandler(old.getTitle());
        }
        configService.syncAll(infos);
        return Map.of("code", 0, "msg", "success");
    }
}
