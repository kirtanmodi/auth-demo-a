import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Merchant } from "./merchant.entity.js";

@Entity("merchant_bank_accounts")
export class MerchantBankAccount {
  @PrimaryGeneratedColumn("uuid")
  account_id: string;

  @Column({ type: "uuid" })
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_primary: boolean;

  @Column({ type: "smallint" })
  account_method: number;

  @Column({ type: "varchar", length: 255 })
  account_number: string;

  @Column({ type: "varchar", length: 50 })
  routing_number: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  account_name: string;

  @Column({ type: "varchar", length: 3 })
  currency: string;

  @Column({ type: "smallint", default: 0 })
  status: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  verification_date: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.bank_accounts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;
}
