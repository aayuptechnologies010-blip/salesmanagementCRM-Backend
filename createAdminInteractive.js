const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('./src/models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
};

async function main() {
  console.log('\n======================================');
  console.log('   🚀 CREATE / UPDATE ADMIN USER');
  console.log('======================================\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI is missing in .env file.');
    process.exit(1);
  }

  try {
    const name = await askQuestion('👤 Enter Full Name: ');
    if (!name) {
      console.log('❌ Name cannot be empty!');
      rl.close();
      return;
    }

    const email = await askQuestion('📧 Enter Email: ');
    if (!email) {
      console.log('❌ Email cannot be empty!');
      rl.close();
      return;
    }

    const password = await askQuestion('🔑 Enter Password (min 4 characters): ');
    if (!password || password.length < 4) {
      console.log('❌ Password must be at least 4 characters long!');
      rl.close();
      return;
    }

    console.log('\nSelect Role:');
    console.log('1. Super Admin (Default)');
    console.log('2. Admin');
    console.log('3. Sales Executive');
    const roleChoice = await askQuestion('Choose Role (1/2/3) [Default 1]: ');

    let role = 'Super Admin';
    if (roleChoice === '2') role = 'Admin';
    if (roleChoice === '3') role = 'Sales Executive';

    rl.close();

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to Database!');

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      console.log(`\n⚠️  User with email "${email}" already exists. Updating existing user...`);
      user.name = name;
      user.password = password; // Trigger mongoose pre-save hash hook
      user.role = role;
      user.status = 'Active';
      await user.save();
      console.log('✨ User credentials & role updated successfully!');
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role,
        status: 'Active'
      });
      console.log('✨ New Admin User created successfully!');
    }

    console.log('\n======================================');
    console.log('📋 CREATED ADMIN DETAILS:');
    console.log(`   └─ Name:     ${user.name}`);
    console.log(`   └─ Email:    ${user.email}`);
    console.log(`   └─ Password: ${password}`);
    console.log(`   └─ Role:     ${user.role}`);
    console.log(`   └─ Status:   ${user.status}`);
    console.log('======================================\n');

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.\n');
    process.exit(0);
  }
}

main();
