const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: { type: String, required: true },
    category: { type: String, required: true }, 
    role: { type: String, default: 'student' },
    
    // New Fields for Verification & Reset
    otp: { type: String }, // For Signup & Reset both
    otpExpire: { type: Date },
    isVerified: { type: Boolean, default: false }, // Email verified or not

    createdAt: { type: Date, default: Date.now }
});

// Password Hash Middleware
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw new Error(err);
    }
});

const User = mongoose.model('User', userSchema, 'users'); 
module.exports = User;