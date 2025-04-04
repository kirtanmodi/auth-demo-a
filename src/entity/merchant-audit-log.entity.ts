import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Merchant } from "./merchant.entity.ts";

@Entity("merchant_audit_log")
export class MerchantAuditLog {
  @PrimaryGeneratedColumn("uuid")
  log_id: string;

  @Column({ type: "uuid" })
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @Column({ type: "varchar", length: 50 })
  table_name: string;

  @Column({ type: "uuid" })
  record_id: string;

  @Column({ type: "varchar", length: 10 })
  action: string;

  @Column({ type: "varchar", length: 255 })
  changed_by: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address: string;

  @Column({ type: "jsonb" })
  changes: any;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.audit_logs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;
}
