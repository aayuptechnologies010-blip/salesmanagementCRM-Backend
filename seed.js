require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Lead = require('./src/models/Lead');
const FollowUp = require('./src/models/FollowUp');
const Activity = require('./src/models/Activity');
const Invoice = require('./src/models/Invoice');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    FollowUp.deleteMany({}),
    Activity.deleteMany({}),
    Invoice.deleteMany({}),
  ]);
  console.log('🗑️  Cleared all data');

  // Create only Super Admin
  await User.create({
    name: 'Super Admin',
    email: 'aayup@gmail.com',
    password: await bcrypt.hash('aayup2025', 10),
    role: 'Super Admin',
    team: '-',
    avatar: 'SA',
    status: 'Active',
    leads: 0,
    converted: 0,
  });

  console.log('👤 Super Admin created');
  console.log('\n✅ Setup complete!');
  console.log('📧 Login: aayup@gmail.com');
  console.log('🔒 Password: aayup2025');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
