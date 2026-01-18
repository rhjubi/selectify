const mongoose = require('mongoose');

// Question Schema আলাদা না করে একসাথেই রাখা হলো
const examSchema = new mongoose.Schema({
    examTitle: { type: String, required: true },
    examTime: { type: Number, default: 10 },
    negativeMarks: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
    type: { type: String, default: 'MCQ' }, // 'MCQ' or 'Writing' (NEW)
    questions: { type: Array, default: [] }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exam', examSchema);