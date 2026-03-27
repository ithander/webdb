# Technology Stack

## Build System

- **Maven** - Project build and dependency management
- Java 17
- Spring Boot 3.5.10

## Core Dependencies

### Framework
- `spring-boot-starter-web` - REST API and web MVC
- `spring-boot-starter-freemarker` - Template engine for views
- `spring-boot-starter-jdbc` - JDBC support with HikariCP connection pool

### Database Drivers
- `mysql-connector-j` - MySQL/MariaDB driver
- `com.h2database:h2` - H2 database (runtime scope)
- Dameng JDBC driver (custom, version 1.0.0)

### Utilities
- `cn.hutool:hutool-all:5.8.43` - Java utility library
- `org.projectlombok:lombok` - Code generation (optional)
- `org.ithang:jdbc-model-sql:1.0.0` - Custom JDBC model library

### Testing
- `org.springframework.boot:spring-boot-starter-test`
- `net.jqwik:jqwik:1.7.4` - Property-based testing framework

## Common Commands

```bash
# Build the project
mvn clean package

# Run the application
mvn spring-boot:run

# Run tests
mvn test

# Run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## Application Configuration

- **Server Port**: 9866
- **Context Path**: /webdb
- **H2 Console**: /h2-console
- **Session Timeout**: 600 minutes
