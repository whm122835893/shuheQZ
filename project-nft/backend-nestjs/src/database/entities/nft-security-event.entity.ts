// [管理员模块] - 数据库表 nft_security_events（安全事件日志）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_security_events')
@Index('idx_se_event_type', ['eventType'])
@Index('idx_se_ip', ['ip'])
@Index('idx_se_event_level', ['eventLevel'])
export class NftSecurityEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'event_type', type: 'tinyint', comment: '事件类型（1=登录失败 2=越权访问 3=注入攻击 4=敏感操作 5=异常请求）' })
  eventType: number;

  @Column({ name: 'event_level', type: 'tinyint', default: 2, comment: '事件等级（1=低 2=中 3=高）' })
  eventLevel: number;

  @Column({ name: 'ip', type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'request_path', type: 'varchar', length: 500, nullable: true })
  requestPath: string | null;

  @Column({ name: 'request_params', type: 'text', nullable: true })
  requestParams: string | null;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus: number | null;

  @Column({ name: 'ua', type: 'varchar', length: 500, nullable: true })
  ua: string | null;

  @Column({ name: 'handled_by', type: 'int', unsigned: true, nullable: true })
  handledBy: number | null;

  @Column({ name: 'handled_at', type: 'timestamp', nullable: true })
  handledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
