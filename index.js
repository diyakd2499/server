const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // 👈 (1) استدعاء مكتبة المسارات

// استدعاء ملف الجدولة (عشان يحذف الطلبات القديمة)
const startScheduler = require('./scheduler'); 

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 👈 (2) جعل مجلد public متاحاً (نضعه قبل الـ API)
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes (المسارات)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));

// تشغيل الجدولة
startScheduler();

// 👈 (3) توجيه أي رابط غير معروف للصفحة الرئيسية
// (هذا الكود يجب أن يكون بعد كل الـ API وقبل الـ listen)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 👈 (4) المنفذ (PORT)
// Render بيعطيك منفذ خاص فيه، لو ما لقاه بياخد 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});