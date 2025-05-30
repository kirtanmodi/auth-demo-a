#!/usr/bin/env tsx

import "reflect-metadata";
import { AppDataSource } from "../src/data-source/index.ts";
import { UserService } from "../src/service/user.service.ts";
import { UserRole } from "../src/entity/user.entity.ts";
import { randomBytes } from "crypto";

async function createAdminUser() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("✅ Database connection established");

    const userService = new UserService();

    // Check if admin user already exists
    const existingUser = await userService.findByEmail("modikirtan19@gmail.com");
    if (existingUser) {
      console.log("⚠️  Admin user already exists with email: modikirtan19@gmail.com");
      console.log(`   User ID: ${existingUser.user_id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   API Token: ${existingUser.api_token}`);

      // Generate new token if needed
      if (!existingUser.api_token || !existingUser.is_api_token_valid) {
        console.log("🔄 Generating new API token...");
        const newToken = await userService.rotateApiToken(existingUser.user_id);
        console.log(`   New API Token: ${newToken}`);
      }

      return;
    }

    // Generate a secure random password
    const password = randomBytes(16).toString("hex");

    // Create admin user
    const adminUser = await userService.createUser({
      email: "modikirtan19@gmail.com",
      password: password,
      firstName: "Kirtan",
      lastName: "Modi",
      role: UserRole.ADMIN,
      createdBy: "system-setup",
    });

    console.log("🎉 Admin user created successfully!");
    console.log("📧 Email:", adminUser.email);
    console.log("👤 Name:", adminUser.full_name);
    console.log("🔑 Role:", adminUser.role);
    console.log("🆔 User ID:", adminUser.user_id);
    console.log("🔐 Password:", password);
    console.log("🎫 API Token:", adminUser.api_token);
    console.log("⏰ Token Expires:", adminUser.api_token_expires_at);

    console.log("\n📝 IMPORTANT: Save this information securely!");
    console.log("   - Use the API token for Bearer authentication");
    console.log("   - Store the password securely - it cannot be retrieved again");
    console.log("   - The API token is valid for 1 year");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the script
createAdminUser();
