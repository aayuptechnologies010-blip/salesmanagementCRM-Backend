const axios = require('axios');

class MaskCallingService {
  constructor() {
    this.provider = process.env.CALLING_PROVIDER || 'mock'; // 'exotel', 'twilio', 'mock'
    this.apiKey = process.env.CALLING_API_KEY;
    this.apiSecret = process.env.CALLING_API_SECRET;
    this.virtualNumber = process.env.CALLING_VIRTUAL_NUMBER;
  }

  async initiateCall(agentNumber, customerNumber, leadId) {
    console.log(`[MaskCallingService] Initiating call via ${this.provider} Provider...`);
    console.log(`[MaskCallingService] Agent: ${agentNumber} <--> Customer: ${customerNumber}`);

    if (this.provider === 'mock') {
      return {
        success: true,
        callId: `mock_call_${Date.now()}`,
        message: 'Mock call initiated successfully'
      };
    }

    if (this.provider === 'exotel') {
      // Example Exotel implementation structure
      const url = `https://${this.apiKey}:${this.apiSecret}@api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;
      const data = new URLSearchParams({
        From: agentNumber,
        To: customerNumber,
        CallerId: this.virtualNumber,
        CustomField: leadId
      });
      
      try {
        const response = await axios.post(url, data.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return {
          success: true,
          callId: response.data.Call.Sid,
          message: 'Call initiated'
        };
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Call initiation failed');
      }
    }

    throw new Error('Unsupported calling provider');
  }
}

module.exports = new MaskCallingService();
