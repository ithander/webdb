package org.ithang;

public abstract class Action {

    protected ActionResult success() {
        ActionResult r = new ActionResult();
        r.setCode(0);
        r.setMsg("success");
        return r;
    }

    protected ActionResult success(int code, Object data) {
        ActionResult r = new ActionResult();
        r.setCode(code);
        r.setMsg("success");
        r.setData(data);
        return r;
    }

    protected ActionResult success(long total, Object data) {
        ActionResult r = new ActionResult();
        r.setCode(0);
        r.setMsg("success");
        r.setCount(total);
        r.setData(data);
        return r;
    }

    protected ActionResult fail(String msg) {
        ActionResult r = new ActionResult();
        r.setCode(1);
        r.setMsg(msg);
        return r;
    }
}
