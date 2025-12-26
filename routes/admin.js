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
        res.status(403).json({ message: 'Forbidden: This area is for admins only' });
    }
};

// =========================================================
// 📊 الجزء الأول: الإحصائيات والداشبورد (Dashboard)
// =========================================================

// @route   GET /api/admin/dashboard
// @desc    Get comprehensive system statistics
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    try {
        const captainsCount = await User.countDocuments({ role: 'captain' });
        const customersCount = await User.countDocuments({ role: { $in: ['client', 'customer'] } });
        const ordersCount = await Order.countDocuments({});

        const deliveredOrders = await Order.find({ status: 'delivered' });
        const totalRevenue = deliveredOrders.reduce((acc, order) => acc + order.price, 0);

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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/user/:id
// @desc    Get user by ID
router.get('/user/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =========================================================
// 👥 الجزء الثاني: إدارة المستخدمين (كودك الممتاز)
// =========================================================

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/captains
// @desc    Get all captains
router.get('/captains', protect, adminOnly, async (req, res) => {
    try {
        const captains = await User.find({ role: 'captain' }).select('-password');
        res.json(captains);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/user/:id/status
// @desc    Activate/deactivate a user
router.put('/user/:id/status', protect, adminOnly, async (req, res) => {
    try {
        if (req.user._id.toString() === req.params.id) {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: `User has been successfully ${user.isActive ? 'activated' : 'deactivated'}`,
            isActive: user.isActive,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
