const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

// إعدادات الإيميل (تأكد من وضع كلمة مرور التطبيقات هنا أيضاً)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'wassili249@gmail.com', // ضع إيميلك
        pass: 'daha itln qkqp bqjr'         // 🔴 ضع كلمة مرور التطبيقات
    }
});

// @route   POST /api/orders
// @desc    إنشاء طلب جديد (مع منع التكرار)
router.post('/', protect, async (req, res) => {
    try {
        const { pickup, dropoff, details, price, distanceType } = req.body;

        if (!pickup || !dropoff || !price) {
            return res.status(400).json({ message: 'بيانات ناقصة' });
        }

        // 🔥 منع التكرار (Duplicate Check)
        // نبحث عن طلب لنفس العميل، بنفس السعر، تم إنشاؤه في آخر دقيقة
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const duplicateOrder = await Order.findOne({
            client: req.user.id,
            price: price,
            'pickup.address': pickup.address,
            status: 'pending',
            createdAt: { $gt: oneMinuteAgo }
        });

        if (duplicateOrder) {
            return res.status(400).json({ message: 'لقد قمت بإرسال هذا الطلب بالفعل قبل قليل!' });
        }

        const order = await Order.create({
            client: req.user.id,
            pickup, dropoff, details, distanceType, price,
            status: 'pending'
        });

        res.status(201).json({ message: 'تم إرسال الطلب', order });
    } catch (error) {
        res.status(500).json({ message: 'خطأ سيرفر' });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    إلغاء الطلب من قبل العميل
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

        // التأكد أن الطالب هو صاحب الطلب
        if (order.client.toString() !== req.user.id) {
            return res.status(403).json({ message: 'غير مصرح لك بإلغاء هذا الطلب' });
        }

        // لا يمكن إلغاء طلب وافق عليه الكابتن أو تم توصيله
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'لا يمكن إلغاء الطلب لأنه قيد التنفيذ أو مكتمل' });
        }

        order.status = 'cancelled';
        await order.save();

        res.json({ message: 'تم إلغاء الطلب بنجاح', order });
    } catch (error) {
        res.status(500).json({ message: 'خطأ سيرفر' });
    }
});

// @route   GET /api/orders/my-orders (للعميل)
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ client: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) { res.status(500).json({ message: 'خطأ' }); }
});

// ... (راوتات الكابتن my-missions, accept, deliver القديمة تبقى كما هي بالأسفل) ...
// (اختصاراً للمساحة تأكد من وجود بقية الراوتات هنا)
// @route   GET /api/orders (للكابتن)
router.get('/', protect, async (req, res) => {
    const userRole = req.user.role ? req.user.role.toLowerCase().trim() : '';
    if (userRole === 'captain') {
        const orders = await Order.find({ status: 'pending' }).populate('client', 'name phone').sort({ createdAt: -1 });
        res.json(orders);
    } else {
        res.status(403).json({ message: 'كابتن فقط' });
    }
});
router.put('/:id/accept', protect, async (req, res) => { /* نفس الكود القديم */ });
router.put('/:id/deliver', protect, async (req, res) => { /* نفس الكود القديم */ });
router.get('/my-missions', protect, async (req, res) => { /* نفس الكود القديم */ });

module.exports = router;