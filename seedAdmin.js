require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const createAdmin = async () => {
    try {
        await connectDB();

        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            console.log('Admin already exists');
            process.exit();
        }

        const admin = await User.create({
            name: 'Admin Wassili',
            phone: '0112046348',
            password: 'diya09050647',
            role: 'admin',
        });

        console.log('Admin created successfully');
        console.log({
            phone: admin.phone,
            password: 'diya09050647',
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

createAdmin();
