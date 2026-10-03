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

    @ResponseBody
    @PostMapping("add")
    public Map<String, Object> add(@RequestBody DBInfo info) {
        if (StrUtil.isBlank(info.getTitle())) {
            return Map.of("code", 1, "msg", "会话名称不能为空");
        }
        if (configService.hasInfo(info.getTitle())) {
            return Map.of("code", 1, "msg", "会话名称已存在");
        }
        handlerFactory.delHandler(info.getTitle());
        configService.save(info);
        return Map.of("code", 0, "msg", "success");
    }

    @ResponseBody
    @PostMapping("update")
    public Map<String, Object> update(@RequestBody Map<String, Object> params) {
        String oldTitle = (String) params.get("oldTitle");
        DBInfo newConfig = (DBInfo) params.get("newConfig");
        
        if (StrUtil.isBlank(oldTitle) || newConfig == null || StrUtil.isBlank(newConfig.getTitle())) {
            return Map.of("code", 1, "msg", "参数错误");
        }
        
        // 如果修改了会话名称，需要删除旧的
        if (!oldTitle.equals(newConfig.getTitle())) {
            handlerFactory.delHandler(oldTitle);
            configService.delete(oldTitle);
        }
        
        // 保存新的配置
        handlerFactory.delHandler(newConfig.getTitle());
        configService.save(newConfig);
        
        return Map.of("code", 0, "msg", "success");
    }

    @ResponseBody
    @PostMapping("test")
    public Map<String, Object> testConnection(@RequestBody DBInfo info) {
        try {
            // 创建一个临时的 handler 来测试连接
            var handler = handlerFactory.createHandler(info);
            if (handler != null && handler.testConnect()) {
                return Map.of("code", 0, "msg", "连接成功");
            } else {
                return Map.of("code", 1, "msg", "连接失败");
            }
        } catch (Exception e) {
            log.error("测试连接失败: {}", e.getMessage(), e);
            return Map.of("code", 1, "msg", "连接失败: " + e.getMessage());
        }
    }
}
