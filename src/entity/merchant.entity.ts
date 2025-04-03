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
  @Column({ type: "smallint" })
  entity_type: number;

  @Column({ length: 255 })
  legal_name: string;

  @Column({ length: 255 })
  address1: string;

  @Column({ length: 255, nullable: true })
  address2: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 50 })
  state: string;

  @Column({ length: 20 })
  zip: string;

  @Column({ length: 50 })
  country: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  ein: string;

  @Column({ length: 255, nullable: true })
  website: string;

  @Column({ length: 10 })
  tc_version: string;

  @Column({ length: 3 })
  currency: string;

  // Merchant Business Information
  @Column({ length: 255, nullable: true })
  dba_name: string;

  @Column({ default: true })
  is_new: boolean;

  @Column({ length: 4 })
  mcc: string;

  @Column({ type: "smallint", default: 0 })
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

  @Column({ length: 50, nullable: true })
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
