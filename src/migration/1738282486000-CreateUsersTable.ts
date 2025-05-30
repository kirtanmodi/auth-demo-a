import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1738282486000 implements MigrationInterface {
  name = "CreateUsersTable1738282486000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM('admin', 'user', 'super_admin')`);

    // Create the users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "user_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "status" smallint NOT NULL DEFAULT 1,
        "api_token" varchar(255) UNIQUE,
        "api_token_expires_at" TIMESTAMP WITH TIME ZONE,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "last_login_ip" inet,
        "failed_login_attempts" smallint NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verification_token" varchar(255),
        "email_verified_at" TIMESTAMP WITH TIME ZONE,
        "password_reset_token" varchar(255),
        "password_reset_expires_at" TIMESTAMP WITH TIME ZONE,
        "created_by" varchar(50),
        "updated_by" varchar(50)
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_api_token" ON "users" ("api_token") WHERE "api_token" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_users_status"`);
    await queryRunner.query(`DROP INDEX "IDX_users_role"`);
    await queryRunner.query(`DROP INDEX "IDX_users_api_token"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
