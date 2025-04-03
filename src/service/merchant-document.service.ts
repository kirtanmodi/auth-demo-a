// src/service/merchant-document.service.ts
import { MerchantDocument } from "../entity/merchant-document.entity.ts";
import { MerchantDocumentRepository } from "../repository/merchant-document.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { MerchantOnboardingStatusService } from "./merchant-onboarding-status.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantDocumentService {
  private documentRepository: MerchantDocumentRepository;
  private auditLogService: MerchantAuditLogService;
  private onboardingStatusService: MerchantOnboardingStatusService;

  constructor() {
    this.documentRepository = getCustomRepository(MerchantDocumentRepository);
    this.auditLogService = new MerchantAuditLogService();
    this.onboardingStatusService = new MerchantOnboardingStatusService();
  }

  /**
   * Find document by ID
   * @param documentId Document ID
   */
  async findById(documentId: string): Promise<MerchantDocument | undefined> {
    const document = await this.documentRepository.findOne({ where: { document_id: documentId } });
    return document ?? undefined;
  }

  /**
   * Find documents by merchant
   * @param merchantId Merchant ID
   */
  async findByMerchant(merchantId: string): Promise<MerchantDocument[]> {
    return this.documentRepository.findByMerchant(merchantId);
  }

  /**
   * Find documents by member
   * @param memberId Member ID
   */
  async findByMember(memberId: string): Promise<MerchantDocument[]> {
    return this.documentRepository.findByMember(memberId);
  }

  /**
   * Find documents by type for a merchant
   * @param merchantId Merchant ID
   * @param documentType Document type code
   */
  async findByType(merchantId: string, documentType: number): Promise<MerchantDocument[]> {
    return this.documentRepository.findByType(merchantId, documentType);
  }

  /**
   * Create document
   * @param documentData Document data
   * @param userId User creating the document
   * @param ipAddress IP address of the user
   */
  async create(documentData: Partial<MerchantDocument>, userId: string, ipAddress?: string): Promise<MerchantDocument> {
    // Validate required fields
    this.validateDocumentData(documentData);

    // Create document
    const document = this.documentRepository.create(documentData);
    const savedDocument = await this.documentRepository.save(document);

    // Log the creation
    await this.auditLogService.createLogEntry(
      savedDocument.merchant_id,
      "merchant_documents",
      savedDocument.document_id,
      "INSERT",
      userId,
      { new: savedDocument },
      ipAddress
    );

    // Check if document upload section is complete and update onboarding status
    const merchantDocuments = await this.findByMerchant(savedDocument.merchant_id);
    if (merchantDocuments.length > 0) {
      const onboardingStatus = await this.onboardingStatusService.findByMerchantId(savedDocument.merchant_id);
      if (onboardingStatus && !onboardingStatus.documents_uploaded) {
        await this.onboardingStatusService.markSectionCompleted(onboardingStatus.status_id, "documents_uploaded");
      }
    }

    return savedDocument;
  }

  /**
   * Update document
   * @param documentId Document ID
   * @param documentData Updated document data
   * @param userId User updating the document
   * @param ipAddress IP address of the user
   */
  async update(documentId: string, documentData: Partial<MerchantDocument>, userId: string, ipAddress?: string): Promise<MerchantDocument> {
    // Get current data for audit logging
    const oldDocument = await this.documentRepository.findOne({ where: { document_id: documentId } });
    if (!oldDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Update document
    await this.documentRepository.update(documentId, documentData);

    // Get updated data
    const updatedDocument = await this.documentRepository.findOne({ where: { document_id: documentId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      oldDocument.merchant_id,
      "merchant_documents",
      documentId,
      "UPDATE",
      userId,
      {
        old: oldDocument,
        new: updatedDocument,
      },
      ipAddress
    );

    if (!updatedDocument) {
      throw new Error("Failed to update document");
    }

    return updatedDocument;
  }

  /**
   * Update verification status
   * @param documentId Document ID
   * @param status New verification status
   * @param verifiedBy User who verified
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async updateVerificationStatus(documentId: string, status: number, verifiedBy: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const oldDocument = await this.documentRepository.findOne({ where: { document_id: documentId } });
    if (!oldDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Update status
    await this.documentRepository.updateVerificationStatus(documentId, status, verifiedBy);

    // Get updated data
    const updatedDocument = await this.documentRepository.findOne({ where: { document_id: documentId } });

    // Log the status update
    await this.auditLogService.createLogEntry(
      oldDocument.merchant_id,
      "merchant_documents",
      documentId,
      "UPDATE",
      userId,
      {
        old: {
          verification_status: oldDocument.verification_status,
          verification_date: oldDocument.verification_date,
          verified_by: oldDocument.verified_by,
        },
        new: {
          verification_status: updatedDocument?.verification_status,
          verification_date: updatedDocument?.verification_date,
          verified_by: updatedDocument?.verified_by,
        },
      },
      ipAddress
    );
  }

  /**
   * Delete document
   * @param documentId Document ID
   * @param userId User deleting the document
   * @param ipAddress IP address of the user
   */
  async delete(documentId: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const document = await this.documentRepository.findOne({ where: { document_id: documentId } });
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const merchantId = document.merchant_id;

    // Delete document
    await this.documentRepository.delete(documentId);

    // Log the deletion
    await this.auditLogService.createLogEntry(merchantId, "merchant_documents", documentId, "DELETE", userId, { old: document }, ipAddress);
  }

  /**
   * Count documents by verification status for a merchant
   * @param merchantId Merchant ID
   * @param status Verification status
   */
  async countByVerificationStatus(merchantId: string, status: number): Promise<number> {
    return this.documentRepository.countByVerificationStatus(merchantId, status);
  }

  /**
   * Validate required document data
   * @param documentData Document data to validate
   */
  private validateDocumentData(documentData: Partial<MerchantDocument>): void {
    const requiredFields = ["merchant_id", "document_type", "document_name", "document_path", "mime_type", "file_size"];

    const missingFields = requiredFields.filter((field) => !documentData[field as keyof typeof documentData]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required document fields: ${missingFields.join(", ")}`);
    }
  }
}
