require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Update all documents where phone field is missing/undefined — set it to empty string
  const result = await Lead.updateMany(
    { phone: { $exists: false } },
    { $set: { phone: '' } }
  );
  console.log(`✅ Fixed ${result.modifiedCount} leads with missing phone field`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
