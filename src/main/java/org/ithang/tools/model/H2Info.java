package org.ithang.tools.model;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class H2Info extends DBInfo {
    
    private String mode; // MySQL, PostgreSQL, Oracle等兼容模式
    private boolean embedded; // 是否为嵌入式模式
    private String filePath; // 嵌入式模式下的文件路径
    
    public H2Info() {
        setDbtype("h2");
        setPort(9092); // H2默认端口
        this.embedded = false;
        this.mode = "MySQL"; // 默认MySQL兼容模式
    }
}
