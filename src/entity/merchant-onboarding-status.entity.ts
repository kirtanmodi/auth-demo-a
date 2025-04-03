import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { Merchant } from "./merchant.entity.ts";

@Entity("merchant_onboarding_status")
export class MerchantOnboardingStatus {
  @PrimaryGeneratedColumn("uuid")
  status_id: string;

  @Column()
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @Column({ type: "smallint", default: 1 })
  current_step: number;

  @Column({ default: false })
  is_completed: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  completion_date: Date;

  @Column({ default: false })
  entity_info_completed: boolean;

  @Column({ default: false })
  bank_info_completed: boolean;

  @Column({ default: false })
  owner_info_completed: boolean;

  @Column({ default: false })
  documents_uploaded: boolean;

  @Column({ default: false })
  verification_completed: boolean;

  @Column({ default: false })
  agreement_accepted: boolean;

  // Additional status fields
  @Column({ type: "smallint", default: 0 })
  kyc_status: number;

  @Column({ type: "smallint", default: 0 })
  aml_status: number;

  @Column({ type: "smallint", default: 0 })
  underwriting_status: number;

  @Column({ default: false })
  is_automated_onboarding: boolean;

  @Column({ type: "text", nullable: true })
  notes: string;

  // Relations
  @OneToOne(() => Merchant, (merchant) => merchant.onboarding_status, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;
}
