# Project Structure

## Package Organization

```
org.ithang/
├── WebdbApplication.java          # Main application entry point
├── InitSystem.java                # Application initialization
├── Action.java                    # Base action class (in external library)
├── ActionResult.java              # Standardized response wrapper
├── PageResult.java                # Pagination result wrapper
├── ModelDao.java                  # Base DAO with CRUD operations
├── meta/                          # Metadata annotations
│   ├── ID.java                    # Primary key annotation
│   └── Table.java                 # Table name annotation
├── model/                         # Domain models
│   ├── TableInfo.java             # Table metadata (name, size, row count)
│   └── ColumnInfo.java            # Column metadata (name, type, constraints)
├── handler/                       # Database handler layer (abstracts DB operations)
│   ├── DbHandler.java             # Abstract base with connection pooling
│   ├── DbHandlerFactory.java      # Factory for creating/reusing handlers
│   ├── MySQLDbHandler.java        # MySQL-specific implementation
│   └── H2DbHandler.java           # H2-specific implementation
├── service/                       # Business logic layer
│   ├── DbService.java             # Abstract base for database services
│   ├── ConfigService.java         # Configuration management (CRUD for db_config)
│   └── MySQLDbService.java        # MySQL-specific service implementation
├── tools/                         # Utility classes and model definitions
│   ├── model/                     # Database connection info models
│   │   ├── DBInfo.java            # Base connection info (abstract)
│   │   ├── MySQLInfo.java         # MySQL connection config
│   │   ├── H2Info.java            # H2 connection config
│   │   ├── MariaDBInfo.java       # MariaDB connection config
│   │   └── DaMengInfo.java        # Dameng connection config
│   └── util/                      # Utility classes (empty)
└── web/                           # Web layer (Spring MVC controllers)
    ├── IndexAction.java           # Home page and connection management
    ├── ConfigAction.java          # Configuration CRUD endpoints
    ├── DbAction.java              # Abstract base for database actions
    ├── SessionAction.java         # Session management (connect, databases, tables, columns)
    ├── MySQLAction.java           # MySQL-specific SQL execution endpoints
    └── LoginAction.java           # Login page controller
```

## Key Design Patterns

### Handler Pattern
- `DbHandler` provides a unified interface for database operations
- Connection pooling via HikariCP
- Database-specific implementations extend the base handler
- Factory pattern for handler creation and reuse

### Service Layer
- `DbService` abstracts business logic for database operations
- Uses `DbHandler` for low-level database access
- Implements RowMapper for result set transformation

### Action Pattern
- Web controllers extend `Action` base class
- `DbAction` provides abstract methods for database operations
- Returns standardized `ActionResult` or `PageResult`

## Data Flow

1. **Request** → Controller (Action)
2. **Controller** → Service (DbService)
3. **Service** → Handler (DbHandler)
4. **Handler** → Database (via JDBC/HikariCP)

## Configuration Storage

- **Primary DB**: H2 (file-based at `./webdb/config`)
- **Configuration Table**: `db_config` stores database connection info
- **Connection Info Fields**: id, title, host, uname, upass, port, dbname, dbtype, opt
