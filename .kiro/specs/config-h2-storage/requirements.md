# Requirements Document

## Introduction

本规范定义了将ConfigInfo配置信息从JSON文件存储迁移到H2数据库存储的功能需求。该功能将为web版数据库客户端提供更可靠的配置持久化管理能力，支持MySQL和MariaDB连接配置的数据库存储。

## Glossary

- **ConfigInfo**: 配置信息对象，包含mysqls和marias两个列表，分别存储MySQL和MariaDB的连接配置
- **DBInfo**: 数据库连接信息基类，包含title、host、uname、upass、port、dbname、dbtype等字段
- **MySQLInfo**: MySQL数据库连接信息类，继承自DBInfo
- **MariaDBInfo**: MariaDB数据库连接信息类，继承自DBInfo
- **H2Info**: H2数据库连接信息类，继承自DBInfo
- **ConfigStorage**: 配置存储系统，负责将ConfigInfo持久化到H2数据库
- **ConfigUtils**: 配置工具类，提供配置的读取和保存功能
- **H2DbHandler**: H2数据库操作处理器，提供H2数据库的CRUD操作

## Requirements

### Requirement 1: H2数据库初始化

**User Story:** 作为系统管理员，我希望系统能够自动初始化H2数据库，以便存储配置信息。

#### Acceptance Criteria

1. WHEN 应用启动时，THE ConfigStorage SHALL 检查H2数据库是否存在
2. IF H2数据库不存在，THEN THE ConfigStorage SHALL 创建嵌入式H2数据库文件
3. WHEN H2数据库创建后，THE ConfigStorage SHALL 创建db_config表用于存储配置信息
4. THE db_config表 SHALL 包含以下字段：id（主键）、title（配置标题）、host（主机地址）、uname（用户名）、upass（密码）、port（端口号）、dbname（数据库名）、dbtype（数据库类型）
5. THE ConfigStorage SHALL 使用嵌入式模式连接H2数据库，数据库文件路径为./data/config

### Requirement 2: 配置信息保存

**User Story:** 作为用户，我希望能够将数据库连接配置保存到H2数据库中，以便配置信息持久化存储。

#### Acceptance Criteria

1. WHEN 用户保存ConfigInfo对象时，THE ConfigStorage SHALL 将mysqls列表中的所有配置保存到db_config表
2. WHEN 用户保存ConfigInfo对象时，THE ConfigStorage SHALL 将marias列表中的所有配置保存到db_config表
3. WHEN 保存配置时，IF 配置的title已存在，THEN THE ConfigStorage SHALL 更新该配置记录
4. WHEN 保存配置时，IF 配置的title不存在，THEN THE ConfigStorage SHALL 插入新的配置记录
5. WHEN 保存操作完成后，THE ConfigStorage SHALL 返回保存成功的状态

### Requirement 3: 配置信息读取

**User Story:** 作为用户，我希望能够从H2数据库中读取配置信息，以便恢复之前保存的数据库连接配置。

#### Acceptance Criteria

1. WHEN 应用启动时，THE ConfigStorage SHALL 从db_config表读取所有配置记录
2. WHEN 读取配置时，THE ConfigStorage SHALL 根据dbtype字段将记录转换为对应的对象类型（MySQLInfo或MariaDBInfo）
3. WHEN 读取配置时，THE ConfigStorage SHALL 将MySQL类型的配置添加到ConfigInfo的mysqls列表
4. WHEN 读取配置时，THE ConfigStorage SHALL 将MariaDB类型的配置添加到ConfigInfo的marias列表
5. WHEN 读取操作完成后，THE ConfigStorage SHALL 返回完整的ConfigInfo对象

### Requirement 4: 配置信息查询

**User Story:** 作为用户，我希望能够根据title查询特定的数据库连接配置，以便快速获取所需的配置信息。

#### Acceptance Criteria

1. WHEN 用户根据title查询配置时，THE ConfigStorage SHALL 在db_config表中查找匹配的记录
2. WHEN 查询到匹配记录时，THE ConfigStorage SHALL 返回对应的DBInfo对象
3. WHEN 未查询到匹配记录时，THE ConfigStorage SHALL 返回null
4. THE ConfigStorage SHALL 支持查询MySQL和MariaDB两种类型的配置

### Requirement 5: 配置信息删除

**User Story:** 作为用户，我希望能够删除不再使用的数据库连接配置，以便保持配置列表的整洁。

#### Acceptance Criteria

1. WHEN 用户根据title删除配置时，THE ConfigStorage SHALL 在db_config表中删除匹配的记录
2. WHEN 删除操作成功时，THE ConfigStorage SHALL 返回删除成功的状态
3. WHEN 删除的配置不存在时，THE ConfigStorage SHALL 返回删除失败的状态

### Requirement 6: 数据迁移支持

**User Story:** 作为系统管理员，我希望系统能够自动将现有的JSON配置文件迁移到H2数据库，以便平滑过渡到新的存储方式。

#### Acceptance Criteria

1. WHEN 应用首次启动且H2数据库为空时，THE ConfigStorage SHALL 检查是否存在conf.json文件
2. IF conf.json文件存在，THEN THE ConfigStorage SHALL 读取文件中的配置信息
3. WHEN 读取JSON配置后，THE ConfigStorage SHALL 将所有配置保存到H2数据库
4. WHEN 迁移完成后，THE ConfigStorage SHALL 备份原conf.json文件为conf.json.bak
5. WHEN 迁移过程中发生错误时，THE ConfigStorage SHALL 记录错误日志并保留原conf.json文件

### Requirement 7: 向后兼容性

**User Story:** 作为开发者，我希望新的存储方式能够保持与现有代码的兼容性，以便最小化代码改动。

#### Acceptance Criteria

1. THE ConfigUtils类 SHALL 保持现有的公共API接口不变
2. THE ConfigUtils.getConfig()方法 SHALL 继续返回ConfigInfo对象
3. THE ConfigUtils.getDbInfo(String title)方法 SHALL 继续根据title返回DBInfo对象
4. THE ConfigUtils.saveConf(ConfigInfo info)方法 SHALL 将配置保存到H2数据库而非JSON文件
5. THE ConfigUtils.readConf()方法 SHALL 从H2数据库读取配置而非JSON文件

### Requirement 8: 错误处理

**User Story:** 作为用户，我希望系统能够妥善处理数据库操作错误，以便在出现问题时能够及时发现并处理。

#### Acceptance Criteria

1. WHEN 数据库连接失败时，THE ConfigStorage SHALL 抛出明确的异常信息
2. WHEN 数据库操作失败时，THE ConfigStorage SHALL 记录详细的错误日志
3. WHEN 读取配置失败时，THE ConfigStorage SHALL 返回空的ConfigInfo对象而非null
4. WHEN 保存配置失败时，THE ConfigStorage SHALL 抛出异常并回滚事务
5. IF 数据库表结构损坏，THEN THE ConfigStorage SHALL 尝试重建表结构
