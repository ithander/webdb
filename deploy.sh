#!/bin/bash

# webdb 项目部署脚本
# 用法: bash deploy.sh

APP_NAME="webdb"
GIT_URL="https://gitee.com/gandilong/webdb.git"
WORK_DIR="/opt/webdb"
JAR_NAME="webdb-0.0.1-SNAPSHOT.jar"
LOG_FILE="/opt/webdb/logs/app.log"

echo "========== $APP_NAME 部署脚本 =========="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 1. 拉取代码
echo ""
echo "[1/4] 拉取代码..."
if [ -d "$WORK_DIR/.git" ]; then
    cd "$WORK_DIR"
    git pull origin master
else
    rm -rf "$WORK_DIR"
    git clone "$GIT_URL" "$WORK_DIR"
    cd "$WORK_DIR"
fi

if [ $? -ne 0 ]; then
    echo "❌ 代码拉取失败"
    exit 1
fi
echo "✅ 代码拉取完成"

# 2. 编译打包
echo ""
echo "[2/4] 编译打包..."
cd "$WORK_DIR"
mvn clean package -DskipTests -q

if [ $? -ne 0 ]; then
    echo "❌ 编译打包失败"
    exit 1
fi
echo "✅ 编译打包完成"

# 3. 查询并停止旧进程
echo ""
echo "[3/4] 检查旧进程..."
PID=$(ps -ef | grep "$JAR_NAME" | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "发现旧进程 PID: $PID，正在停止..."
    kill -15 "$PID"
    sleep 3
    # 如果还没停掉，强制 kill
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "进程未响应，强制停止..."
        kill -9 "$PID"
        sleep 1
    fi
    echo "✅ 旧进程已停止"
else
    echo "没有发现旧进程"
fi

# 4. 启动项目
echo ""
echo "[4/4] 启动项目..."
mkdir -p "$(dirname $LOG_FILE)"
nohup java -jar "$WORK_DIR/target/$JAR_NAME" > "$LOG_FILE" 2>&1 &
NEW_PID=$!

sleep 5
if ps -p "$NEW_PID" > /dev/null 2>&1; then
    echo "✅ 项目启动成功 PID: $NEW_PID"
    echo "日志文件: $LOG_FILE"
    echo "访问地址: http://localhost:9866/webdb"
else
    echo "❌ 项目启动失败，请查看日志: $LOG_FILE"
    exit 1
fi

echo ""
echo "========== 部署完成 =========="
