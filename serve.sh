#!/bin/bash
# 在局域网内提供 OKR Kanban 页面访问（带共享数据库，所有人看到同一份任务）
# 用法: ./serve.sh  或  bash serve.sh

cd "$(dirname "$0")"
PORT=8080
export PORT

# 尝试获取本机局域网 IP
LAN_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
if [ -z "$LAN_IP" ]; then
  LAN_IP="<本机IP>"
fi

echo "正在启动 OKR 看板服务 (端口 $PORT)..."
echo ""
echo "本机访问: http://localhost:$PORT/OKR_Kanban.html"
echo "局域网访问: http://${LAN_IP}:$PORT/OKR_Kanban.html"
echo "（所有人用上面地址打开，看到的任务一致，数据保存在本机 data/okr.json）"
echo "按 Ctrl+C 停止服务。"
echo "----------------------------------------"

if [ -f "package.json" ] && command -v node >/dev/null 2>&1; then
  [ ! -d "node_modules" ] && npm install
  node server.js
else
  echo "未检测到 Node.js，使用 Python 启动（仅静态页面，无共享数据库）。"
  python3 -m http.server "$PORT" --bind 0.0.0.0
fi
