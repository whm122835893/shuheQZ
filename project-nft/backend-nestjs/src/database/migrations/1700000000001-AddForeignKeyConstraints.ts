/**
 * 为关键表添加外键约束
 *
 * 背景：
 *   原始 schema 通过 synchronize 创建，仅有索引无外键约束，
 *   导致数据库层无法防止孤儿记录（如订单引用了不存在的用户）。
 *
 * 策略：
 *   - 非空外键：ON DELETE RESTRICT ON UPDATE CASCADE
 *     （阻止物理删除被引用的父记录，但软删除不受影响）
 *   - 可空外键：ON DELETE SET NULL ON UPDATE CASCADE
 *     （父记录被物理删除时置空，而非报错）
 *
 * 注意：
 *   执行前请确保无孤儿数据，否则迁移会失败。
 *   可先执行修复脚本清理孤儿记录：
 *     DELETE FROM nft_orders WHERE user_id NOT IN (SELECT id FROM nft_users);
 *     ...
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForeignKeyConstraints1700000000001 implements MigrationInterface {
  name = 'AddForeignKeyConstraints1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. nft_orders → nft_users (user_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_orders\`
       ADD CONSTRAINT \`fk_orders_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // 2. nft_orders → nft_collectibles (collectible_id)
    await queryRunner.query(
      `ALTER TABLE \`nft_orders\`
       ADD CONSTRAINT \`fk_orders_collectible\`
       FOREIGN KEY (\`collectible_id\`) REFERENCES \`nft_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 3. nft_payments → nft_orders (order_id)
    // 4. nft_payments → nft_users (user_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_payments\`
       ADD CONSTRAINT \`fk_payments_order\`
       FOREIGN KEY (\`order_id\`) REFERENCES \`nft_orders\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_payments\`
       ADD CONSTRAINT \`fk_payments_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 5. nft_user_collectibles → nft_users (user_id)
    // 6. nft_user_collectibles → nft_collectibles (collectible_id)
    // 7. nft_user_collectibles → nft_orders (order_id, nullable)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\`
       ADD CONSTRAINT \`fk_uc_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\`
       ADD CONSTRAINT \`fk_uc_collectible\`
       FOREIGN KEY (\`collectible_id\`) REFERENCES \`nft_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\`
       ADD CONSTRAINT \`fk_uc_order\`
       FOREIGN KEY (\`order_id\`) REFERENCES \`nft_orders\`(\`id\`)
       ON DELETE SET NULL ON UPDATE CASCADE`,
    );

    // ============================================================
    // 8. nft_refunds → nft_orders (order_id)
    // 9. nft_refunds → nft_users (user_id)
    // 10. nft_refunds → nft_payments (payment_id, nullable)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\`
       ADD CONSTRAINT \`fk_refunds_order\`
       FOREIGN KEY (\`order_id\`) REFERENCES \`nft_orders\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\`
       ADD CONSTRAINT \`fk_refunds_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\`
       ADD CONSTRAINT \`fk_refunds_payment\`
       FOREIGN KEY (\`payment_id\`) REFERENCES \`nft_payments\`(\`id\`)
       ON DELETE SET NULL ON UPDATE CASCADE`,
    );

    // ============================================================
    // 11. nft_blind_box_open_records → nft_users (user_id)
    // 12. nft_blind_box_open_records → nft_blind_boxes (blind_box_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_open_records\`
       ADD CONSTRAINT \`fk_bbor_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_open_records\`
       ADD CONSTRAINT \`fk_bbor_blind_box\`
       FOREIGN KEY (\`blind_box_id\`) REFERENCES \`nft_blind_boxes\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 13. nft_blind_box_items → nft_blind_boxes (blind_box_id)
    // 14. nft_blind_box_items → nft_collectibles (collectible_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_items\`
       ADD CONSTRAINT \`fk_bbi_blind_box\`
       FOREIGN KEY (\`blind_box_id\`) REFERENCES \`nft_blind_boxes\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_items\`
       ADD CONSTRAINT \`fk_bbi_collectible\`
       FOREIGN KEY (\`collectible_id\`) REFERENCES \`nft_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 15. nft_onchain_tasks → nft_chain_channels (channel_id, nullable)
    // 16. nft_onchain_tasks → nft_collectibles (collectible_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_onchain_tasks\`
       ADD CONSTRAINT \`fk_ot_channel\`
       FOREIGN KEY (\`channel_id\`) REFERENCES \`nft_chain_channels\`(\`id\`)
       ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_onchain_tasks\`
       ADD CONSTRAINT \`fk_ot_collectible\`
       FOREIGN KEY (\`collectible_id\`) REFERENCES \`nft_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 17. nft_transfers → nft_users (from_user_id)
    // 18. nft_transfers → nft_users (to_user_id)
    // 19. nft_transfers → nft_user_collectibles (user_collectible_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\`
       ADD CONSTRAINT \`fk_transfer_from_user\`
       FOREIGN KEY (\`from_user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\`
       ADD CONSTRAINT \`fk_transfer_to_user\`
       FOREIGN KEY (\`to_user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\`
       ADD CONSTRAINT \`fk_transfer_user_collectible\`
       FOREIGN KEY (\`user_collectible_id\`) REFERENCES \`nft_user_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 20. nft_user_addresses → nft_users (user_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_user_addresses\`
       ADD CONSTRAINT \`fk_ua_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 21. nft_user_wallets → nft_users (user_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_user_wallets\`
       ADD CONSTRAINT \`fk_uw_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 22. nft_invite_records → nft_users (inviter_user_id)
    // 23. nft_invite_records → nft_users (invitee_user_id, nullable)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_invite_records\`
       ADD CONSTRAINT \`fk_ir_inviter\`
       FOREIGN KEY (\`inviter_user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_invite_records\`
       ADD CONSTRAINT \`fk_ir_invitee\`
       FOREIGN KEY (\`invitee_user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE SET NULL ON UPDATE CASCADE`,
    );

    // ============================================================
    // 24. nft_resale_listings → nft_users (seller_id)
    // 25. nft_resale_listings → nft_collectibles (collectible_id)
    // 26. nft_resale_listings → nft_user_collectibles (user_collectible_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\`
       ADD CONSTRAINT \`fk_rl_seller\`
       FOREIGN KEY (\`seller_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\`
       ADD CONSTRAINT \`fk_rl_collectible\`
       FOREIGN KEY (\`collectible_id\`) REFERENCES \`nft_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\`
       ADD CONSTRAINT \`fk_rl_user_collectible\`
       FOREIGN KEY (\`user_collectible_id\`) REFERENCES \`nft_user_collectibles\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );

    // ============================================================
    // 27. nft_wallet_transactions → nft_users (user_id)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE \`nft_wallet_transactions\`
       ADD CONSTRAINT \`fk_wt_user\`
       FOREIGN KEY (\`user_id\`) REFERENCES \`nft_users\`(\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 按反向顺序删除外键约束（先删依赖链下游的约束）

    // nft_wallet_transactions
    await queryRunner.query(
      `ALTER TABLE \`nft_wallet_transactions\` DROP FOREIGN KEY \`fk_wt_user\``,
    );

    // nft_resale_listings
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\` DROP FOREIGN KEY \`fk_rl_user_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\` DROP FOREIGN KEY \`fk_rl_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_resale_listings\` DROP FOREIGN KEY \`fk_rl_seller\``,
    );

    // nft_invite_records
    await queryRunner.query(
      `ALTER TABLE \`nft_invite_records\` DROP FOREIGN KEY \`fk_ir_invitee\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_invite_records\` DROP FOREIGN KEY \`fk_ir_inviter\``,
    );

    // nft_user_wallets
    await queryRunner.query(
      `ALTER TABLE \`nft_user_wallets\` DROP FOREIGN KEY \`fk_uw_user\``,
    );

    // nft_user_addresses
    await queryRunner.query(
      `ALTER TABLE \`nft_user_addresses\` DROP FOREIGN KEY \`fk_ua_user\``,
    );

    // nft_transfers
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\` DROP FOREIGN KEY \`fk_transfer_user_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\` DROP FOREIGN KEY \`fk_transfer_to_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_transfers\` DROP FOREIGN KEY \`fk_transfer_from_user\``,
    );

    // nft_onchain_tasks
    await queryRunner.query(
      `ALTER TABLE \`nft_onchain_tasks\` DROP FOREIGN KEY \`fk_ot_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_onchain_tasks\` DROP FOREIGN KEY \`fk_ot_channel\``,
    );

    // nft_blind_box_items
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_items\` DROP FOREIGN KEY \`fk_bbi_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_items\` DROP FOREIGN KEY \`fk_bbi_blind_box\``,
    );

    // nft_blind_box_open_records
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_open_records\` DROP FOREIGN KEY \`fk_bbor_blind_box\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_blind_box_open_records\` DROP FOREIGN KEY \`fk_bbor_user\``,
    );

    // nft_refunds
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\` DROP FOREIGN KEY \`fk_refunds_payment\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\` DROP FOREIGN KEY \`fk_refunds_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_refunds\` DROP FOREIGN KEY \`fk_refunds_order\``,
    );

    // nft_user_collectibles
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\` DROP FOREIGN KEY \`fk_uc_order\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\` DROP FOREIGN KEY \`fk_uc_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_user_collectibles\` DROP FOREIGN KEY \`fk_uc_user\``,
    );

    // nft_payments
    await queryRunner.query(
      `ALTER TABLE \`nft_payments\` DROP FOREIGN KEY \`fk_payments_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_payments\` DROP FOREIGN KEY \`fk_payments_order\``,
    );

    // nft_orders
    await queryRunner.query(
      `ALTER TABLE \`nft_orders\` DROP FOREIGN KEY \`fk_orders_collectible\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`nft_orders\` DROP FOREIGN KEY \`fk_orders_user\``,
    );
  }
}
