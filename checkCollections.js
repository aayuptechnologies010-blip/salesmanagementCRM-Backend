const dns = require('dns');
dns.setServers(['8.8.8.8']);
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aayuptechnologies_db_user:t9a4mbgdpwlGUIzP@cluster0.xkwgx1b.mongodb.net/SalesManagementCRM?appName=Cluster0';

async function run() {
  try {
    console.log('Connecting to Atlas MongoDB...');
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    console.log('Fetching collections list...');
    const collections = await db.listCollections().toArray();
    
    console.log('----------------------------------------------------');
    console.log('Existing Collections in Database:');
    if (collections.length === 0) {
      console.log('(No collections found in this database)');
    } else {
      collections.forEach((col, i) => {
        console.log(`[${i + 1}] Name: "${col.name}" (Type: ${col.type})`);
      });
    }
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('Error during execution:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
