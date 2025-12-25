const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// إعدادات الإيميل (استخدم كلمة مرور التطبيقات App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // سيقرأ من Render
        pass: process.env.EMAIL_PASS  // سيقرأ من Render
    }
});

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, phone, email, password, role, vehicleType } = req.body;
        // ... (نفس كود التحقق السابق) ...
        // اختصاراً للكود هنا، تأكد من استخدام الكود الكامل الذي أرسلته لك سابقاً
        // الذي يحتوي على إنشاء verificationCode وحفظه
        
        // (سأضع لك أهم جزء للتذكير):
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.create({
            name, phone, email, password, role: role || 'client', vehicleType,
            isVerified: false, verificationCode
        });

        // إرسال الإيميل...
        res.status(201).json({ message: 'تم التسجيل! راجع إيميلك للحصول على الكود' });
    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });
        }
        
        // 🟢 تحقق التفعيل
        if (!user.isVerified) return res.status(403).json({ message: 'الحساب غير مفعل' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        
        // نرسل رسالة نجاح واضحة
        res.json({ message: 'تم تسجيل الدخول بنجاح! 🚀', token, user: { name: user.name, role: user.role } });

    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

// 👇👇👇 الجزء المفقود: استعادة كلمة المرور 👇👇👇

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'هذا الإيميل غير مسجل عندنا' });

        // توليد كود استعادة
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode;
        await user.save();

        console.log(`Reset Code for ${email}: ${resetCode}`); // 📟 طباعة الكود في التيرمينال للاحتياط

        try {
            await transporter.sendMail({
                to: email,
                subject: 'استعادة كلمة المرور | وصل-لي',
                html: `<p>كود تغيير كلمة المرور هو: <b>${resetCode}</b></p>`
            });
        } catch (err) { console.log("Mail Error"); }

        res.json({ message: 'تم إرسال رمز التغيير إلى إيميلك 📨' });

    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: 'الكود غير صحيح' });

        user.password = newPassword;
        user.resetCode = undefined; // مسح الكود
        await user.save();

        res.json({ message: 'تم تغيير كلمة المرور بنجاح! سجل دخولك الآن 🔐' });

    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

module.exports = router;
