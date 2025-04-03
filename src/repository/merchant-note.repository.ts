import { EntityRepository, Repository } from "typeorm";
import { MerchantNote } from "../entity/merchant-note.entity.ts";

@EntityRepository(MerchantNote)
export class MerchantNoteRepository extends Repository<MerchantNote> {
  /**
   * Find notes by merchant
   * @param merchantId Merchant ID
   * @param includeInternal Whether to include internal notes
   */
  async findByMerchant(merchantId: string, includeInternal: boolean = true): Promise<MerchantNote[]> {
    const query: any = {
      merchant_id: merchantId,
    };

    if (!includeInternal) {
      query.is_internal = false;
    }

    const notes = await this.find({
      where: query,
      order: { created_at: "DESC" },
    });
    return notes ?? [];
  }

  /**
   * Find notes by type
   * @param merchantId Merchant ID
   * @param noteType Note type code
   */
  async findByType(merchantId: string, noteType: number): Promise<MerchantNote[]> {
    const notes = await this.find({
      where: {
        merchant_id: merchantId,
        note_type: noteType,
      },
      order: { created_at: "DESC" },
    });
    return notes ?? [];
  }

  /**
   * Create a new note
   * @param merchantId Merchant ID
   * @param createdBy User who created the note
   * @param noteText Note content
   * @param noteType Note type code
   * @param isInternal Whether note is internal
   */
  async createNote(
    merchantId: string,
    createdBy: string,
    noteText: string,
    noteType: number = 0,
    isInternal: boolean = true
  ): Promise<MerchantNote | undefined> {
    const note = new MerchantNote();
    note.merchant_id = merchantId;
    note.created_by = createdBy;
    note.note_text = noteText;
    note.note_type = noteType;
    note.is_internal = isInternal;

    const savedNote = await this.save(note);
    return savedNote ?? undefined;
  }
}
