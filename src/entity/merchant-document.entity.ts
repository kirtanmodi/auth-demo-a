import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Merchant } from "./merchant.entity.ts";
import { MerchantMember } from "./merchant-member.entity.ts";

@Entity("merchant_documents")
export class MerchantDocument {
  @PrimaryGeneratedColumn("uuid")
  document_id: string;

  @Column({ type: "uuid" })
  merchant_id: string;

  @Column({ type: "uuid", nullable: true })
  member_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  @Column({ type: "smallint" })
  document_type: number;

  @Column({ type: "varchar", length: 255 })
  document_name: string;

  @Column({ type: "varchar", length: 1024 })
  document_path: string;

  @Column({ type: "varchar", length: 100 })
  mime_type: string;

  @Column({ type: "integer" })
  file_size: number;

  @Column({ type: "smallint", default: 0 })
  verification_status: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  verification_date: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  verified_by: string;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.documents, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;

  @ManyToOne(() => MerchantMember, (member) => member.documents, { onDelete: "SET NULL" })
  @JoinColumn({ name: "member_id" })
  member: MerchantMember;
}
