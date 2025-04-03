// merchant-note.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Merchant } from "./merchant.entity.ts";

@Entity("merchant_notes")
export class MerchantNote {
  @PrimaryGeneratedColumn("uuid")
  note_id: string;

  @Column()
  merchant_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @Column({ length: 255 })
  created_by: string;

  @Column({ type: "text" })
  note_text: string;

  @Column({ type: "smallint", default: 0 })
  note_type: number;

  @Column({ default: true })
  is_internal: boolean;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.notes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;
}
