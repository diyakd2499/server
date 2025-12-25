const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        
        // ✅ حافظنا على الأدوار القديمة
        role: { 
            type: String, 
            enum: ['customer', 'client', 'captain', 'admin'], 
            default: 'client' 
        },

        // ✅ حافظنا على نوع المركبة للكابتن
        vehicleType: { 
            type: String, 
            enum: ['bicycle', 'electric', 'motorcycle'] 
        },

        isActive: { type: Boolean, default: true },
        
        // 👇 الإضافات الجديدة للتفعيل والأمان 👇
        isVerified: { type: Boolean, default: false },
        verificationCode: { type: String },
        verificationCodeExpires: { type: Date }, // ⏰ وقت انتهاء الكود
        
        resetCode: { type: String }
    },
    { timestamps: true }
);

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);