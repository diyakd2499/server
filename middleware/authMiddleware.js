const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user || !req.user.isActive) {
                return res.status(403).json({ message: 'الحساب موقوف' });
}


            next();
        } catch (error) {
            return res.status(401).json({ message: 'غير مصرح، توكن غير صالح' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'غير مصرح، لا يوجد توكن' });
    }
};

module.exports = { protect };
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'ممنوع: صلاحيات أدمن فقط' });
    }
};

module.exports = { protect, adminOnly };
