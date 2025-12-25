const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const startScheduler = require('./scheduler'); 

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 1. طباعة رسالة بداية
console.log("🚀 Server is starting...");

// جعل مجلد public متاحاً
app.use(express.static(path.join(__dirname, 'public')));

// 2. طباعة الرابط (مع إخفاء الباسورد للأمان) عشان نتأكد ان Render قراه صح
const dbUri = process.env.MONGO_URI;
if (!dbUri) {
    console.error("❌ FATAL ERROR: MONGO_URI is missing in Environment Variables!");
} else {
    console.log(`📡 Attempting to connect to DB... (URI Length: ${dbUri.length})`);
}

// Database Connection
mongoose.connect(dbUri)
    .then(() => console.log('✅ MongoDB Connected Successfully!')) // لو اشتغل حيكتب دي
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message); // لو فشل حيكتب دي
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));

startScheduler();

// معالجة الروابط
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
