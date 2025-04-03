// src/service/merchant-member.service.ts
import { MerchantMember } from "../entity/merchant-member.entity.ts";
import { MerchantMemberRepository } from "../repository/merchant-member.repository.ts";
import { MerchantAuditLogService } from "./merchant-audit-log.service.ts";
import { MerchantOnboardingStatusService } from "./merchant-onboarding-status.service.ts";
import { getCustomRepository } from "typeorm";

export class MerchantMemberService {
  private memberRepository: MerchantMemberRepository;
  private auditLogService: MerchantAuditLogService;
  private onboardingStatusService: MerchantOnboardingStatusService;

  constructor() {
    this.memberRepository = getCustomRepository(MerchantMemberRepository);
    this.auditLogService = new MerchantAuditLogService();
    this.onboardingStatusService = new MerchantOnboardingStatusService();
  }

  /**
   * Find member by ID
   * @param memberId Member ID
   */
  async findById(memberId: string): Promise<MerchantMember | undefined> {
    const member = await this.memberRepository.findOne({ where: { member_id: memberId } });
    return member ?? undefined;
  }

  /**
   * Find primary member for a merchant
   * @param merchantId Merchant ID
   */
  async findPrimaryForMerchant(merchantId: string): Promise<MerchantMember | undefined> {
    return this.memberRepository.findPrimaryForMerchant(merchantId);
  }

  /**
   * Find all members for a merchant
   * @param merchantId Merchant ID
   */
  async findAllForMerchant(merchantId: string): Promise<MerchantMember[]> {
    return this.memberRepository.findAllForMerchant(merchantId);
  }

  /**
   * Find member by email
   * @param merchantId Merchant ID
   * @param email Member email
   */
  async findByEmail(merchantId: string, email: string): Promise<MerchantMember | undefined> {
    return this.memberRepository.findByEmail(merchantId, email);
  }

  /**
   * Find owners with significant ownership
   * @param merchantId Merchant ID
   * @param minPercentage Minimum ownership percentage (default 25%)
   */
  async findSignificantOwners(merchantId: string, minPercentage: number = 2500): Promise<MerchantMember[]> {
    return this.memberRepository.findByOwnershipThreshold(merchantId, minPercentage);
  }

  /**
   * Create member
   * @param memberData Member data
   * @param userId User creating the member
   * @param ipAddress IP address of the user
   */
  async create(memberData: Partial<MerchantMember>, userId: string, ipAddress?: string): Promise<MerchantMember> {
    // Validate required fields
    this.validateMemberData(memberData);

    // Create member
    const member = this.memberRepository.create(memberData);
    const savedMember = await this.memberRepository.save(member);

    // If this is the first member or marked as primary, ensure it's set as primary
    const existingMembers = await this.memberRepository.findAllForMerchant(savedMember.merchant_id);
    if (existingMembers.length === 1 || savedMember.is_primary) {
      await this.memberRepository.setAsPrimary(savedMember.member_id, savedMember.merchant_id);
    }

    // Log the creation
    await this.auditLogService.createLogEntry(
      savedMember.merchant_id,
      "merchant_members",
      savedMember.member_id,
      "INSERT",
      userId,
      {
        new: {
          ...savedMember,
          // Mask sensitive data for logs
          ssn: this.maskSsn(savedMember.ssn),
        },
      },
      ipAddress
    );

    // Check if owner information is complete and update onboarding status
    const merchantMembers = await this.findAllForMerchant(savedMember.merchant_id);
    if (merchantMembers.length > 0) {
      const onboardingStatus = await this.onboardingStatusService.findByMerchantId(savedMember.merchant_id);
      if (onboardingStatus && !onboardingStatus.owner_info_completed) {
        await this.onboardingStatusService.markSectionCompleted(onboardingStatus.status_id, "owner_info_completed");
      }
    }

    return savedMember;
  }

  /**
   * Update member
   * @param memberId Member ID
   * @param memberData Updated member data
   * @param userId User updating the member
   * @param ipAddress IP address of the user
   */
  async update(memberId: string, memberData: Partial<MerchantMember>, userId: string, ipAddress?: string): Promise<MerchantMember> {
    // Get current data for audit logging
    const oldMember = await this.memberRepository.findOne({ where: { member_id: memberId } });
    if (!oldMember) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Handle primary flag specially
    if (memberData.is_primary) {
      await this.memberRepository.setAsPrimary(memberId, oldMember.merchant_id);
      // Remove from data to prevent duplicate update
      delete memberData.is_primary;
    }

    // Update member
    await this.memberRepository.update(memberId, memberData);

    // Get updated data
    const updatedMember = await this.memberRepository.findOne({ where: { member_id: memberId } });

    // Log the update
    await this.auditLogService.createLogEntry(
      oldMember.merchant_id,
      "merchant_members",
      memberId,
      "UPDATE",
      userId,
      {
        old: {
          ...oldMember,
          ssn: this.maskSsn(oldMember.ssn),
        },
        new: {
          ...updatedMember,
          ssn: this.maskSsn(updatedMember?.ssn ?? ""),
        },
      },
      ipAddress
    );

    if (!updatedMember) {
      throw new Error("Failed to update member");
    }

    return updatedMember;
  }

