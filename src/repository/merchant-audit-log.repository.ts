import { EntityRepository, Repository } from "typeorm";
import { MerchantAuditLog } from "../entity/merchant-audit-log.entity.ts";

@EntityRepository(MerchantAuditLog)
export class MerchantAuditLogRepository extends Repository<MerchantAuditLog> {
  /**
   * Find audit logs by merchant
   * @param merchantId Merchant ID
   * @param limit Maximum number of records to return
   */
  async findByMerchant(merchantId: string, limit: number = 50): Promise<MerchantAuditLog[]> {
    return this.find({
      where: { merchant_id: merchantId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  /**
   * Find audit logs by table
   * @param merchantId Merchant ID
   * @param tableName Table name
   */
  async findByTable(merchantId: string, tableName: string): Promise<MerchantAuditLog[]> {
    return this.find({
      where: {
        merchant_id: merchantId,
        table_name: tableName,
      },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Find audit logs by record
   * @param recordId Record ID
   */
  async findByRecordId(recordId: string): Promise<MerchantAuditLog[]> {
    return this.find({
      where: { record_id: recordId },
      order: { created_at: "DESC" },
    });
  }

  /**
   * Find audit logs by date range
   * @param merchantId Merchant ID
   * @param startDate Start date
   * @param endDate End date
   */
  async findByDateRange(merchantId: string, startDate: Date, endDate: Date): Promise<MerchantAuditLog[]> {
    return this.createQueryBuilder("audit")
      .where("audit.merchant_id = :merchantId", { merchantId })
      .andWhere("audit.created_at >= :startDate", { startDate })
      .andWhere("audit.created_at <= :endDate", { endDate })
      .orderBy("audit.created_at", "DESC")
      .getMany();
  }

  /**
   * Create audit log entry
   * @param merchantId Merchant ID
   * @param tableName Table name
   * @param recordId Record ID
   * @param action Action performed
   * @param changedBy User who made the change
   * @param changes Changes made (old/new values)
   * @param ipAddress IP address of user (optional)
   */
  async createLogEntry(
    merchantId: string,
    tableName: string,
    recordId: string,
    action: string,
    changedBy: string,
    changes: any,
    ipAddress?: string
  ): Promise<MerchantAuditLog | undefined> {
    const log = new MerchantAuditLog();
    log.merchant_id = merchantId;
    log.table_name = tableName;
    log.record_id = recordId;
    log.action = action;
    log.changed_by = changedBy;
    log.changes = changes;
    log.ip_address = ipAddress ?? "";

    const savedLog = await this.save(log);
    return savedLog ?? undefined;
  }
}
