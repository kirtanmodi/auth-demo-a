// src/service/merchant-onboarding-status.service.ts
import { MerchantOnboardingStatus } from "../entity/merchant-onboarding-status.entity.ts";
import { MerchantOnboardingStatusRepository } from "../repository/merchant-onboarding-status.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantOnboardingStatusService {
  private onboardingStatusRepository: MerchantOnboardingStatusRepository;
  private auditLogService: MerchantAuditLogService;

  constructor() {
    this.onboardingStatusRepository = getCustomRepository(MerchantOnboardingStatusRepository);
    this.auditLogService = new MerchantAuditLogService();
  }

  /**
   * Find onboarding status by ID
   * @param statusId Status ID
   */
  async findById(statusId: string): Promise<MerchantOnboardingStatus | undefined> {
    const status = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });
    return status ?? undefined;
  }

  /**
   * Find onboarding status by merchant ID
   * @param merchantId Merchant ID
   */
  async findByMerchantId(merchantId: string): Promise<MerchantOnboardingStatus | undefined> {
    return this.onboardingStatusRepository.findByMerchantId(merchantId);
  }

  /**
   * Create onboarding status for merchant
   * @param merchantId Merchant ID
   * @param userId User creating the status
   * @param ipAddress IP address of the user
   */
  async create(merchantId: string, userId?: string, ipAddress?: string): Promise<MerchantOnboardingStatus> {
    // Create initial status
    const onboardingStatus = new MerchantOnboardingStatus();
    onboardingStatus.merchant_id = merchantId;
    onboardingStatus.current_step = 1;
    onboardingStatus.is_completed = false;

    const savedStatus = await this.onboardingStatusRepository.save(onboardingStatus);

    // Log the creation if user info is provided
    if (userId) {
      await this.auditLogService.createLogEntry(
        merchantId,
        "merchant_onboarding_status",
        savedStatus.status_id,
        "INSERT",
        userId,
        { new: savedStatus },
        ipAddress
      );
    }

    return savedStatus;
  }

  /**
   * Update onboarding step
   * @param statusId Status ID
   * @param step New step number
   * @param userId User updating the step
   * @param ipAddress IP address of the user
   */
  async updateStep(statusId: string, step: number, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const oldStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });
    if (!oldStatus) {
      throw new Error(`Onboarding status not found: ${statusId}`);
    }

    // Update step
    await this.onboardingStatusRepository.updateStep(statusId, step);

    // Get updated data
    const updatedStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      oldStatus.merchant_id,
      "merchant_onboarding_status",
      statusId,
      "UPDATE",
      userId,
      {
        old: { current_step: oldStatus.current_step },
        new: { current_step: updatedStatus?.current_step },
      },
      ipAddress
    );
  }

  /**
   * Mark specific section as completed
   * @param statusId Status ID
   * @param section Section field name to mark as completed
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async markSectionCompleted(statusId: string, section: string, userId?: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const oldStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });
    if (!oldStatus) {
      throw new Error(`Onboarding status not found: ${statusId}`);
    }

    // Update section
    await this.onboardingStatusRepository.markSectionCompleted(statusId, section);

    // Get updated data
    const updatedStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });

    // Log the update if user info is provided
    if (userId) {
      const changes: any = {};
      changes.old = {};
      changes.new = {};
      changes.old[section] = oldStatus[section as keyof MerchantOnboardingStatus];
      changes.new[section] = true;

      // Include completion status changes if they changed
      if (oldStatus.is_completed !== updatedStatus?.is_completed) {
        changes.old.is_completed = oldStatus.is_completed;
        changes.new.is_completed = updatedStatus?.is_completed;
        changes.old.completion_date = oldStatus.completion_date;
        changes.new.completion_date = updatedStatus?.completion_date;
      }

      await this.auditLogService.createLogEntry(oldStatus.merchant_id, "merchant_onboarding_status", statusId, "UPDATE", userId, changes, ipAddress);
    }
  }

  /**
   * Update verification statuses
   * @param statusId Status ID
   * @param kycStatus KYC status code
   * @param amlStatus AML status code
   * @param underwritingStatus Underwriting status code
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async updateVerificationStatuses(
    statusId: string,
    kycStatus: number | undefined,
    amlStatus: number | undefined,
    underwritingStatus: number | undefined,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Get current data for audit logging
    const oldStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });
    if (!oldStatus) {
      throw new Error(`Onboarding status not found: ${statusId}`);
    }

    // Update statuses
    await this.onboardingStatusRepository.updateVerificationStatuses(statusId, kycStatus, amlStatus, underwritingStatus);

    // Get updated data
    const updatedStatus = await this.onboardingStatusRepository.findOne({ where: { status_id: statusId } });

    // Prepare changes for audit log
    const changes: any = { old: {}, new: {} };

    if (kycStatus !== undefined) {
      changes.old.kyc_status = oldStatus.kyc_status;
      changes.new.kyc_status = updatedStatus?.kyc_status;
    }

    if (amlStatus !== undefined) {
      changes.old.aml_status = oldStatus.aml_status;
      changes.new.aml_status = updatedStatus?.aml_status;
    }

    if (underwritingStatus !== undefined) {
      changes.old.underwriting_status = oldStatus.underwriting_status;
      changes.new.underwriting_status = updatedStatus?.underwriting_status;
    }

    // Log the update
    await this.auditLogService.createLogEntry(oldStatus.merchant_id, "merchant_onboarding_status", statusId, "UPDATE", userId, changes, ipAddress);

    // Check if verification is complete based on KYC, AML and underwriting
    const isVerificationComplete =
      updatedStatus?.kyc_status === 2 && // KYC passed
      updatedStatus?.aml_status === 2 && // AML passed
      updatedStatus?.underwriting_status === 2; // Underwriting approved

    if (isVerificationComplete && !updatedStatus.verification_completed) {
      await this.markSectionCompleted(statusId, "verification_completed", userId, ipAddress);
    }
  }

  /**
   * Mark agreement as accepted
   * @param statusId Status ID
   * @param userId User accepting the agreement
   * @param ipAddress IP address of the user
   */
  async markAgreementAccepted(statusId: string, userId: string, ipAddress?: string): Promise<void> {
    await this.markSectionCompleted(statusId, "agreement_accepted", userId, ipAddress);
  }

  /**
   * Find merchants in onboarding with specific status
   * @param isCompleted Whether onboarding is completed
   */
  async findByCompletionStatus(isCompleted: boolean): Promise<MerchantOnboardingStatus[]> {
    return this.onboardingStatusRepository.findByCompletionStatus(isCompleted);
  }
}
