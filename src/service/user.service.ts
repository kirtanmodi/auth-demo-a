import { Repository } from "typeorm";
import { User, UserRole, UserStatus } from "../entity/user.entity.ts";
import { AppDataSource } from "../data-source/index.ts";
import { createHash, randomBytes, pbkdf2Sync } from "crypto";

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Hash a password using PBKDF2
   */
  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, "hex") : randomBytes(32);
    const hash = pbkdf2Sync(password, saltBuffer, 10000, 64, "sha512");

    return {
      hash: `${saltBuffer.toString("hex")}:${hash.toString("hex")}`,
      salt: saltBuffer.toString("hex"),
    };
  }

  /**
   * Verify a password against a hash
   */
  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    const { hash: newHash } = this.hashPassword(password, salt);
    return newHash === storedHash;
  }

  /**
   * Generate a secure API token
   */
  private generateApiToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    createdBy?: string;
  }): Promise<User> {
    const { hash } = this.hashPassword(userData.password);

    const user = new User();
    user.email = userData.email.toLowerCase().trim();
    user.password_hash = hash;
    user.first_name = userData.firstName || null;
    user.last_name = userData.lastName || null;
    user.role = userData.role || UserRole.USER;
    user.status = UserStatus.ACTIVE;
    user.email_verified = true; // Auto-verify for admin creation
    user.email_verified_at = new Date();
    user.created_by = userData.createdBy || "system";

    // Generate API token
    user.api_token = this.generateApiToken();
    user.api_token_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    return await this.userRepository.save(user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Find user by API token
   */
  async findByApiToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: {
        api_token: token,
        status: UserStatus.ACTIVE,
      },
    });
  }

  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string, ip?: string): Promise<{ user: User; token: string } | null> {
    const user = await this.findByEmail(email);

    if (!user || !user.is_active || user.is_locked) {
      // Increment failed attempts even for non-existent users to prevent enumeration
      if (user) {
        await this.incrementFailedAttempts(user);
      }
      return null;
    }

    if (!this.verifyPassword(password, user.password_hash)) {
      await this.incrementFailedAttempts(user);
      return null;
    }

    // Reset failed attempts on successful login
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date();
    user.last_login_ip = ip || null;

    // Generate new API token on login
    user.api_token = this.generateApiToken();
    user.api_token_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await this.userRepository.save(user);

    return { user, token: user.api_token };
  }

  /**
   * Validate API token and return user
   */
  async validateToken(token: string): Promise<User | null> {
    const user = await this.findByApiToken(token);

    if (!user || !user.is_api_token_valid || !user.is_active || user.is_locked) {
      return null;
    }

    return user;
  }

  /**
   * Increment failed login attempts and lock if necessary
   */
  private async incrementFailedAttempts(user: User): Promise<void> {
    user.failed_login_attempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (user.failed_login_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.userRepository.save(user);
  }

  /**
   * Rotate API token
   */
  async rotateApiToken(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    user.api_token = this.generateApiToken();
    user.api_token_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);
    return user.api_token;
  }

  /**
   * Revoke API token
   */
  async revokeApiToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    user.api_token = null;
    user.api_token_expires_at = null;

    await this.userRepository.save(user);
  }
}
