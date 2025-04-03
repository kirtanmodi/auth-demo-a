// src/service/merchant.service.ts
import { Merchant } from "../entity/merchant.entity.ts";
import { MerchantRepository } from "../repository/merchant.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { MerchantOnboardingStatusService } from "./merchant-onboarding-status.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantService {
  private merchantRepository: MerchantRepository;
  private auditLogService: MerchantAuditLogService;
  private onboardingStatusService: MerchantOnboardingStatusService;

  constructor() {
    this.merchantRepository = getCustomRepository(MerchantRepository);
    this.auditLogService = new MerchantAuditLogService();
    this.onboardingStatusService = new MerchantOnboardingStatusService();
  }

  /**
   * Find merchant by ID
   * @param merchantId Merchant ID
   */
  async findById(merchantId: string): Promise<Merchant | undefined> {
    const merchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });
    return merchant ?? undefined;
  }

  /**
   * Find merchant with all relationships loaded
   * @param merchantId Merchant ID
   */
  async findWithFullDetails(merchantId: string): Promise<Merchant | undefined> {
    return this.merchantRepository.findWithFullDetails(merchantId);
  }

  /**
   * Find merchant by email
   * @param email Merchant email
   */
  async findByEmail(email: string): Promise<Merchant | undefined> {
    return this.merchantRepository.findByEmail(email);
  }

  /**
   * Find merchants by status
   * @param status Merchant status code
   */
  async findByStatus(status: number): Promise<Merchant[]> {
    return this.merchantRepository.findByStatus(status);
  }

  /**
   * Create new merchant
   * @param merchantData Merchant data
   * @param userId User creating the merchant
   * @param ipAddress IP address of the user
   */
  async create(merchantData: Partial<Merchant>, userId: string, ipAddress?: string): Promise<Merchant> {
    // Ensure required fields are present
    this.validateMerchantData(merchantData);

    // Create merchant
    const merchant = this.merchantRepository.create(merchantData);
    const savedMerchant = await this.merchantRepository.save(merchant);

    // Create initial onboarding status
    await this.onboardingStatusService.create(savedMerchant.merchant_id);

    // Log the creation
    await this.auditLogService.createLogEntry(
      savedMerchant.merchant_id,
      "merchants",
      savedMerchant.merchant_id,
      "INSERT",
      userId,
      { new: savedMerchant },
      ipAddress
    );

    return savedMerchant;
  }

  /**
   * Update merchant
   * @param merchantId Merchant ID
   * @param merchantData Updated merchant data
   * @param userId User updating the merchant
   * @param ipAddress IP address of the user
   */
  async update(merchantId: string, merchantData: Partial<Merchant>, userId: string, ipAddress?: string): Promise<Merchant> {
    // Get current data for audit logging
    const oldMerchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });
    if (!oldMerchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }

    // Update merchant
    await this.merchantRepository.update(merchantId, merchantData);

    // Get updated merchant data
    const updatedMerchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchants",
      merchantId,
      "UPDATE",
      userId,
      {
        old: oldMerchant,
        new: updatedMerchant,
      },
      ipAddress
    );

    // Check if entity information is complete and update onboarding status if needed
    if (updatedMerchant && this.isEntityInfoComplete(updatedMerchant)) {
      const onboardingStatus = await this.onboardingStatusService.findByMerchantId(merchantId);
      if (onboardingStatus && !onboardingStatus.entity_info_completed) {
        await this.onboardingStatusService.markSectionCompleted(onboardingStatus.status_id, "entity_info_completed");
      }
    }

    if (!updatedMerchant) {
      throw new Error("Failed to update merchant");
    }

    return updatedMerchant;
  }

  /**
   * Update merchant status
   * @param merchantId Merchant ID
   * @param status New status value
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async updateStatus(merchantId: string, status: number, userId: string, ipAddress?: string): Promise<void> {
    // Get current status for audit logging
    const oldMerchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });
    if (!oldMerchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }

    // Update status
    await this.merchantRepository.updateStatus(merchantId, status, userId);

    // Get updated merchant data
    const updatedMerchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });

    // Log the status update
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchants",
      merchantId,
      "UPDATE",
      userId,
      {
        old: { status: oldMerchant.status },
        new: {
          status: updatedMerchant?.status,
          approval_date: updatedMerchant?.approval_date,
          approved_by: updatedMerchant?.approved_by,
        },
      },
      ipAddress
    );
  }

  /**
   * Delete merchant (soft delete recommended in production)
   * @param merchantId Merchant ID
   * @param userId User deleting the merchant
   * @param ipAddress IP address of the user
   */
  async delete(merchantId: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const merchant = await this.merchantRepository.findOne({ where: { merchant_id: merchantId } });
    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }

    // Delete merchant
    await this.merchantRepository.delete(merchantId);

    // Log the deletion
    await this.auditLogService.createLogEntry(merchantId, "merchants", merchantId, "DELETE", userId, { old: merchant }, ipAddress);
  }

  /**
   * Count merchants by status
   * @param status Merchant status code
   */
  async countByStatus(status: number): Promise<number> {
    return this.merchantRepository.countByStatus(status);
  }

  /**
   * Validate required merchant data
   * @param merchantData Merchant data to validate
   */
  private validateMerchantData(merchantData: Partial<Merchant>): void {
    const requiredFields = [
      "entity_type",
      "legal_name",
      "address1",
      "city",
      "state",
      "zip",
      "country",
      "phone",
      "email",
      "tc_version",
      "currency",
      "mcc",
    ];

    const missingFields = requiredFields.filter((field) => !merchantData[field as keyof typeof merchantData]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required merchant fields: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Check if entity information is complete
   * @param merchant Merchant entity
   */
  private isEntityInfoComplete(merchant: Merchant): boolean {
    // Check if all required entity fields are populated
    const requiredFields = [
      "entity_type",
      "legal_name",
      "address1",
      "city",
      "state",
      "zip",
      "country",
      "phone",
      "email",
      "tc_version",
      "currency",
      "mcc",
    ];

    return requiredFields.every((field) => !!merchant[field as keyof typeof merchant]);
  }
}
