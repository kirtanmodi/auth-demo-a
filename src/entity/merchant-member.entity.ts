import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Merchant } from "./merchant.entity.ts";
import { MerchantDocument } from "./merchant-document.entity.ts";

@Entity("merchant_members")
export class MerchantMember {
  @PrimaryGeneratedColumn("uuid")
  member_id: string;

  @Column()
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @Column({ length: 100, nullable: true })
  title: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 20 })
  ssn: string;

  @Column({ type: "date" })
  date_of_birth: Date;

  @Column({ type: "smallint" })
  ownership_percentage: number;

  @Column({ default: false })
  significant_responsibility: boolean;

  @Column({ default: false })
  politically_exposed: boolean;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ default: false })
  is_primary: boolean;

  // Address
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
