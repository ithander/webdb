package org.ithang;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class InitSystem implements CommandLineRunner{

	
	@Override
	public void run(String... args) throws Exception {
		log.info("初始化系统设置...");
	}
}
