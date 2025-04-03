// src/repository/merchant.repository.ts
import { EntityRepository, Repository } from "typeorm";
import { Merchant } from "../entity/merchant.entity.ts";

@EntityRepository(Merchant)
export class MerchantRepository extends Repository<Merchant> {
  /**
   * Find merchant by email
   * @param email Merchant email address
   */
  async findByEmail(email: string): Promise<Merchant | undefined> {
    const merchant = await this.findOne({ where: { email } });
    return merchant ?? undefined;
  }

  /**
   * Find merchants by status
   * @param status Merchant status code
   */
  async findByStatus(status: number): Promise<Merchant[]> {
    return this.find({ where: { status } });
  }

  /**
   * Find merchants by verification status
   * @param verificationStatus Verification status code
   */
  async findByVerificationStatus(verificationStatus: number): Promise<Merchant[]> {
    return this.find({ where: { verification_status: verificationStatus } });
  }

  /**
   * Find merchants with full relations loaded
   * @param merchantId Merchant ID
   */
  async findWithFullDetails(merchantId: string): Promise<Merchant | undefined> {
    const merchant = await this.findOne({
      where: { merchant_id: merchantId },
      relations: ["bank_accounts", "members", "documents", "onboarding_status", "notes"],
    });
    return merchant ?? undefined;
  }

  /**
   * Count merchants by status
   * @param status Merchant status code
   */
  async countByStatus(status: number): Promise<number> {
    return this.count({ where: { status } });
  }

  /**
   * Update merchant status
   * @param merchantId Merchant ID
   * @param status New status value
   * @param approvedBy User who approved (optional)
   */
  async updateStatus(merchantId: string, status: number, approvedBy?: string): Promise<void> {
    const updateData: any = { status };

    if (status === 2) {
      // Approved status
      updateData.approval_date = new Date();
      if (approvedBy) {
        updateData.approved_by = approvedBy;
      }
    }

    await this.update(merchantId, updateData);
  }
}
