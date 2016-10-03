var express = require('express'),
	path = require('path'),
	config = require('./config/config.js'),
	fs = require('fs'),
    os = require('os'),
    shelljs = require('shelljs/global'),
    PythonShell = require('python-shell'),
    ejs = require('ejs')
    


var app = express();

var scriptPath = path.join(__dirname,'scripts')
//Set views property
app.set('views',path.join(__dirname,'views'));

//Set it as View engine
app.set('view engine','html');

//set Template engine
app.engine('html',ejs.renderFile);


//Set Static public folder
app.use('/ngStatic',express.static(path.join(__dirname,'public')));

//Set Port to run the app
app.set('port',process.env.PORT||3000);

//Setting config
app.set('host',config.host);


//Create server which listen app 
var server = require('http').createServer(app);

//Socket.io is invoked by passing server 
var io = require('socket.io')(server);

//Invokes routes.js
require('./routes/routes.js')(express,app,fs,os,io,PythonShell,scriptPath);


//Listen server
server.listen(app.get('port'),function(){
    console.log('Ngspice Simulator is running on port : '+app.get('port'));
})