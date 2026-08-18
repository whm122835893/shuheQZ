#!/bin/bash
#==============================================================================
# 数和文创项目 - 自动化风险扫描脚本
# 用法: bash audit.sh [project_root]
# 默认: bash audit.sh /workspace/shuheQZ/project-nft
#==============================================================================

set -uo pipefail
# Note: intentionally NOT using set -e, because grep returns exit code 1 when no matches found

PROJECT_ROOT="${1:-/workspace/shuheQZ/project-nft}"
BACKEND="$PROJECT_ROOT/backend-nestjs/src"
FRONTEND="$PROJECT_ROOT/admin-manager/src"
SQL_DIR="$PROJECT_ROOT/sql/migrations"

RED='\033[0;31m'
ORANGE='\033[0;33m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ISSUE_COUNT=0

report() {
  local severity="$1"
  local file="$2"
  local line="$3"
  local message="$4"
  ISSUE_COUNT=$((ISSUE_COUNT + 1))
  case "$severity" in
    P0) echo -e "${RED}[P0]${NC} $file:$line — $message" ;;
    P1) echo -e "${ORANGE}[P1]${NC} $file:$line — $message" ;;
    P2) echo -e "${YELLOW}[P2]${NC} $file:$line — $message" ;;
    OK) echo -e "${GREEN}[OK]${NC} $file:$line — $message" ;;
  esac
}

echo "================================================"
echo "  数和文创项目 - 自动化风险扫描"
echo "  扫描目录: $PROJECT_ROOT"
echo "  扫描时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"
echo ""

#==============================================================================
# 1. 硬编码密钥检测
#==============================================================================
echo "=== 1. 硬编码密钥检测 ==="

# 检查 JWT Secret 硬编码兜底值
HARDCODED_SECRETS=$(grep -rn "shuhe-admin-secret\|shuhe-jwt-secret\|shuhe-refresh-secret" \
  "$BACKEND" --include="*.ts" 2>/dev/null || true)
if [ -n "$HARDCODED_SECRETS" ]; then
  echo "$HARDCODED_SECRETS" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    report P0 "$file" "$lineno" "硬编码密钥兜底值"
  done
else
  echo -e "${GREEN}[OK]${NC} 未发现硬编码密钥"
fi

# 检查 .env 中的弱密码
if [ -f "$PROJECT_ROOT/backend-nestjs/.env" ]; then
  WEAK_ENV=$(grep -n "DB_PASSWORD=$\|REDIS_PASSWORD=$\|JWT_SECRET=shuhe" \
    "$PROJECT_ROOT/backend-nestjs/.env" 2>/dev/null || true)
  if [ -n "$WEAK_ENV" ]; then
    echo "$WEAK_ENV" | while IFS= read -r line; do
      lineno=$(echo "$line" | cut -d: -f1)
      report P0 ".env" "$lineno" "弱安全配置"
    done
  fi
fi

echo ""

#==============================================================================
# 2. 前端 Mock 数据残留检测
#==============================================================================
echo "=== 2. 前端 Mock 数据残留检测 ==="

MOCK_IMPORTS=$(grep -rn "from.*mock\|import.*mock" \
  "$FRONTEND/views" --include="*.vue" 2>/dev/null || true)
MOCK_COUNT=$(echo "$MOCK_IMPORTS" | grep -c "mock" 2>/dev/null || echo "0")
if [ "$MOCK_COUNT" -gt 0 ]; then
  report P0 "frontend/views" "-" "发现 $MOCK_COUNT 处 mock 导入"
  echo "$MOCK_IMPORTS" | head -10
else
  echo -e "${GREEN}[OK]${NC} 未发现 mock 导入"
fi

# setTimeout 模拟延迟
SETTIMEOUT_COUNT=$(grep -rn "setTimeout" \
  "$FRONTEND/views" --include="*.vue" 2>/dev/null | wc -l)
