import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  SUPER_ADMIN = "super_admin",
}

export enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 0,
  SUSPENDED = 2,
  PENDING_VERIFICATION = 3,
}

@Entity("users")
@Index(["email"], { unique: true })
@Index(["api_token"], { unique: true, where: "api_token IS NOT NULL" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  user_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;

  // Basic User Information
  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password_hash: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  first_name: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  last_name: string | null;

  // Authentication & Authorization
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: "smallint",
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  // API Token for Bearer authentication
  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  api_token: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  api_token_expires_at: Date | null;

  // Security Fields
  @Column({ type: "timestamp with time zone", nullable: true })
  last_login_at: Date | null;

  @Column({ type: "inet", nullable: true })
  last_login_ip: string | null;

  @Column({ type: "smallint", default: 0 })
  failed_login_attempts: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  locked_until: Date | null;

  // Email Verification
  @Column({ type: "boolean", default: false })
  email_verified: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  email_verification_token: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  email_verified_at: Date | null;

  // Password Reset
  @Column({ type: "varchar", length: 255, nullable: true })
  password_reset_token: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  password_reset_expires_at: Date | null;

  // Audit Fields
  @Column({ type: "varchar", length: 50, nullable: true })
  created_by: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  updated_by: string | null;

  // Helper methods (getters)
  get full_name(): string {
    return `${this.first_name || ""} ${this.last_name || ""}`.trim();
  }

  get is_active(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get is_admin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.SUPER_ADMIN;
  }

  get is_api_token_valid(): boolean {
    return !!(this.api_token && (!this.api_token_expires_at || this.api_token_expires_at > new Date()));
  }

  get is_locked(): boolean {
    return !!(this.locked_until && this.locked_until > new Date());
  }
}
