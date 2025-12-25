const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com", // تحديد السيرفر مباشرة
            port: 587,              // استخدام المنفذ 587 (غالباً مفتوح وأسرع)
            secure: false,          // false لأننا نستخدم 587 (يعتمد على STARTTLS)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                ciphers: "SSLv3",  // إعدادات توافقية إضافية
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"تطبيق وصل-لي" <${process.env.EMAIL_USER}>`, // إضافة اسم يظهر للمستخدم
            to: email,
            subject: subject,
            html: htmlContent, 
            text: htmlContent.replace(/<[^>]*>?/gm, '') // نسخة نصية
        });

        console.log("✅ Email sent successfully. Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Email Connection Error:", error);
    }
};

module.exports = sendEmail;
