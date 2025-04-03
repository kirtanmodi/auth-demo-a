import { EntityRepository, Repository, MoreThanOrEqual } from "typeorm";
import { MerchantMember } from "../entity/merchant-member.entity.ts";

@EntityRepository(MerchantMember)
export class MerchantMemberRepository extends Repository<MerchantMember> {
  /**
   * Find primary contact for a merchant
   * @param merchantId Merchant ID
   */
  async findPrimaryForMerchant(merchantId: string): Promise<MerchantMember | undefined> {
    const member = await this.findOne({
      where: {
        merchant_id: merchantId,
        is_primary: true,
      },
    });
    return member || undefined;
  }

  /**
   * Find all members for a merchant
   * @param merchantId Merchant ID
   */
  async findAllForMerchant(merchantId: string): Promise<MerchantMember[]> {
    return this.find({
      where: { merchant_id: merchantId },
      order: { is_primary: "DESC", ownership_percentage: "DESC" },
    });
  }

  /**
   * Find member by email
   * @param merchantId Merchant ID
   * @param email Member email
   */
  async findByEmail(merchantId: string, email: string): Promise<MerchantMember | undefined> {
    const member = await this.findOne({
      where: {
        merchant_id: merchantId,
        email,
      },
    });
    return member || undefined;
  }

  /**
   * Find members with ownership above specified percentage
   * @param merchantId Merchant ID
   * @param minPercentage Minimum ownership percentage (in basis points, 10000 = 100%)
   */
  async findByOwnershipThreshold(merchantId: string, minPercentage: number): Promise<MerchantMember[]> {
    return this.find({
      where: {
        merchant_id: merchantId,
        ownership_percentage: MoreThanOrEqual(minPercentage),
      },
      order: { ownership_percentage: "DESC" },
    });
  }

  /**
   * Update verification status
   * @param memberId Member ID
   * @param verificationStatus New verification status
   */
  async updateVerificationStatus(memberId: string, idVerificationStatus?: number, backgroundCheckStatus?: number): Promise<void> {
    const updateData: any = {};

    if (idVerificationStatus !== undefined) {
      updateData.id_verification_status = idVerificationStatus;
    }

    if (backgroundCheckStatus !== undefined) {
      updateData.background_check_status = backgroundCheckStatus;
    }

    if (Object.keys(updateData).length > 0) {
      await this.update(memberId, updateData);
    }
  }

  /**
   * Set member as primary and ensure other members for merchant are not primary
   * @param memberId Member ID to set as primary
   * @param merchantId Merchant ID
   */
  async setAsPrimary(memberId: string, merchantId: string): Promise<void> {
    await this.manager.transaction(async (transactionalEntityManager) => {
      // First set all merchant members to non-primary
      await transactionalEntityManager.update(MerchantMember, { merchant_id: merchantId }, { is_primary: false });

      // Then set the specific member as primary
      await transactionalEntityManager.update(MerchantMember, { member_id: memberId }, { is_primary: true });
    });
  }
}
