const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    studentName: String,
    studentEmail: String,
    studentPhone: String,
    examTitle: String,
    score: { type: Number, default: 0 },
    totalScore: Number,
    // MCQ এর জন্য
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    details: { type: Array, default: [] },
    // Writing এর জন্য (NEW FIELDS)
    submittedText: { type: String, default: '' }, // স্টুডেন্টের উত্তর
    adminFeedback: { type: String, default: '' }, // শিক্ষকের মন্তব্য
    status: { type: String, default: 'Published' }, // 'Published' or 'Pending'
    completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', ResultSchema);