const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  // Singleton pattern - we'll only have one document
  isGlobal: { type: Boolean, default: true, unique: true },
  
  // Maps role names (e.g., 'Super Admin') to an array of permission strings
  rolePermissions: {
    type: Map,
    of: [String],
    default: {
      'Super Admin': ['View Dashboard', 'Manage Leads', 'Assign Leads', 'Delete Leads', 'View Reports', 'Manage Team', 'Export Data', 'Manage Settings'],
      'Admin': ['View Dashboard', 'Manage Leads', 'Assign Leads', 'View Reports', 'Manage Team', 'Export Data'],
      'Sales Executive': ['View Dashboard', 'Manage Leads']
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
