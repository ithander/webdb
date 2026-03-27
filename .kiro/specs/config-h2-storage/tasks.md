# Implementation Plan: ConfigInfo H2存储

## Overview

本实现计划将ConfigInfo配置信息从JSON文件存储迁移到H2数据库存储。实现分为5个主要阶段：基础设施搭建、核心存储功能、ConfigUtils集成、数据迁移支持、测试验证。每个阶段都包含实现任务和对应的测试任务，确保增量开发和持续验证。

## Tasks

- [ ] 1. 创建基础设施和异常类
  - [x] 1.1 创建ConfigStorageException异常类
    - 创建`org.ithang.exception.ConfigStorageException`类
    - 继承RuntimeException，提供带message和cause的构造函数
    - _Requirements: 8.1, 8.4_
  
  - [x] 1.2 创建H2Info配置类（如果不存在）
    - 检查`org.ithang.tools.model.H2Info`是否存在
    - 如果不存在，创建H2Info类继承DBInfo
    - 添加embedded、filePath、mode字段
    - _Requirements: 1.5_
  
  - [x] 1.3 编写异常类的单元测试
    - 测试异常创建和消息传递
    - _Requirements: 8.1_

- [ ] 2. 实现ConfigStorage核心类
  - [x] 2.1 创建ConfigStorage类框架
    - 创建`org.ithang.storage.ConfigStorage`类
    - 添加H2DbHandler字段和基本构造函数
    - 实现initialize()方法框架
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 实现数据库初始化逻辑
    - 在initialize()中创建H2Info配置对象（嵌入式模式，路径./data/config）
    - 创建H2DbHandler实例
    - 实现表存在性检查逻辑
    - 实现createTable()方法创建db_config表
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.3 编写初始化功能的单元测试
    - 测试数据库文件创建
    - 测试表结构创建
    - 测试表字段完整性
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 3. 实现配置保存功能
  - [x] 3.1 实现saveConfig()方法
    - 实现ConfigInfo到数据库记录的转换逻辑
    - 使用MERGE或INSERT ON DUPLICATE KEY UPDATE实现upsert
    - 遍历mysqls列表保存所有MySQL配置
    - 遍历marias列表保存所有MariaDB配置
    - 添加事务支持（BEGIN/COMMIT/ROLLBACK）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 3.2 实现数据映射辅助方法
    - 实现toMap(DBInfo)方法：将DBInfo转换为Map
    - 实现buildUpsertSql()方法：生成upsert SQL语句
    - _Requirements: 2.1, 2.2_
  
  - [x] 3.3 编写保存功能的单元测试
    - 测试保存单个MySQL配置
    - 测试保存单个MariaDB配置
    - 测试保存多个配置
    - 测试空ConfigInfo的保存
    - _Requirements: 2.1, 2.2_
  
  - [ ] 3.4 编写Property 1的属性测试：配置保存和读取的往返一致性
    - **Property 1: 配置保存和读取的往返一致性**
    - **Validates: Requirements 2.1, 2.2, 3.3, 3.4**
    - 使用jqwik生成随机ConfigInfo对象
    - 验证保存后读取得到等价对象
    - 配置最少100次迭代
  
  - [ ] 3.5 编写Property 2的属性测试：配置保存的幂等性
    - **Property 2: 配置保存的幂等性**
    - **Validates: Requirements 2.3, 2.4**
    - 使用jqwik生成随机DBInfo对象
    - 验证相同title保存两次只有一条记录
    - 验证第二次保存的值覆盖第一次

- [ ] 4. 实现配置读取功能
  - [ ] 4.1 实现loadConfig()方法
    - 执行SELECT查询获取所有配置记录
    - 实现数据库记录到DBInfo的转换逻辑
    - 根据dbtype字段创建对应类型的对象（MySQLInfo或MariaDBInfo）
    - 将MySQL类型的配置添加到mysqls列表
    - 将MariaDB类型的配置添加到marias列表
    - 添加错误处理：失败时返回空ConfigInfo而非null
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.3_
  
  - [ ] 4.2 实现数据映射辅助方法
    - 实现fromMap(Map)方法：将Map转换为DBInfo
    - 实现类型判断和对象创建逻辑
    - _Requirements: 3.2_
  
  - [ ] 4.3 编写读取功能的单元测试
    - 测试读取空数据库返回空ConfigInfo
    - 测试读取单个配置
    - 测试读取多个配置
    - 测试读取失败返回空对象
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.3_
  
  - [ ] 4.4 编写Property 3的属性测试：类型转换的正确性
    - **Property 3: 类型转换的正确性**
    - **Validates: Requirements 3.2**
    - 使用jqwik生成随机DBInfo对象
    - 验证保存后读取返回正确的类型

