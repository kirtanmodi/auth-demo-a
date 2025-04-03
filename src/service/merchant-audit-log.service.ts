// src/service/merchant-audit-log.service.ts
import { MerchantAuditLog } from "../entity/merchant-audit-log.entity.ts";
import { MerchantAuditLogRepository } from "../repository/merchant-audit-log.repository.ts";
import { getCustomRepository } from "typeorm";

export class MerchantAuditLogService {
  private auditLogRepository: MerchantAuditLogRepository;

  constructor() {
    this.auditLogRepository = getCustomRepository(MerchantAuditLogRepository);
  }

  /**
   * Find audit log by ID
   * @param logId Log ID
   */
  async findById(logId: string): Promise<MerchantAuditLog | undefined> {
    const log = await this.auditLogRepository.findOne({ where: { log_id: logId } });
    return log ?? undefined;
  }

  /**
   * Find audit logs by merchant
   * @param merchantId Merchant ID
   * @param limit Maximum number of records to return
   */
  async findByMerchant(merchantId: string, limit: number = 50): Promise<MerchantAuditLog[]> {
    return this.auditLogRepository.findByMerchant(merchantId, limit);
  }

  /**
   * Find audit logs by table
   * @param merchantId Merchant ID
   * @param tableName Table name
   */
  async findByTable(merchantId: string, tableName: string): Promise<MerchantAuditLog[]> {
    return this.auditLogRepository.findByTable(merchantId, tableName);
  }

  /**
   * Find audit logs by record
   * @param recordId Record ID
   */
  async findByRecordId(recordId: string): Promise<MerchantAuditLog[]> {
    return this.auditLogRepository.findByRecordId(recordId);
  }

  /**
   * Find audit logs by date range
   * @param merchantId Merchant ID
   * @param startDate Start date
   * @param endDate End date
   */
  async findByDateRange(merchantId: string, startDate: Date, endDate: Date): Promise<MerchantAuditLog[]> {
    return this.auditLogRepository.findByDateRange(merchantId, startDate, endDate);
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
  ): Promise<MerchantAuditLog> {
    // Create the log entry
    const logEntry = await this.auditLogRepository.createLogEntry(merchantId, tableName, recordId, action, changedBy, changes, ipAddress);

    if (!logEntry) {
      throw new Error("Failed to create audit log entry");
    }

    return logEntry;
  }

  /**
   * Get user activity summary
   * @param userId User ID
   * @param startDate Start date
   * @param endDate End date
   */
  async getUserActivitySummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
    // Query for all user activity
    const logs = await this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.changed_by = :userId", { userId })
      .andWhere("log.created_at >= :startDate", { startDate })
      .andWhere("log.created_at <= :endDate", { endDate })
      .orderBy("log.created_at", "DESC")
      .getMany();

    // Group and summarize by action and table
    const summary = {
      totalActions: logs.length,
      actionsByTable: this.groupByTableAndAction(logs),
      merchantsModified: new Set(logs.map((log) => log.merchant_id)).size,
      timeline: this.groupByDay(logs),
    };

    return summary;
  }

  /**
   * Group logs by table and action
   * @param logs Array of audit logs
   */
  private groupByTableAndAction(logs: MerchantAuditLog[]): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    logs.forEach((log) => {
      if (!result[log.table_name]) {
        result[log.table_name] = {};
      }

      if (!result[log.table_name][log.action]) {
        result[log.table_name][log.action] = 0;
      }

      result[log.table_name][log.action]++;
    });

    return result;
  }

  /**
   * Group logs by day
   * @param logs Array of audit logs
   */
  private groupByDay(logs: MerchantAuditLog[]): Record<string, number> {
    const result: Record<string, number> = {};

    logs.forEach((log) => {
      const day = log.created_at.toISOString().split("T")[0];

      if (!result[day]) {
        result[day] = 0;
      }

      result[day]++;
    });

    return result;
  }
}
