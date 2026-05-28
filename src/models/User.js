const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 4 },
  role:         { type: String, enum: ['Super Admin', 'Admin', 'Sales Executive'], default: 'Sales Executive' },
  team:         { type: String, default: '-' },
  avatar:       { type: String },
  profileImage: { type: String },
  phone:        { type: String, default: '' },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  leads:        { type: Number, default: 0 },
  converted:    { type: Number, default: 0 },
  notifications: {
    newLead: { type: Boolean, default: true },
    assignment: { type: Boolean, default: true },
    followup: { type: Boolean, default: true },
    conversion: { type: Boolean, default: false },
    weeklyReport: { type: Boolean, default: true },
  }
}, { timestamps: true });

// Auto-generate avatar initials
userSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.avatar) {
    this.avatar = this.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never return password
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
