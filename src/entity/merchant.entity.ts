import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from "typeorm";
import { MerchantBankAccount } from "./merchant-bank-account.entity.ts";
import { MerchantMember } from "./merchant-member.entity.ts";
import { MerchantDocument } from "./merchant-document.entity.ts";
import { MerchantOnboardingStatus } from "./merchant-onboarding-status.entity.ts";
import { MerchantNote } from "./merchant-note.entity.ts";
import { MerchantAuditLog } from "./merchant-audit-log.entity.ts";

@Entity("merchants")
export class Merchant {
  @PrimaryGeneratedColumn("uuid")
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  // Entity Information
  @Column({ type: "smallint", default: 1 })
  entity_type: number;

  @Column({ type: "varchar", length: 255 })
  legal_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  business_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address1: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address2: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  state: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  zip: string;

  @Column({ type: "varchar", length: 50, default: "US" })
  country: string;

  @Column({ type: "varchar", length: 20 })
  phone: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  ein: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  website: string;

  @Column({ type: "varchar", length: 10, default: "1.0" })
  tc_version: string;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency: string;

  // Merchant Business Information
  @Column({ type: "varchar", length: 255, nullable: true })
  dba_name: string;

  @Column({ type: "boolean", default: true })
  is_new: boolean;

  @Column({ type: "varchar", length: 4, default: "5999" })
  mcc: string;

  @Column({ type: "smallint", default: 1 })
  status: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  annual_cc_sales: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  avg_ticket: number;

  @Column({ type: "date", nullable: true })
  established_date: Date;

  // Verification and Risk Fields
  @Column({ type: "smallint", default: 0 })
  verification_status: number;

  @Column({ type: "smallint", nullable: true })
  risk_score: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  approval_date: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  approved_by: string;

  // Relations
  @OneToMany(() => MerchantBankAccount, (bankAccount) => bankAccount.merchant)
  bank_accounts: MerchantBankAccount[];

  @OneToMany(() => MerchantMember, (member) => member.merchant)
  members: MerchantMember[];

  @OneToMany(() => MerchantDocument, (document) => document.merchant)
  documents: MerchantDocument[];

  @OneToOne(() => MerchantOnboardingStatus, (onboardingStatus) => onboardingStatus.merchant)
  onboarding_status: MerchantOnboardingStatus;

  @OneToMany(() => MerchantNote, (note) => note.merchant)
  notes: MerchantNote[];

  @OneToMany(() => MerchantAuditLog, (auditLog) => auditLog.merchant)
  audit_logs: MerchantAuditLog[];
}
