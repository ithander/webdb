package org.ithang.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexAction {

    @GetMapping
    public String index() {
        return "home";
    }

    @GetMapping("home")
    public String home() {
        return "home";
    }

    @GetMapping("data")
    public String data() {
        return "data";
    }
}
