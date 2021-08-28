const axios = require('axios');
const nodemailer = require('nodemailer');
const base = 'https://www.fast2sms.com/dev/bulkV2';
const smsToken = process.env.SMS_AUTH_TOKEN;

const sendOtp = async (otp, to) => {
    try{
        await axios.post(base, {
            variables_values: otp,
            route: 'otp',
            numbers: to
        }, {
            headers: { authorization: smsToken }
        });
        return true;
    }catch(err){
        return false;
    }
};

const sendMail = (otp, to) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ID,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const options = {
        from: process.env.GMAIL_ID,
        to, subject: 'OTP verification',
        text: `Your otp to verify your email is ${otp}`
    };

    return new Promise((resolve, reject) => transporter.sendMail(options, err => {
        if(err) reject(false);
        else resolve(true);
    }));
};

module.exports = {
    sendOtp,
    sendMail
};