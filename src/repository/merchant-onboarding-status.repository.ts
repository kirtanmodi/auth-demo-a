import { EntityRepository, Repository } from "typeorm";
import { MerchantOnboardingStatus } from "../entity/merchant-onboarding-status.entity.ts";

@EntityRepository(MerchantOnboardingStatus)
export class MerchantOnboardingStatusRepository extends Repository<MerchantOnboardingStatus> {
  /**
   * Find by merchant ID
   * @param merchantId Merchant ID
   */
  async findByMerchantId(merchantId: string): Promise<MerchantOnboardingStatus | undefined> {
    const status = await this.findOne({
      where: { merchant_id: merchantId },
    });
    return status ?? undefined;
  }

  /**
   * Update onboarding step
   * @param statusId Status ID
   * @param step New step number
   */
  async updateStep(statusId: string, step: number): Promise<void> {
    await this.update(statusId, { current_step: step });
  }

  /**
   * Mark specific section as completed
   * @param statusId Status ID
   * @param section Section field name to mark as completed
   */
  async markSectionCompleted(statusId: string, section: string): Promise<void> {
    // Ensure the section is valid to prevent SQL injection
    const validSections = [
      "entity_info_completed",
      "bank_info_completed",
      "owner_info_completed",
      "documents_uploaded",
      "verification_completed",
      "agreement_accepted",
    ];

    if (!validSections.includes(section)) {
      throw new Error(`Invalid section: ${section}`);
    }

    const updateData: any = {};
    updateData[section] = true;

    await this.update(statusId, updateData);

    // Check if all sections are completed and update overall status if needed
    const status = await this.findOne({ where: { status_id: statusId } });
    if (
      status &&
      status.entity_info_completed &&
      status.bank_info_completed &&
      status.owner_info_completed &&
      status.documents_uploaded &&
      status.verification_completed &&
      status.agreement_accepted
    ) {
      await this.update(statusId, {
        is_completed: true,
        completion_date: new Date(),
      });
    }
  }

  /**
   * Update verification statuses
   * @param statusId Status ID
   * @param kycStatus KYC status code
   * @param amlStatus AML status code
   * @param underwritingStatus Underwriting status code
   */
  async updateVerificationStatuses(statusId: string, kycStatus?: number, amlStatus?: number, underwritingStatus?: number): Promise<void> {
    const updateData: any = {};

    if (kycStatus !== undefined) {
      updateData.kyc_status = kycStatus;
    }

    if (amlStatus !== undefined) {
      updateData.aml_status = amlStatus;
    }

    if (underwritingStatus !== undefined) {
      updateData.underwriting_status = underwritingStatus;
    }

    if (Object.keys(updateData).length > 0) {
      await this.update(statusId, updateData);
    }
  }

  /**
   * Find merchants in onboarding with specific status
   * @param isCompleted Whether onboarding is completed
   */
  async findByCompletionStatus(isCompleted: boolean): Promise<MerchantOnboardingStatus[]> {
    return this.find({
      where: { is_completed: isCompleted },
      relations: ["merchant"],
      order: { updated_at: "DESC" },
    });
  }
}