- [ ] 5. 实现配置查询和删除功能
  - [ ] 5.1 实现getDbInfoByTitle()方法
    - 执行SELECT查询根据title查找配置
    - 使用fromMap()转换查询结果
    - 未找到时返回null
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 5.2 实现deleteConfig()方法
    - 执行DELETE语句删除指定title的配置
    - 返回删除是否成功（true/false）
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 5.3 编写查询和删除功能的单元测试
    - 测试查询存在的配置
    - 测试查询不存在的配置返回null
    - 测试删除存在的配置返回true
    - 测试删除不存在的配置返回false
    - _Requirements: 4.2, 4.3, 5.2, 5.3_
  
  - [ ] 5.4 编写Property 4的属性测试：删除操作的正确性
    - **Property 4: 删除操作的正确性**
    - **Validates: Requirements 5.1, 5.2**
    - 使用jqwik生成随机DBInfo对象
    - 验证删除后查询返回null
    - 验证删除操作返回true

- [ ] 6. 修改ConfigUtils类集成ConfigStorage
  - [ ] 6.1 修改ConfigUtils类
    - 添加ConfigStorage静态实例
    - 在静态初始化块中调用storage.initialize()
    - 修改saveConf()方法调用storage.saveConfig()
    - 修改readConf()方法调用storage.loadConfig()
    - 修改getDbInfo()方法调用storage.getDbInfoByTitle()
    - 保持所有公共API签名不变
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 6.2 编写ConfigUtils集成测试
    - 测试ConfigUtils.saveConf()和getConfig()
    - 测试ConfigUtils.readConf()
    - 测试ConfigUtils.getDbInfo()
    - 验证不再创建conf.json文件
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 6.3 编写Property 5的属性测试：ConfigUtils API的向后兼容性
    - **Property 5: ConfigUtils API的向后兼容性**
    - **Validates: Requirements 7.2, 7.3**
    - 使用jqwik生成随机ConfigInfo对象
    - 验证ConfigUtils.saveConf()后getConfig()返回等价对象
    - 验证getDbInfo()能查询到所有保存的配置

- [ ] 7. 实现数据迁移功能
  - [ ] 7.1 实现migrateFromJson()方法
    - 检查JSON文件是否存在
    - 读取JSON文件内容
    - 解析为ConfigInfo对象
    - 调用saveConfig()保存到数据库（带事务）
    - 迁移成功后备份原文件为.bak
    - 迁移失败时保留原文件
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 7.2 在initialize()中添加自动迁移逻辑
    - 检查数据库是否为空（无配置记录）
    - 如果为空且conf.json存在，自动调用migrateFromJson()
    - _Requirements: 6.1_
  
  - [ ] 7.3 编写数据迁移的单元测试
    - 测试JSON文件存在时的迁移
    - 测试JSON文件不存在时的处理
    - 测试迁移后备份文件创建
    - 测试迁移失败时原文件保留
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. 完善错误处理和日志
  - [ ] 8.1 添加异常处理
    - 在所有数据库操作中添加try-catch
    - 捕获SQLException并包装为ConfigStorageException
    - 在事务操作中添加ROLLBACK逻辑
    - _Requirements: 8.1, 8.4_
  
  - [ ] 8.2 添加日志记录
    - 在ConfigStorage中添加Logger
    - 记录初始化、保存、读取、删除、迁移的关键操作
    - 记录错误信息和堆栈跟踪
    - _Requirements: 8.2_
  
  - [ ] 8.3 添加并发安全保护
    - 在ConfigUtils的静态方法上添加synchronized
    - _Requirements: 向后兼容性_
  
  - [ ] 8.4 编写错误处理的单元测试
    - 测试数据库连接失败抛出异常
    - 测试SQL执行失败抛出异常
    - 测试事务回滚
    - 测试读取失败返回空对象
    - _Requirements: 8.1, 8.3, 8.4_

- [ ] 9. 添加测试依赖和配置
  - [ ] 9.1 更新pom.xml添加jqwik依赖
    - 添加jqwik依赖（版本1.7.4）
    - 添加AssertJ依赖（如果不存在）
    - _Requirements: 测试策略_
  
  - [ ] 9.2 创建测试数据生成器
    - 创建测试工具类TestDataGenerators
    - 实现configInfos()生成器
    - 实现dbInfos()生成器
    - 实现mysqlInfos()生成器
    - 实现mariaInfos()生成器
    - _Requirements: 测试策略_

- [ ] 10. Checkpoint - 确保所有测试通过
  - 运行所有单元测试和属性测试
  - 确保测试覆盖率达到目标（行覆盖率≥85%，分支覆盖率≥80%）
  - 如有问题，请向用户报告

- [ ] 11. 集成验证和文档更新
  - [ ] 11.1 手动验证完整流程
    - 启动应用验证自动初始化
    - 测试保存配置到数据库
    - 测试从数据库读取配置
    - 测试JSON迁移功能
    - _Requirements: 所有需求_
  
  - [ ] 11.2 更新相关文档
    - 更新README说明新的存储方式
    - 添加数据迁移说明
    - 添加故障排查指南
    - _Requirements: 文档_

## Notes

- 每个任务都引用了具体的需求编号，确保可追溯性
- 属性测试任务明确标注了对应的设计文档属性编号
- 建议按顺序执行任务，每个阶段完成后运行相关测试
- Checkpoint任务确保增量验证，及时发现问题
- 所有测试任务都是必需的，确保完整的测试覆盖
