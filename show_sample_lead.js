const dns = require('dns');
dns.setServers(['8.8.8.8']);
const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://aayuptechnologies_db_user:t9a4mbgdpwlGUIzP@cluster0.xkwgx1b.mongodb.net/SalesManagementCRM?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const leadsCol = db.collection('leads');
    const lead = await leadsCol.findOne({});
    console.log('Sample Lead:', JSON.stringify(lead, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