if [ "$SETTIMEOUT_COUNT" -gt 0 ]; then
  report P1 "frontend/views" "-" "发现 $SETTIMEOUT_COUNT 处 setTimeout（可能为模拟延迟）"
else
  echo -e "${GREEN}[OK]${NC} 未发现 setTimeout"
fi

echo ""

#==============================================================================
# 3. TypeScript any 类型统计
#==============================================================================
echo "=== 3. TypeScript any 类型统计 ==="

ANY_COUNT=$(grep -rn ": any\b\|<any>\|as any" \
  "$FRONTEND" --include="*.ts" --include="*.vue" 2>/dev/null | wc -l)
if [ "$ANY_COUNT" -gt 50 ]; then
  report P1 "frontend" "-" "发现 $ANY_COUNT 处 any 类型（建议 < 20）"
elif [ "$ANY_COUNT" -gt 0 ]; then
  report P2 "frontend" "-" "发现 $ANY_COUNT 处 any 类型"
else
  echo -e "${GREEN}[OK]${NC} 未发现 any 类型"
fi

# API 层 any 统计
API_ANY=$(grep -c ": any\|<any>" "$FRONTEND/api/index.ts" 2>/dev/null || echo "0")
if [ "$API_ANY" -gt 30 ]; then
  report P1 "api/index.ts" "-" "API 层 $API_ANY 处 any 类型"
fi

echo ""

#==============================================================================
# 4. 硬编码 API URL 检测
#==============================================================================
echo "=== 4. 硬编码 API URL 检测 ==="

HARDCODED_URLS=$(grep -rn "localhost:3000\|127.0.0.1:3000" \
  "$FRONTEND" --include="*.ts" --include="*.vue" 2>/dev/null || true)
if [ -n "$HARDCODED_URLS" ]; then
  echo "$HARDCODED_URLS" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    report P2 "$file" "$lineno" "硬编码 API URL"
  done
else
  echo -e "${GREEN}[OK]${NC} 未发现硬编码 API URL"
fi

echo ""

#==============================================================================
# 5. console.log 残留检测
#==============================================================================
echo "=== 5. console.log 残留检测 ==="

CONSOLE_COUNT=$(grep -rn "console\.\(log\|warn\|error\|debug\)" \
  "$BACKEND" --include="*.ts" 2>/dev/null | \
  grep -v "node_modules\|\.spec\.ts\|test/" | wc -l)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  report P1 "backend" "-" "发现 $CONSOLE_COUNT 处 console.* 调用（应使用 Winston Logger）"
  grep -rn "console\.\(log\|warn\|error\|debug\)" \
    "$BACKEND" --include="*.ts" 2>/dev/null | \
    grep -v "node_modules\|\.spec\.ts\|test/" | head -5
else
  echo -e "${GREEN}[OK]${NC} 未发现 console.* 调用"
fi

echo ""

#==============================================================================
# 6. TODO/FIXME 统计
#==============================================================================
echo "=== 6. TODO/FIXME 统计 ==="

