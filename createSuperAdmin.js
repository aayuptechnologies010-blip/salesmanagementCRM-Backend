require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const email = 'admin@aayup.com';
const password = 'aayup205';

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in the backend .env file');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully!');

    // Check if the user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log(`👤 User with email "${email}" already exists. Updating password and role to Super Admin...`);
      user.password = password; // Trigger mongoose pre-save hash hook
      user.role = 'Super Admin';
      user.status = 'Active';
      user.name = 'Super Admin';
      await user.save();
      console.log('✨ Super Admin password and role updated successfully!');
    } else {
      console.log(`👤 Creating a new Super Admin user with email "${email}"...`);
      user = await User.create({
        name: 'Super Admin',
        email: email,
        password: password, // Trigger mongoose pre-save hash hook
        role: 'Super Admin',
        team: '-',
        avatar: 'SA',
        status: 'Active'
      });
      console.log('✨ Super Admin user created successfully!');
    }

    console.log('----------------------------------------------------');
    console.log('📊 Login Details:');
    console.log(`   └─ Name: ${user.name}`);
    console.log(`   └─ Email: ${email}`);
    console.log(`   └─ Password: ${password}`);
    console.log(`   └─ Role: ${user.role}`);
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Error creating Super Admin:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
}

run();
