#!/bin/bash

# OpenClaw 插件安装脚本
# 用法: ./install.sh <openclaw_extensions_dir>

TARGET_DIR="${1}"

if [ -z "$TARGET_DIR" ]; then
    echo "用法: ./install.sh /path/to/openclaw/extensions"
    echo "示例: ./install.sh ../openclaw-main/extensions"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目标目录 '$TARGET_DIR' 不存在。"
    exit 1
fi

PLUGIN_NAME="skill-approval"
DEST="$TARGET_DIR/$PLUGIN_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "正在安装 $PLUGIN_NAME 到 $DEST ..."

if [ -d "$DEST" ]; then
    echo "⚠️  插件目录已存在，正在覆盖..."
    rm -rf "$DEST"
fi

mkdir -p "$DEST"

# 复制核心文件（包括 manifest）
cp "$SCRIPT_DIR/package.json" \
   "$SCRIPT_DIR/openclaw.plugin.json" \
   "$SCRIPT_DIR/index.ts" \
   "$SCRIPT_DIR/hook.ts" \
   "$SCRIPT_DIR/store.ts" \
   "$DEST/"

echo "✅ 插件安装成功！"
echo "👉 请重启 OpenClaw 以启用插件。"