TODO_COUNT=$(grep -rn "// TODO\|// FIXME\|// HACK\|// XXX" \
  "$BACKEND" --include="*.ts" 2>/dev/null | \
  grep -v "node_modules" | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
  report P1 "backend" "-" "发现 $TODO_COUNT 处 TODO/FIXME（核心功能可能未实现）"
  echo "  分布:"
  grep -rn "// TODO\|// FIXME\|// HACK" \
    "$BACKEND" --include="*.ts" 2>/dev/null | \
    grep -v "node_modules" | \
    sed "s|$BACKEND/||" | \
    awk -F: '{print "    " $1 ":" $2}' | head -10
else
  echo -e "${GREEN}[OK]${NC} 未发现 TODO"
fi

echo ""

#==============================================================================
# 7. 事务使用检测
#==============================================================================
echo "=== 7. 关键写操作事务覆盖检测 ==="

# 检查涉及金额/库存变更的方法是否使用事务
CRITICAL_METHODS=("approve" "reject" "refund" "cancelOrder" "repairOrder" "retroactiveMint" "generateOffchain")
for method in "${CRITICAL_METHODS[@]}"; do
  METHOD_FILE=$(grep -rn "async $method\| $method(" \
    "$BACKEND/modules/admin/services/" --include="*.ts" 2>/dev/null | \
    head -1 | cut -d: -f1)
  if [ -n "$METHOD_FILE" ]; then
    HAS_TRANSACTION=$(grep -c "createQueryRunner\|dataSource.transaction\|startTransaction" \
      "$METHOD_FILE" 2>/dev/null || echo "0")
    if [ "$HAS_TRANSACTION" -eq 0 ]; then
      report P1 "$METHOD_FILE" "-" "方法 $method 可能缺少事务保护"
    fi
  fi
done

echo ""

#==============================================================================
# 8. pageSize 上限检测
#==============================================================================
echo "=== 8. pageSize 上限检测 ==="

ALL_SERVICES=$(find "$BACKEND/modules/admin/services" -name "*.service.ts" 2>/dev/null)
for svc in $ALL_SERVICES; do
  HAS_PAGESIZE=$(grep -c "pageSize" "$svc" 2>/dev/null)
  HAS_PAGESIZE=${HAS_PAGESIZE:-0}
  HAS_PAGESIZE=$(echo "$HAS_PAGESIZE" | tr -d '[:space:]')
  if [ "$HAS_PAGESIZE" -gt 0 ] 2>/dev/null; then
    HAS_LIMIT=$(grep -c "Math.min.*pageSize\|Math.min.*100" "$svc" 2>/dev/null)
    HAS_LIMIT=${HAS_LIMIT:-0}
    HAS_LIMIT=$(echo "$HAS_LIMIT" | tr -d '[:space:]')
    if [ "$HAS_LIMIT" -eq 0 ] 2>/dev/null; then
      svc_name=$(basename "$svc")
      report P0 "$svc_name" "-" "pageSize 无 Math.min 上限（可 OOM）"
    fi
  fi
done

echo ""

#==============================================================================
# 9. Guard 覆盖检测
#==============================================================================
echo "=== 9. Admin Controller Guard 覆盖检测 ==="

ALL_CONTROLLERS=$(find "$BACKEND/modules/admin/controllers" -name "*.controller.ts" 2>/dev/null)
GUARD_OK=0
GUARD_MISSING=0
for ctrl in $ALL_CONTROLLERS; do
  HAS_GUARD=$(grep -c "@UseGuards.*AdminJwtGuard" "$ctrl" 2>/dev/null)
  HAS_GUARD=${HAS_GUARD:-0}
  HAS_GUARD=$(echo "$HAS_GUARD" | tr -d '[:space:]')
  if [ "$HAS_GUARD" -gt 0 ] 2>/dev/null; then
    GUARD_OK=$((GUARD_OK + 1))
  else
    GUARD_MISSING=$((GUARD_MISSING + 1))
    report P0 "$(basename "$ctrl")" "-" "缺少 @UseGuards(AdminJwtGuard)"
  fi
done
echo "  已加守卫: $GUARD_OK 个控制器"
echo "  缺少守卫: $GUARD_MISSING 个控制器"

echo ""

#==============================================================================
# 10. Rate Limiting 检测
#==============================================================================
echo "=== 10. Rate Limiting 检测 ==="

HAS_THROTTLE=$(grep -c "ThrottlerModule\|Throttle\|RateLimit" \
  "$PROJECT_ROOT/backend-nestjs/src/app.module.ts" 2>/dev/null)
HAS_THROTTLE=${HAS_THROTTLE:-0}
HAS_THROTTLE=$(echo "$HAS_THROTTLE" | tr -d '[:space:]')
if [ "$HAS_THROTTLE" -gt 0 ] 2>/dev/null; then
  echo -e "${GREEN}[OK]${NC} 全局限流已配置"
  # 检查哪些敏感端点缺少专属限流
  for endpoint in "refresh\|password\|2fa/verify\|refund.*approve\|refund.*reject"; do
    FOUND=$(grep -rn "$endpoint" "$BACKEND/modules/admin/controllers/" --include="*.ts" 2>/dev/null || true)
    if [ -n "$FOUND" ]; then
      FILE=$(echo "$FOUND" | head -1 | cut -d: -f1)
      HAS_T=$(grep -c "@Throttle" "$FILE" 2>/dev/null)
      HAS_T=${HAS_T:-0}
      HAS_T=$(echo "$HAS_T" | tr -d '[:space:]')
      if [ "$HAS_T" -lt 2 ] 2>/dev/null; then
        report P1 "$(basename "$FILE")" "-" "敏感端点 ($endpoint) 可能缺少专属限流"
      fi
    fi
  done
else
  report P0 "app.module.ts" "-" "未配置全局限流"
fi

echo ""

#==============================================================================
# 11. 2FA Token 绕过检测
#==============================================================================
echo "=== 11. 2FA Token 绕过检测 ==="

JWT_STRATEGY="$BACKEND/modules/admin/strategies/admin-jwt.strategy.ts"
if [ -f "$JWT_STRATEGY" ]; then
  CHECK_2FA=$(grep -c "pending2fa" "$JWT_STRATEGY" 2>/dev/null)
  CHECK_2FA=${CHECK_2FA:-0}
  CHECK_2FA=$(echo "$CHECK_2FA" | tr -d '[:space:]')
  if [ "$CHECK_2FA" -eq 0 ] 2>/dev/null; then
    report P0 "admin-jwt.strategy.ts" "-" "JWT Strategy 未检查 pending2fa 字段（2FA 可绕过）"
  else
    echo -e "${GREEN}[OK]${NC} 2FA Token 检查已存在"
  fi
fi

echo ""

#==============================================================================
# 12. 实体与 SQL Schema 一致性检测
#==============================================================================
echo "=== 12. 实体与 SQL Schema 一致性检测 ==="

if command -v mysql &>/dev/null; then
  echo "  (需要 MySQL 连接，跳过自动检测)"
  echo "  手动检查命令:"
  echo "    mysql -u root shuhe_wenchuang -e 'DESCRIBE nft_onchain_tasks;'"
  echo "    对比 nft-onchain-task.entity.ts 的 @Column 定义"
else
  echo "  MySQL 未安装，跳过"
fi

echo ""

#==============================================================================
# 13. 前端操作是否调用后端 API 检测
#==============================================================================
echo "=== 13. 前端操作 API 调用检测 ==="

# 检查用户/订单页面的操作是否调用了 API
for view in "user/index.vue" "order/index.vue"; do
  VIEW_FILE="$FRONTEND/views/$view"
  if [ -f "$VIEW_FILE" ]; then
    # 检查是否有 row.status = 的直接赋值（不调用 API 的标志）
    DIRECT_ASSIGN=$(grep -c "row\.\(status\|frozen\) =" "$VIEW_FILE" 2>/dev/null || echo "0")
    if [ "$DIRECT_ASSIGN" -gt 0 ]; then
      report P1 "$view" "-" "发现 $DIRECT_ASSIGN 处直接修改 row 数据（可能未调用后端 API）"
    fi
  fi
done

echo ""

#==============================================================================
# 汇总
#==============================================================================
echo "================================================"
echo "  扫描完成"
echo "  发现问题总数: $ISSUE_COUNT"
echo "================================================"

if [ "$ISSUE_COUNT" -gt 0 ]; then
  exit 1
else
  echo -e "${GREEN}未发现可自动检测的风险项${NC}"
  exit 0
fi
