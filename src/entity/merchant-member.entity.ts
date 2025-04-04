import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Merchant } from "./merchant.entity.ts";
import { MerchantDocument } from "./merchant-document.entity.ts";

@Entity("merchant_members")
export class MerchantMember {
  @PrimaryGeneratedColumn("uuid")
  member_id: string;

  @Column({ type: "uuid" })
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  title: string;

  @Column({ type: "varchar", length: 100 })
  first_name: string;

  @Column({ type: "varchar", length: 100 })
  last_name: string;

  @Column({ type: "varchar", length: 20 })
  ssn: string;

  @Column({ type: "date" })
  date_of_birth: Date;

  @Column({ type: "smallint" })
  ownership_percentage: number;

  @Column({ type: "boolean", default: false })
  significant_responsibility: boolean;

  @Column({ type: "boolean", default: false })
  politically_exposed: boolean;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 20 })
  phone: string;

  @Column({ type: "boolean", default: false })
  is_primary: boolean;

  // Address
  @Column({ type: "varchar", length: 255 })
  address1: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address2: string;

  @Column({ type: "varchar", length: 100 })
  city: string;

  @Column({ type: "varchar", length: 50 })
  state: string;

  @Column({ type: "varchar", length: 20 })
  zip: string;

  @Column({ type: "varchar", length: 50 })
  country: string;

  // Identity verification fields
  @Column({ type: "smallint", default: 0 })
  id_verification_status: number;

  @Column({ type: "smallint", default: 0 })
  background_check_status: number;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;

  @OneToMany(() => MerchantDocument, (document) => document.member)
  documents: MerchantDocument[];
}