  /**
   * Update verification status
   * @param memberId Member ID
   * @param idVerificationStatus ID verification status
   * @param backgroundCheckStatus Background check status
   * @param userId User updating the status
   * @param ipAddress IP address of the user
   */
  async updateVerificationStatus(
    memberId: string,
    idVerificationStatus: number | undefined,
    backgroundCheckStatus: number | undefined,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Get current data for audit logging
    const oldMember = await this.memberRepository.findOne({ where: { member_id: memberId } });
    if (!oldMember) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Update status
    await this.memberRepository.updateVerificationStatus(memberId, idVerificationStatus, backgroundCheckStatus);

    // Get updated data
    const updatedMember = await this.memberRepository.findOne({ where: { member_id: memberId } });

    // Log the status update
    await this.auditLogService.createLogEntry(
      oldMember.merchant_id,
      "merchant_members",
      memberId,
      "UPDATE",
      userId,
      {
        old: {
          id_verification_status: oldMember.id_verification_status,
          background_check_status: oldMember.background_check_status,
        },
        new: {
          id_verification_status: updatedMember?.id_verification_status ?? 0,
          background_check_status: updatedMember?.background_check_status ?? 0,
        },
      },
      ipAddress
    );
  }

  /**
   * Delete member
   * @param memberId Member ID
   * @param userId User deleting the member
   * @param ipAddress IP address of the user
   */
  async delete(memberId: string, userId: string, ipAddress?: string): Promise<void> {
    // Get current data for audit logging
    const member = await this.memberRepository.findOne({ where: { member_id: memberId } });
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    const merchantId = member.merchant_id;

    // Delete member
    await this.memberRepository.delete(memberId);

    // Log the deletion
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchant_members",
      memberId,
      "DELETE",
      userId,
      {
        old: {
          ...member,
          ssn: this.maskSsn(member.ssn),
        },
      },
      ipAddress
    );

    // Check if this was the primary member and update another if needed
    if (member.is_primary) {
      const remainingMembers = await this.memberRepository.findAllForMerchant(merchantId);
      if (remainingMembers.length > 0) {
        await this.memberRepository.setAsPrimary(remainingMembers[0].member_id, merchantId);
      }
    }
  }

  /**
   * Set member as primary
   * @param memberId Member ID
   * @param merchantId Merchant ID
   * @param userId User setting the primary member
   * @param ipAddress IP address of the user
   */
  async setPrimary(memberId: string, merchantId: string, userId: string, ipAddress?: string): Promise<void> {
    // Check if member exists
    const member = await this.memberRepository.findOne({ where: { member_id: memberId } });
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Get current primary for audit log
    const oldPrimary = await this.memberRepository.findPrimaryForMerchant(merchantId);

    // Set as primary
    await this.memberRepository.setAsPrimary(memberId, merchantId);

    // Log the change
    await this.auditLogService.createLogEntry(
      merchantId,
      "merchant_members",
      memberId,
      "UPDATE",
      userId,
      {
        change: `Primary member changed from ${oldPrimary?.member_id || "none"} to ${memberId}`,
      },
      ipAddress
    );
  }

  /**
   * Validate required member data
   * @param memberData Member data to validate
   */
  private validateMemberData(memberData: Partial<MerchantMember>): void {
    const requiredFields = [
      "merchant_id",
      "first_name",
      "last_name",
      "ssn",
      "date_of_birth",
      "ownership_percentage",
      "email",
      "phone",
      "address1",
      "city",
      "state",
      "zip",
      "country",
    ];

    const missingFields = requiredFields.filter((field) => !(field in memberData));

    if (missingFields.length > 0) {
      throw new Error(`Missing required member fields: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Mask SSN for security
   * @param ssn Full SSN
   */
  private maskSsn(ssn: string): string {
    if (!ssn) return "";
    const visibleDigits = 4;
    const masked = ssn.slice(-visibleDigits).padStart(ssn.length, "*");
    return masked;
  }
}
