const axios = require('axios');

const API_URL = 'http://localhost:5009/api';

async function runTests() {
  console.log("🚀 Starting E2E API Pipeline Test...\n");
  try {
    // 1. Login
    console.log("1️⃣ Logging in as aayup@gmail.com...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'aayup@gmail.com',
      password: 'aayup2025'
    });
    const token = loginRes.data.token;
    console.log("✅ Login successful! Token received.\n");

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Create a Lead
    console.log("2️⃣ Creating a new Lead (Jane Doe)...");
    const leadRes = await axios.post(`${API_URL}/leads`, {
      name: 'Jane Doe',
      company: 'Tech Innovators',
      email: 'jane@example.com',
      phone: '8888888888',
      status: 'New'
    }, { headers });
    const leadId = leadRes.data._id;
    console.log(`✅ Lead Created! ID: ${leadId}\n`);

    // 3. Update Lead Status to 'Qualified'
    console.log("3️⃣ Updating Lead Status to 'Qualified'...");
    await axios.patch(`${API_URL}/leads/${leadId}`, { status: 'Qualified' }, { headers });
    console.log("✅ Lead Status Updated!\n");

    // 4. Convert to Opportunity
    console.log("4️⃣ Converting Lead to Opportunity...");
    const oppRes = await axios.post(`${API_URL}/leads/${leadId}/convert-opportunity`, {}, { headers });
    const oppId = oppRes.data._id;
    console.log(`✅ Converted successfully! Opportunity ID: ${oppId}\n`);

    // 5. Update Opportunity Stage to 'Won'
    console.log("5️⃣ Updating Opportunity Stage to 'Won'...");
    await axios.patch(`${API_URL}/opportunities/${oppId}`, { stage: 'Won' }, { headers });
    console.log("✅ Opportunity Stage Updated!\n");

    // 6. Convert to Customer
    console.log("6️⃣ Converting Won Opportunity to Customer...");
    const custRes = await axios.post(`${API_URL}/opportunities/${oppId}/convert-customer`, {}, { headers });
    const custId = custRes.data._id;
    console.log(`✅ Customer Created successfully! Customer ID: ${custId}\n`);

    // 7. Fetch Customers to verify
    console.log("7️⃣ Fetching Customers List to verify...");
    const listRes = await axios.get(`${API_URL}/customers`, { headers });
    const found = listRes.data.find(c => c._id === custId);
    
    if (found) {
      console.log(`🎉 SUCCESS! Pipeline verified from Lead -> Opportunity -> Customer.`);
      console.log(`   Customer details: Name: ${found.name}, Company: ${found.company}`);
    } else {
      console.log("❌ Failed to find the newly created customer in the list.");
    }

  } catch (err) {
    console.error("❌ Test Failed!");
    console.error(err.response?.data?.message || err.message);
  }
}

runTests();
