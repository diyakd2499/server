const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// @route   POST /api/orders
// @desc    Create a new order (with duplicate check)
router.post('/', protect, async (req, res) => {
    try {
        const { pickup, dropoff, details, price, distanceType } = req.body;

        if (!pickup || !dropoff || !price || !details) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (typeof pickup.address !== 'string' || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
            return res.status(400).json({ message: 'Invalid pickup data' });
        }

        if (typeof dropoff.address !== 'string' || typeof dropoff.lat !== 'number' || typeof dropoff.lng !== 'number') {
            return res.status(400).json({ message: 'Invalid dropoff data' });
        }

        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ message: 'Invalid price' });
        }

        // Duplicate Check
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const duplicateOrder = await Order.findOne({
            client: req.user.id,
            price: price,
            'pickup.address': pickup.address,
            status: 'pending',
            createdAt: { $gt: oneMinuteAgo }
        });

        if (duplicateOrder) {
            return res.status(400).json({ message: 'You have already submitted this order recently' });
        }

        const order = await Order.create({
            client: req.user.id,
            pickup, dropoff, details, distanceType, price,
            status: 'pending'
        });

        res.status(201).json({ message: 'Order created successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel an order by the client
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.client.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to cancel this order' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'This order cannot be cancelled as it is already in progress or completed' });
        }

        order.status = 'cancelled';
        await order.save();

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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
// @route   GET /api/orders (for captains)
router.get('/', protect, async (req, res) => {
    const userRole = req.user.role ? req.user.role.toLowerCase().trim() : '';
    if (userRole === 'captain') {
        const orders = await Order.find({ status: 'pending' }).populate('client', 'name phone').sort({ createdAt: -1 });
        res.json(orders);
    } else {
        res.status(403).json({ message: 'Only captains can access this route' });
    }
});
// @route   PUT /api/orders/:id/accept
// @desc    Accept an order (captain)
router.put('/:id/accept', protect, async (req, res) => {
    try {
        if (req.user.role !== 'captain') {
            return res.status(403).json({ message: 'Only captains can accept orders' });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Order is not available' });
        }
        order.captain = req.user.id;
        order.status = 'accepted';
        await order.save();
        res.json({ message: 'Order accepted', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/orders/:id/deliver
// @desc    Mark an order as delivered (captain)
router.put('/:id/deliver', protect, async (req, res) => {
    try {
        if (req.user.role !== 'captain') {
            return res.status(403).json({ message: 'Only captains can deliver orders' });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.captain.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to deliver this order' });
        }
        if (order.status !== 'accepted') {
            return res.status(400).json({ message: 'Order is not accepted yet' });
        }
        order.status = 'delivered';
        await order.save();
        res.json({ message: 'Order delivered', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/orders/my-missions
// @desc    Get my missions (captain)
router.get('/my-missions', protect, async (req, res) => {
    try {
        if (req.user.role !== 'captain') {
            return res.status(403).json({ message: 'Only captains have missions' });
        }
        const orders = await Order.find({ captain: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
