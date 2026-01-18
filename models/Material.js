const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    driveLink: { type: String, required: true },
    isActive: { type: Boolean, default: true }, // নতুন যোগ করা হয়েছে
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);