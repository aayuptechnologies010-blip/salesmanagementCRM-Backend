const dns = require('dns');
dns.setServers(['8.8.8.8']);
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://aayuptechnologies_db_user:t9a4mbgdpwlGUIzP@cluster0.xkwgx1b.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    console.log('Connecting to Atlas Cluster...');
    await mongoose.connect(MONGO_URI);
    const adminDb = mongoose.connection.client.db().admin();
    const dbs = (await adminDb.listDatabases()).databases.map(d => d.name);
    
    console.log('Databases on Cluster:', dbs);
    
    for (const dbName of dbs) {
      if (dbName === 'admin' || dbName === 'local') continue;
      const db = mongoose.connection.client.db(dbName);
      
      const collections = (await db.listCollections().toArray()).map(c => c.name);
      if (collections.includes('users')) {
        const user = await db.collection('users').findOne({ email: 'admin@aayup.com' });
        if (user) {
          console.log(`FOUND USER in database "${dbName}":`, user);
        } else {
          console.log(`Collection "users" exists in database "${dbName}" but admin@aayup.com was not found.`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
