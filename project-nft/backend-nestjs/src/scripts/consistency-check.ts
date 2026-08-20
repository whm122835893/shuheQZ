/**
 * 数据一致性校验脚本
 *
 * 用于高并发压测后或日常运维中检查数据一致性。
 * 覆盖五大维度：发售、抽奖、合成、钱包、Redis库存非负。
 *
 * 用法：
 *   npx ts-node src/scripts/consistency-check.ts
 *   npx ts-node src/scripts/consistency-check.ts --json  # 仅输出 JSON
 *
 * 输出：
 *   JSON 报告 { passed: boolean, checks: [{ name, passed, detail, diff }] }
 *   校验失败时输出具体差异值，但不自动修复（人工确认后修复）
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

// ============================================================
// 配置
// ============================================================
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || process.env.DB_USERNAME || 'root';
const DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || 'shuhe_wenchuang_test';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_PASS = process.env.REDIS_PASS || process.env.REDIS_PASSWORD || undefined;
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'shuhe:';

// ============================================================
// 工具函数
// ============================================================
interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
  diff?: string;
}

const results: CheckResult[] = [];

function check(name: string, passed: boolean, detail: string, diff?: string) {
  results.push({ name, passed, detail, diff });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}${'\x1b[0m'} ${name}`);
  console.log(`  ${detail}`);
  if (diff) console.log(`  ${'\x1b[33m'}差异: ${diff}${'\x1b[0m'}`);
  console.log();
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');

  if (!jsonOnly) {
    console.log('='.repeat(60));
    console.log('  数据一致性校验');
    console.log('='.repeat(60));
    console.log(`  数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}`);
    console.log(`  Redis:  ${REDIS_HOST}:${REDIS_PORT} db=${REDIS_DB}`);
    console.log('='.repeat(60));
    console.log();
  }

  // 初始化数据源
  const dataSource = new DataSource({
    type: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    synchronize: false,
    logging: false,
  });

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    password: REDIS_PASS,
    keyPrefix: REDIS_PREFIX,
  });

  try {
    await dataSource.initialize();
    if (!jsonOnly) console.log('数据库连接成功\n');

    // ============================================================
    // 1. 发售一致性
    // 已售藏品数 = nft_collectibles.sold 的总和
    // ============================================================
    if (!jsonOnly) console.log('--- 1. 发售一致性 ---');

    const releaseSold = await dataSource
      .createQueryBuilder()
      .select('SUM(sold)', 'total_sold')
      .from('nft_collectibles', 'c')
      .where('c.is_delete = 0')
      .getRawOne();

    const releaseUserCollectibles = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('nft_user_collectibles', 'uc')
      .where("uc.source = 'purchase' AND uc.is_delete = 0")
      .getRawOne();

    const soldCount = parseInt(releaseSold?.total_sold || '0', 10);
    const purchaseCount = parseInt(releaseUserCollectibles?.total || '0', 10);

    check(
      '1.1 发售已售数量 = 用户购买藏品数',
      soldCount === purchaseCount,
      `DB sold=${soldCount}, user_collectibles(purchase)=${purchaseCount}`,
      soldCount !== purchaseCount ? `差值=${soldCount - purchaseCount}` : undefined,
    );

    // ============================================================
    // 2. 抽奖一致性
    // 中奖记录数 = 奖品已发放数量之和
    // nft_lucky_draw_records: 无 win_status 字段，记录存在即表示中奖
    // ============================================================
    if (!jsonOnly) console.log('--- 2. 抽奖一致性 ---');

    const drawRecords = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('nft_lucky_draw_records', 'r')
      .where('r.is_delete = 0')
      .getRawOne();

    const prizeDistributed = await dataSource
      .createQueryBuilder()
      .select('SUM(quantity_distributed)', 'total')
      .from('nft_lucky_draw_prizes', 'p')
      .where('p.is_delete = 0')
      .getRawOne();

    const winCount = parseInt(drawRecords?.total || '0', 10);
    const distributedCount = parseInt(prizeDistributed?.total || '0', 10);

    check(
      '2.1 抽奖中奖记录数 = 奖品已发放数量',
      winCount === distributedCount,
      `中奖记录=${winCount}, 奖品已发放=${distributedCount}`,
      winCount !== distributedCount ? `差值=${winCount - distributedCount}` : undefined,
    );

    // ============================================================
    // 3. 合成一致性
    // 合成记录数 = 合成产出藏品数（每次合成产出1个藏品）
    // nft_synthesis_records: 无 status 字段，记录存在即表示成功
    // ============================================================
    if (!jsonOnly) console.log('--- 3. 合成一致性 ---');

    const synthRecords = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('nft_synthesis_records', 'sr')
      .where('sr.is_delete = 0')
      .getRawOne();

    const synthUserCollectibles = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('nft_user_collectibles', 'uc')
      .where("uc.source = 'synthesis' AND uc.is_delete = 0")
      .getRawOne();

    const synthTotalQty = parseInt(synthRecords?.total || '0', 10);
    const synthUcCount = parseInt(synthUserCollectibles?.total || '0', 10);

    check(
      '3.1 合成产出藏品数 = 合成成功记录数',
      synthTotalQty === synthUcCount,
      `合成记录数=${synthTotalQty}, user_collectibles(synthesis)=${synthUcCount}`,
      synthTotalQty !== synthUcCount ? `差值=${synthTotalQty - synthUcCount}` : undefined,
    );

    // ============================================================
    // 4. 钱包一致性
    // 用户钱包余额 = 充值总额 - 消费总额
    // nft_wallet_transactions: type = 'recharge'|'consume'|'freeze'|'unfreeze'
    // ============================================================
    if (!jsonOnly) console.log('--- 4. 钱包一致性 ---');

    const walletBalances = await dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(balance), 0)', 'total_balance')
      .from('nft_user_wallets', 'w')
      .where('w.is_delete = 0')
      .getRawOne();

    const rechargeTotal = await dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'total_recharge')
      .from('nft_wallet_transactions', 't')
      .where("t.type = 'recharge' AND t.direction = 'in'")
      .getRawOne();

    const consumeTotal = await dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'total_consume')
      .from('nft_wallet_transactions', 't')
      .where("t.type = 'consume' AND t.direction = 'out'")
      .getRawOne();

    const totalBalance = parseFloat(walletBalances?.total_balance || '0');
    const totalRecharge = parseFloat(rechargeTotal?.total_recharge || '0');
    const totalConsume = parseFloat(consumeTotal?.total_consume || '0');

    // 允许 0.01 元的浮点误差
    const walletDiff = Math.abs(totalBalance - (totalRecharge - totalConsume));
    check(
      '4.1 钱包余额 = 充值 - 消费',
      walletDiff < 0.01,
      `当前余额=${totalBalance.toFixed(2)}, 充值=${totalRecharge.toFixed(2)}, 消费=${totalConsume.toFixed(2)}`,
      walletDiff >= 0.01 ? `差值=${walletDiff.toFixed(2)}` : undefined,
    );

    // ============================================================
    // 5. Redis 库存非负检查
    // ============================================================
    if (!jsonOnly) console.log('--- 5. Redis 库存非负 ---');

    let stockKeys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${REDIS_PREFIX}stock:*`,
        'COUNT',
        200,
      );
      cursor = nextCursor;
      stockKeys.push(...keys);
    } while (cursor !== '0');

    let negativeCount = 0;
    const negativeKeys: string[] = [];
    for (const key of stockKeys) {
      const value = await redis.get(key);
      if (value !== null && parseInt(value, 10) < 0) {
        negativeCount++;
        negativeKeys.push(`${key.replace(REDIS_PREFIX, '')}=${value}`);
      }
    }

    check(
      '5.1 Redis 库存非负',
      negativeCount === 0,
      `检查 ${stockKeys.length} 个库存 key，负数 ${negativeCount} 个`,
      negativeCount > 0 ? negativeKeys.join(', ') : undefined,
    );

    // ============================================================
    // 汇总
    // ============================================================
    const passed = results.every((r) => r.passed);
    const passCount = results.filter((r) => r.passed).length;
    const failCount = results.length - passCount;

    const report = {
      passed,
      totalChecks: results.length,
      passedCount: passCount,
      failedCount: failCount,
      checks: results,
      timestamp: new Date().toISOString(),
    };

    if (jsonOnly) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('='.repeat(60));
      console.log(`  校验结果: ${passed ? '✓ 全部通过' : '✗ 存在不一致'}`);
      console.log(`  通过: ${passCount}/${results.length}`);
      if (failCount > 0) {
        console.log(`  失败: ${failCount}`);
        console.log('\n  失败项:');
        results.filter((r) => !r.passed).forEach((r) => {
          console.log(`    ✗ ${r.name}`);
          console.log(`      ${r.detail}`);
          if (r.diff) console.log(`      ${r.diff}`);
        });
      }
      console.log('='.repeat(60));
    }

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('校验脚本执行异常:', error);
    process.exit(2);
  } finally {
    await dataSource.destroy();
    redis.disconnect();
  }
}

main();
