const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        captain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        
        // 👇 التعديل الجذري: تفاصيل الاستلام 👇
        pickup: {
            address: { type: String, required: true },      // وصف المكان
            contactName: { type: String, required: true },  // اسم الشخص الهنسلم منو
            contactPhone: { type: String, required: true }  // رقمه
        },

        // 👇 التعديل الجذري: تفاصيل التسليم 👇
        dropoff: {
            address: { type: String, required: true },      // وصف المكان
            receiverName: { type: String, required: true }, // اسم المستلم
            receiverPhone: { type: String, required: true } // رقمه
        },

        details: { type: String },

        // 👇 السعر والمسافة 👇
        distanceType: { 
            type: String, 
            enum: ['short', 'medium', 'long'], // قريب، وسط، بعيد
            required: true 
        },
        price: { type: Number, required: true }, // السعر النهائي

        status: {
            type: String,
            enum: ['pending', 'accepted', 'delivered', 'cancelled'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);