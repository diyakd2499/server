const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            html: htmlContent, 
            text: htmlContent.replace(/<[^>]*>?/gm, '') // نسخة نصية احتياطية
        });

        console.log("✅ Email sent successfully to:", email);
    } catch (error) {
        console.error("❌ Email not sent:", error);
    }
};

module.exports = sendEmail;
