const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/sales_crm';
const email = 'admin@aayup.com';
const password = 'aayup205';

async function run() {
  try {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find the user first
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found. Creating a new one directly...');
      const hash = bcrypt.hashSync(password, 10);
      const newUser = {
        name: 'Super Admin',
        email: email.toLowerCase(),
        password: hash,
        role: 'Super Admin',
        team: '-',
        avatar: 'SA',
        phone: '',
        status: 'Active',
        leads: 0,
        converted: 0,
        notifications: {
          newLead: true,
          assignment: true,
          followup: true,
          conversion: false,
          weeklyReport: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await usersCollection.insertOne(newUser);
      console.log('Created user successfully with direct insert!');
    } else {
      console.log('User found. Hashing password and updating directly...');
      const hash = bcrypt.hashSync(password, 10);
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            password: hash,
            role: 'Super Admin',
            status: 'Active',
            name: 'Super Admin',
            updatedAt: new Date()
          } 
        }
      );
      console.log('Updated user successfully with direct update!');
    }

    // Verify
    const updatedUser = await usersCollection.findOne({ email: email.toLowerCase() });
    console.log('Updated user in DB:', updatedUser);
    const match = bcrypt.compareSync(password, updatedUser.password);
    console.log('Verification match check:', match);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
