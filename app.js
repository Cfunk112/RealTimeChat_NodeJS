
const express = require("express")
const app = express()
const mongoose= require('mongoose');
const bodyparser=require('body-parser');
const cookieParser=require('cookie-parser');
const db=require('./config/config').get(process.env.NODE_ENV);
const User = require('./models/user');
const {auth} = require('./auth/auth');


app.use(bodyparser.urlencoded({extended : false}));
app.use(bodyparser.json());
app.use(cookieParser());

app.set('view engine', 'ejs')
app.use(express.static('public'))

mongoose.Promise=global.Promise;
mongoose.connect(db.DATABASE,{ useNewUrlParser: true,useUnifiedTopology:true },function(err){
    if(err) console.log(err);
    console.log("mongoose database is connected");
});

app.get('/', (req, res)=> {
    res.render('index')
})

const server = app.listen(process.env.PORT || 3000, () => {
    console.log("server online")
})

app.post('/api/register', function(req, res) {
    const newuser = new User(req.body);

    if(newuser.password != newuser.password2) return res.status(400).json({auth : false, message : 'password does not match'});

    User.findOne({email:newuser.email}), function(err, user) {
        if(user) return res.status(400).json({ auth: false, message : "email already exists"});

        newuser.save((err, doc)=> {
            if(err) {console.log(err);
                return res.status(400).json({success : false});}
            
            res.status(200).json({
                success:true,
                user : doc
            });
        });
    }
});

app.post('/api/login', function(req,res){
    let token=req.cookies.auth;
    User.findByToken(token,(err,user)=>{
        if(err) return  res(err);
        if(user) return res.status(400).json({
            error :true,
            message:"You are already logged in"
        });
    
        else{
            User.findOne({'email':req.body.email},function(err,user){
                if(!user) return res.json({isAuth : false, message : ' Auth failed ,email not found'});
        
                user.comparepassword(req.body.password,(err,isMatch)=>{
                    if(!isMatch) return res.json({ isAuth : false,message : "password doesn't match"});
        
                user.generateToken((err,user)=>{
                    if(err) return res.status(400).send(err);
                    res.cookie('auth',user.token).json({
                        isAuth : true,
                        id : user._id
                        ,email : user.email
                    });
                });    
            });
          });
        }
    });
});


app.get('/api/profile', auth, function(req, res) {
    res.json({
        isAuth : true,
        id: req.user._id,
        email: req.user.email,
        name: req.user.firstname + req.user.lastname
    })

});


app.get('/api/logout', auth, function(req, res) {
    req.user.deleteToken(req.token, (err, user) => {
        if(err) return res.status(400).send(err);

        res.sendStatus(200);
    });
});

const io = require('socket.io')(server)

io.on('connection', (socket) => {
    console.log("New Connection")

    socket.username = "None"

    socket.on('change_username', data => {
        console.log('username update: ' + data.username)
        socket.username = data.username
    })

    socket.on('new_message', data => {
        console.log('new message: ' + data.message)
        io.sockets.emit('receive_message', {message: data.message, username: socket.username})
    })

    socket.on('typing', data => {
        socket.broadcast.emit('typing', {username: socket.username})
    })
})


