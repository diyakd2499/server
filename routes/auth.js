const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // للإبقاء على عمل الأكواد القديمة

// --- إعدادات الإيميل الجديدة (لاستعادة كلمة المرور) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// 1️⃣ تسجيل مستخدم جديد (الكود القديم)
// ==========================================
// ... (بداية الملف كما هي) ...

router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // التحقق من وجود المستخدم
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });

        // تشفير الباسورد
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إنشاء الكود
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // إنشاء المستخدم
        user = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'client',
            isVerified: false,
            verificationCode
        });

        await user.save(); // ✅ تم الحفظ بنجاح هنا

        // 👇👇 التعديل الجذري هنا 👇👇
        
        // 1. طباعة الكود في اللوقز (عشان لو الإيميل تأخر، تشوفه في Render)
        console.log("========================================");
        console.log(`🔐 كود التفعيل للمستخدم ${name} هو: ${verificationCode}`);
        console.log("========================================");

        // 2. إرسال الإيميل في الخلفية (بدون await)
        // لاحظ: حذفنا كلمة await عشان السيرفر ما ينتظر
        sendEmail(email, 'كود تفعيل حساب وصل-لي', `كود التفعيل: ${verificationCode}`)
            .catch(err => console.log("⚠️ فشل إرسال الإيميل في الخلفية (غير مؤثر على التسجيل):", err.message));

        // 3. الرد الفوري على الهاتف (عشان ما يعلق)
        res.status(201).json({ message: 'تم التسجيل بنجاح! راجع الإيميل  .' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// ... (باقي الملف كما هو) ...// ==========================================
// 2️⃣ تسجيل الدخول (مدمج مع التحسينات)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم
        const user = await User.findOne({ email });
        
        // التحقق من الباسورد (يجب استخدام compare لأن الباسورد مشفر)
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'بيانات الدخول غير صحيحة' });
        }

        // 🟢 تحقق التفعيل
        if (!user.isVerified) {
            return res.status(403).json({ message: 'الحساب غير مفعل، يرجى تفعيله أولاً' });
        }

        // إنشاء التوكن
        const payload = { userId: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // إرسال الرد
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
// 3️⃣ تفعيل الحساب (الكود القديم)
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
// 4️⃣ إعادة إرسال الكود (الكود القديم)
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

        await sendEmail(email, 'إعادة إرسال كود التفعيل', `كود التفعيل الجديد هو: ${newCode}`);
        res.json({ message: 'تم إرسال كود جديد بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'فشل في إرسال الكود' });
    }
});

// ==========================================
// 5️⃣ طلب استعادة كلمة المرور (جديد ✨)
// ==========================================
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'هذا الإيميل غير مسجل عندنا' });

        // توليد كود استعادة
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode; // ⚠️ تأكد أنك أضفت resetCode في الـ User Model
        await user.save();

        console.log(`Reset Code for ${email}: ${resetCode}`);

        // إرسال الإيميل
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'استعادة كلمة المرور | وصل-لي',
                html: `<div style="text-align: right; direction: rtl;">
                        <h3>استعادة كلمة المرور 🔐</h3>
                        <p>لقد طلبت إعادة تعيين كلمة المرور.</p>
                        <p>كود التغيير الخاص بك هو:</p>
                        <h2 style="color: #0a8754;">${resetCode}</h2>
                       </div>`
            });
        } catch (err) { console.log("Mail Error", err); }

        res.json({ message: 'تم إرسال رمز التغيير إلى إيميلك 📨' });

    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

// ==========================================
// 6️⃣ تغيير كلمة المرور (جديد ✨)
// ==========================================
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: 'الكود غير صحيح' });

        // ⚠️ مهم جداً: تشفير كلمة المرور الجديدة قبل الحفظ
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        user.resetCode = undefined; // مسح الكود بعد الاستخدام
        await user.save();

        res.json({ message: 'تم تغيير كلمة المرور بنجاح! سجل دخولك الآن 🔐' });

    } catch (error) { res.status(500).json({ message: 'خطأ سيرفر' }); }
});

module.exports = router;
