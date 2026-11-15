/**
 * Seed Script: Create Super Admin User
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/seed-admin.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../src/models/user.model.js';

const ADMIN_PHONE = '+8801761704382';
const ADMIN_DISPLAY_NAME = 'Becha-Kena Admin';

async function seedAdmin(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  // Check if admin already exists
  const existing = await User.findOne({ phone: ADMIN_PHONE });
  if (existing) {
    console.log('\n📌 User with this phone already exists:');
    console.log(`   Phone:   ${existing.phone}`);
    console.log(`   Name:    ${existing.displayName}`);
    console.log(`   Role:    ${existing.role}`);
    console.log(`   KYC:     ${existing.kycStatus}`);
    console.log(`   ID:      ${existing._id}`);

    if (existing.role === 'super_admin') {
      console.log('\n✅ This user is already a super_admin. No changes needed.');
    } else {
      // Promote to super_admin
      existing.role = 'super_admin' as any;
      existing.isNidVerified = true;
      existing.kycStatus = 'verified' as any;
      await existing.save();
      console.log(`\n🚀 Promoted "${existing.displayName}" to super_admin role!`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.\n');
    return;
  }

  // Create new admin user
  const admin = await User.create({
    phone: ADMIN_PHONE,
    displayName: ADMIN_DISPLAY_NAME,
    role: 'super_admin',
    isNidVerified: true,
    kycStatus: 'verified',
    kycAttempts: 0,
    deviceUUIDs: [],
    activeDeviceCount: 0,
    isBanned: false,
    isFrozen: false,
    notificationPreferences: {
      pushEnabled: true,
      smsEnabled: true,
      priceDropAlerts: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
    },
    averageRating: 0,
    totalDealsCompleted: 0,
  });

  console.log('\n======================================================');
  console.log('  🎉 SUPER ADMIN USER CREATED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`  📱 Phone:        ${admin.phone}`);
  console.log(`  👤 Display Name: ${admin.displayName}`);
  console.log(`  🛡️  Role:         ${admin.role}`);
  console.log(`  ✅ NID Verified: ${admin.isNidVerified}`);
  console.log(`  📋 KYC Status:   ${admin.kycStatus}`);
  console.log(`  🔑 User ID:      ${admin._id}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.\n');
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});

