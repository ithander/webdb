package org.ithang;

import lombok.Data;

@Data
public class ActionResult {
    private int code;
    private String msg;
    private Object data;
    private long count;
}
