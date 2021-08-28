const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
    phone: {
        type: String,
    },
    email: {
        type: String
    },
    code: {
        type: String,
        minLength: 4,
        maxLength: 4
    },
    createdAt: {
        type: Date,
        expires: '5m',
        default: Date.now
    },
    revision: {
        type: Number,
        default: 1
    }
});

alertSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        delete ret._id
    }
});

module.exports = mongoose.model("alert", alertSchema);