//Install Command:
//npm init
//npm i express express-handlebars body-parser mongodb mongoose bcrypt express-session

const express = require('express');
const server = express();

const bodyParser = require('body-parser');
server.use(express.json()); 
server.use(express.urlencoded({ extended: true }));

const handlebars = require('express-handlebars');
server.set('view engine', 'hbs');
server.engine('hbs', handlebars.engine({
    extname: 'hbs',
}));

//const mongoose = require('mongoose');
//mongoose.connect('mongodb://127.0.0.1:27017/tastetalks');

/* Session middleware setup 
server.use(session({
  secret: 'your-secret-key', // Change this to a random string
  resave: false,
  saveUninitialized: false
})); */

server.use(express.static('public'));

//This part of the code will load the controllers that will interact
//with the rest of the system.
const controllers = ['routes'];
for(var i=0; i<controllers.length; i++){
  const model = require('./controllers/'+controllers[i]);
  model.add(server);
}

const port = process.env.PORT | 8888;
server.listen(port, function(){
  console.log('Listening at port '+port);
});


/*
const saltRounds = 10;
var default_pass = "password";
var encrypted_pass = "";

//When a password is saved into the database, it should not be in
//plain text. It should always be hashed.
bcrypt.hash(default_pass, saltRounds, function(err, hash) {
    encrypted_pass = hash;
    console.log(default_pass + ": "+encrypted_pass);
});
*/
