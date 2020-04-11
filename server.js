// $ npm run package-win  
//import '/dist/css/grapes.min.css';
// If you need plugins, put them below the main grapesjs script
// import 'grapesjs-some-plugin';
const socketport = 8081;
const httpport = 8080;
const lanport = 5001;
const localport = 5002;
const open = require('open');
var express = require('express')
var app = express()
const mongoose = require('mongoose')
var cors = require('cors')
var bodyParser = require('body-parser')
var osc = require('osc');
//BRIDGE Between Client and Server
var io = require('socket.io')(socketport);
var ipLibrary = require('ip');
var serverIP = ipLibrary.address() // my ip address
var path = require('path');
const passport = require('passport')
const session = require('express-session')
var BSON = require("bson");


//Passport config
require('./config/passport')(passport);
//DB
const db = require("./config/keys").MongoURI;

//Connect to Mongo
mongoose.connect(db, { useNewUrlParser: true })
.then(()=> console.log('MongoDB Connected'))
.catch(err => console.log(err));

//User model
const OscarFile = require('./models/OscarFile')

//EJS
app.set('views', path.join(__dirname, '/public'));
app.set('view engine', 'ejs')



//app.use(cors())
app.use(cors({ credentials: true, origin: 'http://localhost:' + httpport }));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Express Session
app.use(session({
    secret: 'oscarsecret',
    resave: true,
    saveUninitialized: true,
  }))
//After session it goes Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

var code;
var store = {};
//Connection between Server and App to be controlled
var oscConnections = [];
var isConnected = [];

var udpPortGlobal = new osc.UDPPort({
	localAddress: serverIP,
	localPort: localport,
	metadata: true,
});
udpPortGlobal.open()


//Localhost
var udpPortLocal = new osc.UDPPort({
	localAddress: "localhost",
	localPort: lanport,
	metadata: true,
});
udpPortLocal.open()

//Send OSC Message over UDP
function sendOSCMessage(clientIP, ip, port, addressp, type, value) {
	var msg = {
		address: addressp,
		args: [
			{
				type: type,
				value: value
			}
		]
	};
	console.log("Sending message", msg.address, msg.args, "to", ip + ":" + port);

	if (ip == "localhost") {
		//ip = clientIP;
		try {
			udpPortLocal.send(msg, ip, port);
		} catch (err) {
			console.log("chatching this error")
			console.log("ERROR: ", err)
		}
	}
	else {
		try {
			udpPortGlobal.send(msg, ip, port);
		} catch (err) {
			console.log("chatching this error")
			console.log("ERROR: ", err)
		}
	}
}
io.sockets.on('connection', function (socket) {
	console.log('Web sockect is connected between OSCAR and Local Server');
	// socket.on("config", function (obj) {
	// 	console.log("Receive Config: ", obj.client.host, obj.client.port)
	// 	var device = { ip: obj.client.host, port: obj.client.port }
	// 	oscConnections.push(device);
	// 	isConnected.push(true);
	// })
	socket.on("message", function (clientIP, ip, port, addressp, type, value) {
		try {
			sendOSCMessage(clientIP, ip, port, addressp, type, value);
		}
		catch (err) {
			console.log("ERROR: ", err)
		}
	});
	socket.on("code", function (obj) {
		code = obj;
	});
})


//User Global
app.get('*', function(req, res, next){
    res.locals.user = req.user || null;
    next();
});
// Register Handle
app.post('/store', (req, res) => {
	
	const name  = req.body.name;
	const content = req.body;
	const size =  BSON.calculateObjectSize(content);

    let errors = [];

    //Check required fields
    if(!name || !content ){
        errors.push({ msg: "Data is incomplete"});
    }
    if(errors.length > 0){
		console.log('Data is incomplete')
        res.render('save', {
            errors
        });
    }else{
        //Validation passed
        OscarFile.findOne({ name: name})
        .then(file => {
            // if(file){
            //     //User exists
            //     errors.push({msg: "There is a file with the same name"})
            //     res.render('save', {
            //         errors
            //     });
            // }else{
                const newFile = new OscarFile({
					name,
					content,
					size				})
				newFile.save()
            //}
        });
    }
})
app.get('/load/:name', function (req, res) {
	console.log(req.params.name)
	OscarFile.findOne({ name: req.params.name})
	.then(file => {
		if(file){
			//User exists
			console.log('file exists')
			res.send(file.content);
		}
	});
})
app.get('/', function (req, res) {
	res.render('index');
})
app.get('/loggedin', function (req, res) {
	res.locals.user?res.send(true):res.send(false)
})
app.get('/preview', function (req, res) {
	res.sendfile(__dirname + '/public/preview.html');
})
app.get('/dom', function (req, res) {
	console.log("Requesting DOM", code)
	res.send(code)
})
app.get('/ipserver', function (req, res) {
	res.send(serverIP)
})

//Login Handle
app.post('/login', function(req, res, next) {
	console.log('logginin')
    let errors = [];
    const { email, password} = req.body;
        //Check required fields
        if(!email || !password){
            errors.push({ msg: "Please fill in all fields"});
            res.render('login', {
                errors
            });
        }else{
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { 
        req.flash('error_msg', 'Credentials are Incorrect')  
        return res.redirect('/users/login'); }
      req.logIn(user, function(err) {
        if (err) { 
			console.log(err)
            //req.flash('error_msg', 'Credentials are Incorrect')  
            return next(err); 
			}
			console.log("si")
		return res.send({});
      });
    })(req, res, next);
}
  });
//LogIn Handle
app.get('/login', (req, res) =>{
	res.render('index');
})
//LogOut Handle
app.get('/logout', (req, res) =>{
    req.logout();
	res.send({})
})


app.listen(httpport, function () {
	console.log("Open any browser connected to the same network on: ", "http://"+serverIP+":"+httpport)
	open("http://"+serverIP+":"+httpport);
})





