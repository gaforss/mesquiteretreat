import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Vendor from '../models/vendor.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mesquiteretreat');

async function createSampleVendor() {
  try {
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email: 'test@example.com' });
    if (existingVendor) {
      console.log('Test vendor already exists:', existingVendor.email);
      return existingVendor;
    }

    // Create a test vendor
    const passwordHash = await bcrypt.hash('test123', 10);
    const vendor = await Vendor.create({
      email: 'test@example.com',
      password_hash: passwordHash,
      name: 'Test Vendor',
      company: 'Test Company',
      vendor_code: 'TEST123',
      status: 'active',
      must_change_password: false
    });

    console.log('✅ Test vendor created successfully!');
    console.log(`Email: ${vendor.email}`);
    console.log(`Password: test123`);
    console.log(`Vendor Code: ${vendor.vendor_code}`);
    console.log('');
    console.log('You can now:');
    console.log('1. Login at http://localhost:3000/vendor-login.html');
    console.log('2. Use email: test@example.com and password: test123');
    console.log('3. Run the createSampleCommission.js script to create a test commission request');

    return vendor;

  } catch (error) {
    console.error('❌ Error creating test vendor:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleVendor(); 