import mongoose from 'mongoose';
import LeadCommission from '../models/leadCommission.js';
import Vendor from '../models/vendor.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mesquiteretreat');

async function createSampleCommission() {
  try {
    // Find the first vendor
    const vendor = await Vendor.findOne({ status: 'active' });
    if (!vendor) {
      console.log('No active vendors found. Please create a vendor first.');
      return;
    }

    console.log(`Creating sample commission request for vendor: ${vendor.email} (${vendor.vendor_code})`);

    // Create a sample commission request
    const commission = await LeadCommission.create({
      vendor_id: String(vendor._id),
      vendor_code: vendor.vendor_code,
      vendor_email: vendor.email,
      vendor_name: vendor.name || vendor.company || vendor.email,
      lead_type: 'click',
      commission_type: 'lead',
      commission_amount: 25.00,
      admin_notes: 'Sample commission request for testing the approval flow',
      status: 'pending',
      vendor_response: 'pending'
    });

    console.log('✅ Sample commission request created successfully!');
    console.log(`Commission ID: ${commission._id}`);
    console.log(`Amount: $${commission.commission_amount}`);
    console.log(`Status: ${commission.status}`);
    console.log('');
    console.log('To test the flow:');
    console.log('1. Go to http://localhost:3000/vendor-login.html');
    console.log(`2. Login with vendor email: ${vendor.email}`);
    console.log('3. Navigate to the "Lead Commission Requests" section');
    console.log('4. You should see the pending commission request');
    console.log('5. Click "Approve" or "Reject" to test the approval flow');

  } catch (error) {
    console.error('❌ Error creating sample commission:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleCommission(); 