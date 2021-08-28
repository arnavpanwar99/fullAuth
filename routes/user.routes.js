const { Router } = require('express');
const router = Router();
const User = require('../model/user.model');
const Alert = require('../model/alert.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { sendOtp, sendMail } = require('../sms');


const register = async (req, res, next) => {
    try{
        let { phone, password } = req.body;
        
        // validating input
        if(!(phone && password)) return res.status(400).send('All fields are required. (phone and password)');
        if(password.length > 16) return res.status(400).send('Password string should be at most 16 characters long.');
        if(password.length < 7) return res.status(400).send('Password string should be at least 7 characters long.');

        // checking existing user
        const existingUser = await User.findOne({ phone });
        if(existingUser) return res.status(409).send('Seems like you are already registered, please login to continue.');

        // hashing the password
        const passHash = await bcrypt.hash(password, 10);

        // creating user in database
        const user = await User.create({
            phone,
            password: passHash
        });

        // sending new user
        return res.status(200).json(user);
    }catch(err){
        next(err);
    };
};

const login = async (req, res, next) => {
    try{
        // get input
		let { phone, password } = req.body;

		// validating input
        if(!(phone && password)) return res.status(400).send('All fields are required. (phone and password)');

        // checking existing user
        const existingUser = await User.findOne({ phone });
		if(!existingUser) return res.status(400).send('No account found by that phone');

		// matching password
		const isPassSame = await bcrypt.compare(password, existingUser.password);
		if(!isPassSame) return res.status(400).send('Invalid password');

        // checking if user is verified
        if(!existingUser.phoneVerified) return res.status(400).send('Please verify your phone number to login.');

		// generating token
		const token = jwt.sign(
			{ userId: existingUser.id, phone },
			process.env.SECRET_KEY,
		);
		existingUser.token = token;

        // sending user refresh key
        const refreshKey = jwt.sign(
            { token },
            process.env.REFRESH_SECRET_KEY
        );
        res.cookie('refresh', refreshKey, {
            httpOnly: true,
            sameSite: 'none'
        });
        
		return res.status(200).json(existingUser);
    }catch (err){
        next(err);
    };
};

const refresh = (req, res, next) => {

    try{
        // extracting cookie from request
        const { refresh } = req.cookies;
        if(!refresh) return res.status(404).send('No refresh token found, please authenticate yourself.');

        const decoded = jwt.verify(refresh, process.env.REFRESH_SECRET_KEY);
        if(!decoded.token) return res.status(401).send('Invalid refresh token');

        res.status(200).json({ token: decoded.token });
    }catch(err){
        next(err);
    }
};

const getUser = async (req, res) => {
    try{
        const userData = req.user;
        const user = await User.findById(userData.userId);
        res.status(200).json(user);
    }catch(err){
        next(err);
    }
};

const addEmail = async (req, res, next) => {
    try{
        const email = req.body.email || req.query.email;
        if(!email) return res.status(400).send('Please enter a valid email id to add.');
        
        const existingUser = await User.findOne({ email });
        if(existingUser) return res.status(400).send('This email address is already associated with another user.');

        const userData = req.user;
        await User.updateOne({ _id: userData.userId }, { $set: { email } }, { runValidators: true });
        return res.status(200).send('Email updated successfully');
    }catch(err){
        next(err);
    }
};

const sendEmailCode = async (req, res, next) => {
    try{
        const email = req.body.email || req.query.email;
        const existingAlert = await Alert.findOne({ email });
        const code = existingAlert?.code || Math.floor(1000 + Math.random() * 9000);
        const existingUser = await User.findOne({ email });
        if(!existingUser) return res.status(404).send('Cannot find any user matching that email. Please add email to your account first.');
        if(existingAlert?.revision >= 3) return res.status(400).send('You have exausted your limit. Please wait and try after some time.');
        const sentStatus = await sendMail(code, email);
        
        if(!sentStatus) return res.status(500).send('We are having difficulties in sending OTP, please try after some time');
        if(!existingAlert?.code){
            await Alert.create({
                email, code
            });
        }else{
            await Alert.updateOne({ email }, { $inc: { revision: 1 } });
        };

        return res.status(200).send('OTP sent successufully.');
    }catch(err){
        next(err);
    }
}

const sendCode = async (req, res, next) => {
    try{
        const { phone } = req.body;
        const existingAlert = await Alert.findOne({ phone });
        const code = existingAlert?.code || Math.floor(1000 + Math.random() * 9000);
        const existingUser = await User.findOne({ phone });
        if(!existingUser) return res.status(404).send('Cannot find any user matching the phone number. Please create an account first.');
        if(existingAlert?.revision >= 3) return res.status(400).send('You have exausted your limit. Please wait and try after some time.');
        const sentStatus = await sendOtp(code, phone);
        
        if(!sentStatus) return res.status(500).send('We are having difficulties in sending OTP, please try after some time');
        if(!existingAlert?.code){
            await Alert.create({
                phone, code
            });
        }else{
            await Alert.updateOne({ phone }, { $inc: { revision: 1 } });
        };

        return res.status(200).send('OTP sent successufully.');
    }catch(err){
        next(err);
    }
};

const verifyCode = async (req, res, next) => {
    try{
        const { phone, code } = req.body;
        const existingAlert = await Alert.findOne({ phone });
        const user = await User.findOne({ phone });
        if(!user) return res.status(404).send('Cannot find any user matching the phone number. Please create an account first.');
        if(!existingAlert) return res.status(404).send('Your requested otp has expired. Please request for another otp.');
        if(existingAlert?.revision >= 5) return res.status(400).send('You have exausted your limit. Please wait and try after some time.');
        if(code === existingAlert.code){
            await User.updateOne({ phone }, { $set: { phoneVerified: true } });
            await Alert.deleteOne({ phone });

            // creating token
            const token = jwt.sign(
                {userId: user._id, phone},
                process.env.SECRET_KEY
            );

            // saving token
            user.token = token;
            
            // sending user refresh key
            const refreshKey = jwt.sign(
                { token },
                process.env.REFRESH_SECRET_KEY
            );
            res.cookie('refresh', refreshKey, {
                httpOnly: true,
                sameSite: 'none'
            });

            return res.status(200).json(user);
        }else{
            await Alert.updateOne({ phone }, { $inc: { revision: 1 } });
            return res.status(400).send('The otp you entered is incorrect, please try again.');
        }
    }catch(err){
        next(err);
    }
};

const verifyEmailCode = async (req, res, next) => {
    try{
        const { email, code } = req.body;
        const existingAlert = await Alert.findOne({ email });
        const user = await User.findOne({ email });
        if(!user) return res.status(404).send('Cannot find any user matching that email. Please add email to your account first.');
        if(!existingAlert) return res.status(404).send('Your requested otp has expired. Please request for another otp.');
        if(existingAlert?.revision >= 5) return res.status(400).send('You have exausted your limit. Please wait and try after some time.');
        if(code === existingAlert.code){
            await User.updateOne({ email }, { $set: { emailVerified: true } });
            await Alert.deleteOne({ email });
            return res.status(200).send('You have successfully verified your email.');
        }else{
            await Alert.updateOne({ email }, { $inc: { revision: 1 } });
            return res.status(400).send('The otp you entered is incorrect, please try again.');
        }
    }catch(err){
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try{
        const { phone, oldPass, newPass } = req.body;
        // validating input
        if(!(phone && oldPass && newPass)) return res.status(400).send('All fields are required. (phone, old and new passwords)');
        if(newPass.length > 16) return res.status(400).send('Password string should be at most 16 characters long.');
        if(newPass.length < 7) return res.status(400).send('Password string should be at least 7 characters long.');

        const user = await User.findOne({ phone });
        if(!user) return res.status(400).send('No user exist by that phone number.');
		const isPassSame = await bcrypt.compare(oldPass, user.password);
        if(!isPassSame) return res.status(400).send('The password you enetered is incorrect.');
        const newHash = await bcrypt.hash(newPass, 10);
        await User.updateOne({ phone }, { $set: { password: newHash } });
        return res.status(200).send('You have successfully modified your password');

    }catch(err){
        next(err);
    }
};

router.post('/login', login);
router.post('/register', register);
router.get('/refresh', refresh);
router.get('/get', auth, getUser);
router.post('/addEmail', auth, addEmail);
router.post('/sendCode', sendCode);
router.post('/sendEmailCode', auth, sendEmailCode);
router.post('/verifyCode', verifyCode);
router.post('/verifyEmailCode', auth, verifyEmailCode);
router.post('/resetPassword', auth, resetPassword);

module.exports = router;
