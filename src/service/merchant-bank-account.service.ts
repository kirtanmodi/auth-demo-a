// src/service/merchant-bank-account.service.ts
import { MerchantBankAccount } from "../entity/merchant-bank-account.entity.ts";
import { MerchantBankAccountRepository } from "../repository/merchant-bank-account.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { MerchantOnboardingStatusService } from "./merchant-onboarding-status.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantBankAccountService {
  private bankAccountRepository: MerchantBankAccountRepository;
  private auditLogService: MerchantAuditLogService;
  private onboardingStatusService: MerchantOnboardingStatusService;

  constructor() {
    this.bankAccountRepository = getCustomRepository(MerchantBankAccountRepository);
    this.auditLogService = new MerchantAuditLogService();
    this.onboardingStatusService = new MerchantOnboardingStatusService();
  }

  /**
   * Find bank account by ID
   * @param accountId Account ID
   */
  async findById(accountId: string): Promise<MerchantBankAccount | undefined> {
    const account = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });
    return account ?? undefined;
  }

  /**
   * Find primary bank account for a merchant
   * @param merchantId Merchant ID
   */
  async findPrimaryForMerchant(merchantId: string): Promise<MerchantBankAccount | undefined> {
    return this.bankAccountRepository.findPrimaryForMerchant(merchantId);
  }

  /**
   * Find all bank accounts for a merchant
   * @param merchantId Merchant ID
   */
  async findAllForMerchant(merchantId: string): Promise<MerchantBankAccount[]> {
    return this.bankAccountRepository.findAllForMerchant(merchantId);
  }

  /**
   * Create bank account
   * @param bankAccountData Bank account data
   * @param userId User creating the account
   * @param ipAddress IP address of the user
   */
  async create(bankAccountData: Partial<MerchantBankAccount>, userId: string, ipAddress?: string): Promise<MerchantBankAccount> {
    // Validate required fields
    this.validateBankAccountData(bankAccountData);

    // Create account
    const bankAccount = this.bankAccountRepository.create(bankAccountData);
    const savedBankAccount = await this.bankAccountRepository.save(bankAccount);

    // If this is the first account or marked as primary, ensure it's set as primary
    const existingAccounts = await this.bankAccountRepository.findAllForMerchant(savedBankAccount.merchant_id);
    if (existingAccounts.length === 1 || savedBankAccount.is_primary) {
      await this.bankAccountRepository.setAsPrimary(savedBankAccount.account_id, savedBankAccount.merchant_id);
    }

    // Log the creation
    await this.auditLogService.createLogEntry(
      savedBankAccount.merchant_id,
      "merchant_bank_accounts",
      savedBankAccount.account_id,
      "INSERT",
      userId,
      {
        new: {
          ...savedBankAccount,
          // Mask sensitive data for logs
          account_number: this.maskAccountNumber(savedBankAccount.account_number),
          routing_number: this.maskRoutingNumber(savedBankAccount.routing_number),
        },
      },
      ipAddress
    );

    // Check if bank information is complete and update onboarding status
    const merchantAccounts = await this.findAllForMerchant(savedBankAccount.merchant_id);
    if (merchantAccounts.length > 0) {
      const onboardingStatus = await this.onboardingStatusService.findByMerchantId(savedBankAccount.merchant_id);
      if (onboardingStatus && !onboardingStatus.bank_info_completed) {
        await this.onboardingStatusService.markSectionCompleted(onboardingStatus.status_id, "bank_info_completed");
      }
    }

    return savedBankAccount;
  }

  /**
   * Update bank account
   * @param accountId Account ID
   * @param bankAccountData Updated bank account data
   * @param userId User updating the account
   * @param ipAddress IP address of the user
   */
  async update(accountId: string, bankAccountData: Partial<MerchantBankAccount>, userId: string, ipAddress?: string): Promise<MerchantBankAccount> {
    // Get current data for audit logging
    const oldBankAccount = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });
    if (!oldBankAccount) {
      throw new Error(`Bank account not found: ${accountId}`);
    }

    // Handle primary flag specially
    if (bankAccountData.is_primary) {
      await this.bankAccountRepository.setAsPrimary(accountId, oldBankAccount.merchant_id);
      // Remove from data to prevent duplicate update
      delete bankAccountData.is_primary;
    }

    // Update account
    await this.bankAccountRepository.update(accountId, bankAccountData);

    // Get updated data
    const updatedBankAccount = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      oldBankAccount.merchant_id,
      "merchant_bank_accounts",
      accountId,
      "UPDATE",
      userId,
      {
        old: {
          ...oldBankAccount,
          account_number: this.maskAccountNumber(oldBankAccount.account_number),
          routing_number: this.maskRoutingNumber(oldBankAccount.routing_number),
        },
        new: {
          ...updatedBankAccount,
          account_number: updatedBankAccount ? this.maskAccountNumber(updatedBankAccount.account_number) : "",
          routing_number: updatedBankAccount ? this.maskRoutingNumber(updatedBankAccount.routing_number) : "",
        },
      },
      ipAddress
    );

    if (!updatedBankAccount) {
      throw new Error("Failed to update bank account");
    }

    return updatedBankAccount;
  }

  /**
   * Update account status
   * @param accountId Account ID
   * @param status New status value
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async updateStatus(accountId: string, status: number, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const oldBankAccount = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });
    if (!oldBankAccount) {
      throw new Error(`Bank account not found: ${accountId}`);
    }

    // Update status
    await this.bankAccountRepository.updateStatus(accountId, status);

    // Get updated data
    const updatedBankAccount = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });

    // Log the status update
    await this.auditLogService.createLogEntry(
      oldBankAccount.merchant_id,
      "merchant_bank_accounts",
      accountId,
      "UPDATE",
      userId,
      {
        old: {
          status: oldBankAccount.status,
          verification_date: oldBankAccount.verification_date,
        },
        new: {
          status: updatedBankAccount?.status,
          verification_date: updatedBankAccount?.verification_date,
        },
      },
      ipAddress
    );
  }

  /**
   * Delete bank account
   * @param accountId Account ID
   * @param userId User deleting the account
   * @param ipAddress IP address of the user
   */
  async delete(accountId: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const bankAccount = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });
    if (!bankAccount) {
      throw new Error(`Bank account not found: ${accountId}`);
    }

    const merchantId = bankAccount.merchant_id;

    // Delete account
    await this.bankAccountRepository.delete(accountId);

    // Log the deletion
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchant_bank_accounts",
      accountId,
      "DELETE",
      userId,
      {
        old: {
          ...bankAccount,
          account_number: this.maskAccountNumber(bankAccount.account_number),
          routing_number: this.maskRoutingNumber(bankAccount.routing_number),
        },
      },
      ipAddress
    );

    // Check if this was the primary account and update another if needed
    if (bankAccount.is_primary) {
      const remainingAccounts = await this.bankAccountRepository.findAllForMerchant(merchantId);
      if (remainingAccounts.length > 0) {
        await this.bankAccountRepository.setAsPrimary(remainingAccounts[0].account_id, merchantId);
      }
    }
  }

  /**
   * Set account as primary
   * @param accountId Account ID
   * @param merchantId Merchant ID
   * @param userId User setting the primary account
   * @param ipAddress IP address of the user
   */
  async setPrimary(accountId: string, merchantId: string, userId: string, ipAddress?: string): Promise<void> {
    // Check if account exists
    const account = await this.bankAccountRepository.findOne({ where: { account_id: accountId } });
    if (!account) {
      throw new Error(`Bank account not found: ${accountId}`);
    }

    // Get current primary for audit log
    const oldPrimary = await this.bankAccountRepository.findPrimaryForMerchant(merchantId);

    // Set as primary
    await this.bankAccountRepository.setAsPrimary(accountId, merchantId);

    // Log the change
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchant_bank_accounts",
      accountId,
      "UPDATE",
      userId,
      {
        change: `Primary account changed from ${oldPrimary?.account_id || "none"} to ${accountId}`,
      },
      ipAddress
    );
  }

  /**
   * Validate required bank account data
   * @param bankAccountData Bank account data to validate
   */
  private validateBankAccountData(bankAccountData: Partial<MerchantBankAccount>): void {
    const requiredFields = ["merchant_id", "account_method", "account_number", "routing_number", "currency"];

    const missingFields = requiredFields.filter((field) => !bankAccountData[field as keyof typeof bankAccountData]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required bank account fields: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Mask account number for security
   * @param accountNumber Full account number
   */
  private maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return "";
    const visibleDigits = 4;
    const masked = accountNumber.slice(-visibleDigits).padStart(accountNumber.length, "*");
    return masked;
  }

  /**
   * Mask routing number for security
   * @param routingNumber Full routing number
   */
  private maskRoutingNumber(routingNumber: string): string {
    if (!routingNumber) return "";
    const visibleDigits = 2;
    const masked = routingNumber.slice(-visibleDigits).padStart(routingNumber.length, "*");
    return masked;
  }
}
