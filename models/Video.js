const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true }, 
    link: { type: String, required: true }, 
    isActive: { type: Boolean, default: true },
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);