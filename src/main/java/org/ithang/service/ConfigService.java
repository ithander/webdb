package org.ithang.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import org.ithang.tools.model.DBInfo;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ConfigService {

    // 内存缓存，由前端 localStorage 同步过来
    private final ConcurrentHashMap<String, DBInfo> configMap = new ConcurrentHashMap<>();

    public List<DBInfo> listAll() {
        return new ArrayList<>(configMap.values());
    }

    public DBInfo getInfoByTitle(String title) {
        return configMap.get(title);
    }

    public void save(DBInfo info) {
        configMap.put(info.getTitle(), info);
        log.info("保存配置: {}", info.getTitle());
    }

    public void delete(String title) {
        configMap.remove(title);
        log.info("删除配置: {}", title);
    }

    public boolean hasInfo(String title) {
        return configMap.containsKey(title);
    }

    /**
     * 批量同步前端 localStorage 的配置到内存
     */
    public void syncAll(List<DBInfo> infos) {
        configMap.clear();
        if (infos != null) {
            infos.forEach(info -> configMap.put(info.getTitle(), info));
        }
        log.info("同步配置: {} 条", configMap.size());
    }
}
