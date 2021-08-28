const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: mail => mail.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/),
            message: val => `${val.value} is not a valid email`
        },
    },
	phone: { 
        type: String, 
        unique: true,
        trim: true,
        validate: {
            validator: number => number.match(/^(\+\d{1,3}[- ]?)?\d{10}$/) && !(number.match(/0{5,}/) && !('12345'.includes(number[0]))),
            message: val => `${val.value} is not a valid phone number`
        },
    },
	password: { 
        type: String,
        trim: true,
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
	token: { type: String },
});

userSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        delete ret._id,
        delete ret.password
    }
});

module.exports = mongoose.model("user", userSchema);