import { EntityRepository, Repository } from "typeorm";
import { MerchantBankAccount } from "../entity/merchant-bank-account.entity.ts";

@EntityRepository(MerchantBankAccount)
export class MerchantBankAccountRepository extends Repository<MerchantBankAccount> {
  /**
   * Find primary bank account for a merchant
   * @param merchantId Merchant ID
   */
  async findPrimaryForMerchant(merchantId: string): Promise<MerchantBankAccount | undefined> {
    const account = await this.findOne({
      where: {
        merchant_id: merchantId,
        is_primary: true,
      },
    });
    return account ?? undefined;
  }

  /**
   * Find all bank accounts for a merchant
   * @param merchantId Merchant ID
   */
  async findAllForMerchant(merchantId: string): Promise<MerchantBankAccount[]> {
    return this.find({
      where: { merchant_id: merchantId },
      order: { is_primary: "DESC" },
    });
  }

  /**
   * Update account status
   * @param accountId Account ID
   * @param status New status value
   */
  async updateStatus(accountId: string, status: number): Promise<void> {
    const updateData: any = {
      status,
      verification_date: status === 1 ? new Date() : undefined, // Set verification date if verified
    };

    await this.update(accountId, updateData);
  }

  /**
   * Set account as primary and ensure other accounts for merchant are not primary
   * @param accountId Account ID to set as primary
   * @param merchantId Merchant ID
   */
  async setAsPrimary(accountId: string, merchantId: string): Promise<void> {
    await this.manager.transaction(async (transactionalEntityManager) => {
      // First set all merchant accounts to non-primary
      await transactionalEntityManager.update(MerchantBankAccount, { merchant_id: merchantId }, { is_primary: false });

      // Then set the specific account as primary
      await transactionalEntityManager.update(MerchantBankAccount, { account_id: accountId }, { is_primary: true });
    });
  }
}
