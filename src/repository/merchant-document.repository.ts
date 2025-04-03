import { EntityRepository, Repository } from "typeorm";
import { MerchantDocument } from "../entity/merchant-document.entity.ts";

@EntityRepository(MerchantDocument)
export class MerchantDocumentRepository extends Repository<MerchantDocument> {
  /**
   * Find documents by merchant
   * @param merchantId Merchant ID
   */
  async findByMerchant(merchantId: string): Promise<MerchantDocument[]> {
    return this.find({
      where: { merchant_id: merchantId },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Find documents by member
   * @param memberId Member ID
   */
  async findByMember(memberId: string): Promise<MerchantDocument[]> {
    return this.find({
      where: { member_id: memberId },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Find documents by type for a merchant
   * @param merchantId Merchant ID
   * @param documentType Document type code
   */
  async findByType(merchantId: string, documentType: number): Promise<MerchantDocument[]> {
    return this.find({
      where: {
        merchant_id: merchantId,
        document_type: documentType,
      },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Update verification status
   * @param documentId Document ID
   * @param status New verification status
   * @param verifiedBy User who verified
   */
  async updateVerificationStatus(documentId: string, status: number, verifiedBy?: string): Promise<void> {
    const updateData: any = {
      verification_status: status,
      verification_date: new Date(),
    };

    if (verifiedBy) {
      updateData.verified_by = verifiedBy;
    }

    await this.update(documentId, updateData);
  }

  /**
   * Count documents by verification status for a merchant
   * @param merchantId Merchant ID
   * @param status Verification status
   */
  async countByVerificationStatus(merchantId: string, status: number): Promise<number> {
    return this.count({
      where: {
        merchant_id: merchantId,
        verification_status: status,
      },
    });
  }
}
