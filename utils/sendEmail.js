const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,              // نعود للمنفذ الآمن SSL
            secure: true,           // ضروري مع منفذ 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // 👇 إعدادات إضافية لحل مشكلة Timeout 👇
            tls: {
                rejectUnauthorized: false
            },
            // زيادة وقت الانتظار لـ 10 ثواني
            connectionTimeout: 10000 
        });

        const info = await transporter.sendMail({
            from: `"تطبيق وصل-لي" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: htmlContent, 
            text: htmlContent.replace(/<[^>]*>?/gm, '') 
        });

        console.log("✅ Email sent successfully. Message ID:", info.messageId);
    } catch (error) {
        // طباعة الخطأ ولكن بدون إيقاف السيرفر
        console.error("❌ Email failed (Use Log Code):", error.message);
    }
};

module.exports = sendEmail;
