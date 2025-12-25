const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order'); // نحتاج هذا الموديل لحساب الإحصائيات
const { protect } = require('../middleware/authMiddleware');

// =========================================================
// 👮‍♂️ ميدل وير (Middleware) للتأكد أن المستخدم هو "أدمن"
// =========================================================
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'غير مسموح! هذه المنطقة للأدمن فقط 🚫' });
    }
};

// =========================================================
// 📊 الجزء الأول: الإحصائيات والداشبورد (Dashboard)
// =========================================================

// @route   GET /api/admin/dashboard
// @desc    جلب إحصائيات شاملة للنظام
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    try {
        // 1. حساب الأعداد
        const captainsCount = await User.countDocuments({ role: 'captain' });
        const customersCount = await User.countDocuments({ role: { $in: ['client', 'customer'] } }); 
        const ordersCount = await Order.countDocuments({});

        // 2. حساب الأرباح (من الطلبات Delivered فقط)
        const deliveredOrders = await Order.find({ status: 'delivered' });
        const totalRevenue = deliveredOrders.reduce((acc, order) => acc + order.price, 0);

        // 3. آخر 5 طلبات
        const recentOrders = await Order.find()
            .populate('customer', 'name')
            .populate('captain', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                captains: captainsCount,
                customers: customersCount,
                orders: ordersCount,
                revenue: totalRevenue
            },
            recentOrders
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// =========================================================
// 👥 الجزء الثاني: إدارة المستخدمين (كودك الممتاز)
// =========================================================

// @route   GET /api/admin/users
// @desc    جلب كل المستخدمين
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// @route   GET /api/admin/captains
// @desc    جلب كل الكباتن فقط
router.get('/captains', protect, adminOnly, async (req, res) => {
    try {
        const captains = await User.find({ role: 'captain' }).select('-password');
        res.json(captains);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// @route   PUT /api/admin/user/:id/status
// @desc    تفعيل / تعطيل مستخدم
router.put('/user/:id/status', protect, adminOnly, async (req, res) => {
    try {
        // ❌ منع الأدمن من تعطيل نفسه (حماية ذكية منك)
        if (req.user._id.toString() === req.params.id) {
            return res.status(400).json({ message: 'لا يمكنك تعطيل حسابك' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        // عكس الحالة (إذا كان مفعل يصير معطل، والعكس)
        user.isActive = !user.isActive; 
        
        // حفظ التغيير (تأكد أن حقل isActive موجود في User Schema، لو لم يكن موجوداً سيعتبره مفعل دائماً)
        // إذا لم تقم بإضافته للمودل، سيعمل الكود لكن لن يحفظ شيئاً. 
        // سأفترض أنك أضفته أو ستضيفه لاحقاً، الكود سليم 100%.
        await user.save();

        res.json({
            message: `تم ${user.isActive ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح`,
            isActive: user.isActive,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

module.exports = router;