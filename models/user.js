var mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const config=require('../config/config.js');
const salt=10;
require('dotenv').config();


const userSchema=mongoose.Schema({
    firstname:{
        type: String,
        required: true,
        maxlength: 100
    },
    lastname:{
        type: String,
        required: true,
        maxlength: 100
    },
    email:{
        type: String,
        required: true,
        trim: true,
        unique: 1
    },
    password:{
        type:String,
        required: true,
        minlength:8
    },
    password2:{
        type:String,
        required: true,
        minlength:8

    },
    token:{
        type: String
    }
});

userSchema.pre('save', function(next) {
    var user = this;
    try {
        if(user.isModified('password')) {
            bcrypt.genSalt(salt, function(err, salt) {
                if(err) return next(err);
                
                bcrypt.hash(user.password, salt, function(err, hash){
                    if(err) return next(err);
                    user.password = hash;
                    user.password2 = hash;
                    next();
                })
                
            })
        }
        else {
            next();
        }
    } catch (error) {
        console.log(err);
        next();
    }
    
});


userSchema.methods.comparepassword = function(password, cb) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
        console.log(password);
        console.log(this.password);
        if(err) return cb(error);
        cb(null, isMatch);
    });
};

userSchema.methods.generateToken = function(cb){
    var user = this;
    var token = jwt.sign(user._id.toHexString(),config.get().SECRET)
    user.token = token;
    console.log("Generate token secret: " + config.get().SECRET);
    user.save(function(err, user){
        console.log(user);
        if(err) return cb(err);
        cb(null,user);
    });
};
        
userSchema.statics.findByToken = function(token, cb) {
    var user = this;
    console.log("findByToken user: " + token);
    jwt.verify(token, config.SECRET, function(err, decode) {
        console.log("made it into verify")
        console.log(user.findOne({"_id": decode, "token": token}));
        user.findOne({"token": token}, function(err, user) {
            if(err) return cb(err);
            cb(null, user);
        })
    })
};

userSchema.statics.deleteToken = function(token, cb) {
    var user = this;

    user.update({$unset : {token :1}}, function(err, user) {
        if(err) return cb(err);
        cb(null, user);
    })
};


module.exports=mongoose.model('User',userSchema);