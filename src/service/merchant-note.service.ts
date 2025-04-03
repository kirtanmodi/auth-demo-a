// src/service/merchant-note.service.ts
import { MerchantNote } from "../entity/merchant-note.entity.ts";
import { MerchantNoteRepository } from "../repository/merchant-note.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantNoteService {
  private noteRepository: MerchantNoteRepository;
  private auditLogService: MerchantAuditLogService;

  constructor() {
    this.noteRepository = getCustomRepository(MerchantNoteRepository);
    this.auditLogService = new MerchantAuditLogService();
  }

  /**
   * Find note by ID
   * @param noteId Note ID
   */
  async findById(noteId: string): Promise<MerchantNote | undefined> {
    const note = await this.noteRepository.findOne({ where: { note_id: noteId } });
    return note ?? undefined;
  }

  /**
   * Find notes by merchant
   * @param merchantId Merchant ID
   * @param includeInternal Whether to include internal notes
   */
  async findByMerchant(merchantId: string, includeInternal: boolean = true): Promise<MerchantNote[]> {
    return this.noteRepository.findByMerchant(merchantId, includeInternal);
  }

  /**
   * Find notes by type
   * @param merchantId Merchant ID
   * @param noteType Note type code
   */
  async findByType(merchantId: string, noteType: number): Promise<MerchantNote[]> {
    return this.noteRepository.findByType(merchantId, noteType);
  }

  /**
   * Create a new note
   * @param merchantId Merchant ID
   * @param createdBy User who created the note
   * @param noteText Note content
   * @param noteType Note type code
   * @param isInternal Whether note is internal
   * @param ipAddress IP address of the user
   */
  async createNote(
    merchantId: string,
    createdBy: string,
    noteText: string,
    noteType: number = 0,
    isInternal: boolean = true,
    ipAddress?: string
  ): Promise<MerchantNote> {
    // Create the note
    const note = await this.noteRepository.createNote(merchantId, createdBy, noteText, noteType, isInternal);

    // Log the creation
    await this.auditLogService.createLogEntry(merchantId, "merchant_notes", note?.note_id ?? "", "INSERT", createdBy, { new: note }, ipAddress);

    if (!note) {
      throw new Error("Failed to create note");
    }

    return note;
  }

  /**
   * Update note text
   * @param noteId Note ID
   * @param noteText Updated note text
   * @param userId User updating the note
   * @param ipAddress IP address of the user
   */
  async updateNoteText(noteId: string, noteText: string, userId: string, ipAddress?: string): Promise<MerchantNote> {
    // Get current data for audit logging
    const oldNote = await this.noteRepository.findOne({ where: { note_id: noteId } });
    if (!oldNote) {
      throw new Error(`Note not found: ${noteId}`);
    }

    // Update note
    await this.noteRepository.update(noteId, { note_text: noteText });

    // Get updated data
    const updatedNote = await this.noteRepository.findOne({ where: { note_id: noteId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      oldNote.merchant_id,
      "merchant_notes",
      noteId,
      "UPDATE",
      userId,
      {
        old: { note_text: oldNote.note_text },
        new: { note_text: updatedNote?.note_text },
      },
      ipAddress
    );

    if (!updatedNote) {
      throw new Error("Failed to update note");
    }

    return updatedNote;
  }

  /**
   * Delete note
   * @param noteId Note ID
   * @param userId User deleting the note
   * @param ipAddress IP address of the user
   */
  async delete(noteId: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const note = await this.noteRepository.findOne({ where: { note_id: noteId } });
    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const merchantId = note.merchant_id;

    // Delete note
    await this.noteRepository.delete(noteId);

    // Log the deletion
    await this.auditLogService.createLogEntry(merchantId, "merchant_notes", noteId, "DELETE", userId, { old: note }, ipAddress);
  }
}
