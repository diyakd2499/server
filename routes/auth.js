const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// ==========================================
// 1️⃣ تسجيل مستخدم جديد (بدون تشفير يدوي)
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // التحقق من وجود المستخدم
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });

        // إنشاء كود تحقق عشوائي
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // ⚠️ هام: نرسل الباسورد كما هو (password) ونعتمد على User.js لتشفيره
        // هذا يحل مشكلة "بيانات الدخول غير صحيحة" للمستخدمين الجدد
        user = new User({
            name,
            email,
            phone,
            password: password, 
            role: role || 'client',
            isVerified: false,
            verificationCode
        });

        await user.save();

        // طباعة الكود في اللوقز (للتفعيل السريع)
        console.log("========================================");
        console.log(`🔐 كود التفعيل للمستخدم ${name} هو: ${verificationCode}`);
        console.log("========================================");

        // إرسال الإيميل في الخلفية
        sendEmail(email, 'كود تفعيل حساب وصل-لي', `كود التفعيل الخاص بك هو: ${verificationCode}`)
            .catch(err => console.log("⚠️ لم يتم إرسال الإيميل:", err.message));

        res.status(201).json({ message: 'تم التسجيل بنجاح! راجع اللوقز للحصول على الكود.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// ==========================================
// 2️⃣ تسجيل الدخول
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });

        // مقارنة الباسورد
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });

        if (!user.isVerified) return res.status(403).json({ message: 'الحساب غير مفعل' });

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: 'تم تسجيل الدخول بنجاح! 🚀', 
            token, 
            user: { name: user.name, role: user.role } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// ==========================================
// 3️⃣ تفعيل الحساب
// ==========================================
router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: 'المستخدم غير موجود' });
        if (user.verificationCode !== code) return res.status(400).json({ message: 'كود التفعيل غير صحيح' });

        user.isVerified = true;
        user.verificationCode = undefined;
        await user.save();

        res.json({ message: 'تم تفعيل الحساب بنجاح!' });
    } catch (err) {
        res.status(500).json({ message: 'خطأ سيرفر' });
    }
});

// ==========================================
// 4️⃣ إعادة إرسال الكود
// ==========================================
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: 'المستخدم غير موجود' });
        if (user.isVerified) return res.status(400).json({ message: 'الحساب مفعل بالفعل!' });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newCode;
        await user.save();
        
        console.log(`🔐 كود جديد للإيميل ${email}: ${newCode}`); // طباعة الكود

        sendEmail(email, 'إعادة إرسال كود التفعيل', `كود التفعيل الجديد هو: ${newCode}`)
            .catch(err => console.log("Mail Error:", err.message));
            
        res.json({ message: 'تم إرسال كود جديد بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'فشل في إرسال الكود' });
    }
});

module.exports = router;
