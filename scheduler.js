const cron = require('node-cron');
const Order = require('./models/Order');
const User = require('./models/User'); // نحتاجه لجلب بيانات العميل
const nodemailer = require('nodemailer');

// إعداد الإيميل (نفس الإعدادات)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'wassili249@gmail.com', // 🔴 إيميلك
        pass: 'daha itln qkqp bqjr'         // 🔴 كلمة المرور
    }
});

const startScheduler = () => {
    console.log('⏰ نظام الجدولة (Scheduler) يعمل...');

    // تشغيل الفحص كل ساعة (0 * * * *)
    cron.schedule('0 * * * *', async () => {
        console.log('🔍 فحص الطلبات القديمة...');
        
        try {
            // تحديد الوقت قبل 12 ساعة
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

            // البحث عن الطلبات المعلقة (pending) والقديمة
            const staleOrders = await Order.find({
                status: 'pending',
                createdAt: { $lt: twelveHoursAgo }
            }).populate('client'); // لجلب إيميل العميل

            if (staleOrders.length === 0) return;

            console.log(`⚠️ تم العثور على ${staleOrders.length} طلب منتهي الصلاحية.`);

            for (const order of staleOrders) {
                // 1. تحديث الحالة
                order.status = 'cancelled';
                await order.save();

                // 2. إرسال الإيميل
                if (order.client && order.client.email) {
                    try {
                        await transporter.sendMail({
                            to: order.client.email,
                            subject: 'إلغاء الطلب لعدم التوفر | وصل-لي',
                            html: `
                                <div style="text-align:right; direction:rtl;">
                                    <h3>مرحباً ${order.client.name} 👋</h3>
                                    <p>نعتذر منك، لقد مر 12 ساعة على طلبك ولم يتم قبوله من أي كابتن حالياً.</p>
                                    <p><b>تم إلغاء الطلب تلقائياً.</b></p>
                                    <p>يمكنك المحاولة مرة أخرى في وقت لاحق.</p>
                                </div>
                            `
                        });
                        console.log(`📧 تم إرسال إيميل إلغاء لـ: ${order.client.email}`);
                    } catch (err) {
                        console.error('خطأ في إرسال الإيميل:', err.message);
                    }
                }
            }
        } catch (error) {
            console.error('خطأ في الجدولة:', error);
        }
    });
};

module.exports = startScheduler;