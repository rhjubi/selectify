require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static('public'));

// ১. ডাটাবেস কানেকশন
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ DB Error: ", err));

// ২. ডাটা মডেল
const User = require('./models/User');
const Material = require('./models/Material');
const Exam = require('./models/Exam');
const Result = require('./models/Result');
const Video = require('./models/Video');   
const Notice = require('./models/Notice'); 

const Student = User; 

// --- EMAIL CONFIGURATION (FINAL FIX) ---
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525, // Port 2525 is safest
    secure: false, 
    auth: {
        // গুরুত্বপুর্ণ: এখানে অবশ্যই Brevo একাউন্টের লগইন ইমেইল দিতে হবে
        user: process.env.EMAIL_USER, // এটি হবে: rakib.u.habibee@gmail.com
        pass: process.env.EMAIL_PASS  // এটি হবে: xsmtpsib-...
    },
    logger: true,
    debug: true
});

// ৩. অথেনটিকেশন এপিআই

// Step 1: Signup Request
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password, category } = req.body;
        if (!name || !email || !password || !category) return res.status(400).json({ error: "All fields are required!" });

        let user = await Student.findOne({ email });
        if (user) {
            if (user.isVerified) return res.status(400).json({ error: "Email already registered & verified!" });
            else { user.name = name; user.password = password; user.category = category; }
        } else {
            user = new Student({ name, email, password, category, isVerified: false });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Send Email
        const mailOptions = {
            // গুরুত্বপুর্ণ: Sender হবে আপনার ভেরিফাইড বিজনেস ইমেইল
            from: 'LMS Admin <jubaer@nasir-group.biz>', 
            to: email, 
            subject: 'Verify Your Account - OTP',
            text: `Welcome ${name}! Your OTP for account verification is: ${otp}`
        };

        try {
            console.log("Sending email via Brevo (Auth: Gmail, Sender: Biz)..."); 
            let info = await transporter.sendMail(mailOptions);
            console.log("✅ Email sent info: ", info.messageId);
            res.json({ success: true, message: "OTP sent to email. Please verify." });
        } catch (mailError) {
            console.error("❌ Mail Sending Error Detail:", mailError);
            return res.status(500).json({ error: "Failed to send OTP. Check server logs." });
        }

    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Step 2: Verify OTP
app.post('/api/verify-signup', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await Student.findOne({ email });

        if (!user) return res.status(400).json({ error: "User not found!" });
        if (user.isVerified) return res.status(400).json({ error: "User already verified!" });
        
        if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP!" });
        if (user.otpExpire < Date.now()) return res.status(400).json({ error: "OTP Expired!" });

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        res.json({ success: true, message: "Verification successful!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Student.findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid email or password!" });
        if (!user.isVerified) return res.status(401).json({ error: "Account not verified!" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password!" });
        res.json({ success: true, user: { name: user.name, email: user.email, category: user.category } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Student.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: 'LMS Admin <jubaer@nasir-group.biz>', 
            to: email, 
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP sent!" });
    } catch (err) { res.status(500).json({ error: "Mail failed." }); }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await Student.findOne({ email, otp, otpExpire: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ error: "Invalid OTP!" });

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();
        res.json({ success: true, message: "Password changed!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin APIs
app.get('/admin/materials', async (req, res) => res.json(await Material.find()));
app.post('/admin/add-material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.put('/admin/edit-material/:id', async (req, res) => { await Material.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.patch('/admin/toggle-material/:id', async (req, res) => { const m = await Material.findById(req.params.id); m.isActive = !m.isActive; await m.save(); res.json({ success: true }); });
app.delete('/admin/delete-material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/admin/videos', async (req, res) => res.json(await Video.find()));
app.post('/admin/add-video', async (req, res) => { await new Video(req.body).save(); res.json({ success: true }); });
app.put('/admin/edit-video/:id', async (req, res) => { await Video.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.patch('/admin/toggle-video/:id', async (req, res) => { const v = await Video.findById(req.params.id); v.isActive = !v.isActive; await v.save(); res.json({ success: true }); });
app.delete('/admin/delete-video/:id', async (req, res) => { await Video.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/admin/notices', async (req, res) => res.json(await Notice.find().sort({ date: -1 })));
app.post('/admin/add-notice', async (req, res) => { await new Notice(req.body).save(); res.json({ success: true }); });
app.delete('/admin/delete-notice/:id', async (req, res) => { await Notice.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/admin/exams', async (req, res) => res.json(await Exam.find()));
app.post('/admin/create-exam', async (req, res) => { await new Exam(req.body).save(); res.json({ success: true }); });
app.put('/admin/edit-exam/:id', async (req, res) => { await Exam.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.patch('/admin/toggle-exam/:id', async (req, res) => { const e = await Exam.findById(req.params.id); e.isActive = !e.isActive; await e.save(); res.json({ success: true }); });
app.delete('/admin/delete-exam/:id', async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/admin/students', async (req, res) => { const students = await Student.find({ role: 'student' }).sort({ createdAt: -1 }); res.json(students); });
app.get('/admin/users', async (req, res) => { const users = await Student.find({ role: 'student' }).select('name email category'); res.json(users); });
app.delete('/admin/delete-student/:id', async (req, res) => { await Student.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/admin/results', async (req, res) => res.json(await Result.find()));
app.post('/admin/save-result', async (req, res) => { try { await new Result(req.body).save(); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/admin/pending-writings', async (req, res) => { try { const pendings = await Result.find({ status: 'Pending', submittedText: { $exists: true, $ne: "" } }).sort({ completedAt: -1 }); res.json(pendings); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/admin/grade-writing', async (req, res) => { try { const { resultId, score, feedback } = req.body; await Result.findByIdAndUpdate(resultId, { score: score, adminFeedback: feedback, status: 'Published' }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/admin-login', async (req, res) => { try { const { username, password } = req.body; if(username === "admin" && password === "admin123") { return res.json({ success: true, token: "admin-token", message: "Login Successful" }); } const admin = await Student.findOne({ $or: [{ name: username }, { email: username }] }); if (!admin) return res.status(401).json({ message: "Admin not found!" }); const isMatch = (admin.password === password) || (await bcrypt.compare(password, admin.password).catch(()=>false)); if (isMatch) { res.json({ success: true, token: "admin-access-token-123", message: "Login Successful" }); } else { res.status(401).json({ message: "Invalid Password!" }); } } catch (err) { res.status(500).json({ message: "Server error: " + err.message }); } });

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`🚀 Server running on: http://localhost:${PORT}`));