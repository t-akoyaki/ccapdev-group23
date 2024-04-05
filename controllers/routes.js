//Routes
// const responder = require('../models/Responder');

//
const session = require('express-session');
const express = require('express');
const server = express();



// mongodb ---------------------------------------------------------------------------
const { MongoClient } = require('mongodb');
const databaseURL = "mongodb+srv://ccapdev:group23@cluster0.y2gde1s.mongodb.net/";
const mongoClient = new MongoClient(databaseURL); //client instance

const databaseName = "tastetalks"; //like schema 'survey'
const coll1 = "restaurants"; //like tables 'respondents'

// generic functions -----------------------------------------------------------------
function errorFn(err){
    console.log('Error fond. Please trace!');
    console.error(err);
}
function successFn(res){
    console.log('Database query successful!');
} 

// connect to client -----------------------------------------------------------------
mongoClient.connect().then(function(con){
  console.log("Attempt to create!");
  const dbo = mongoClient.db(databaseName);
  dbo.createCollection("restaurants")
    .then(successFn).catch(errorFn);
  dbo.createCollection("profiles")
    .then(successFn).catch(errorFn);
}).catch(errorFn); 

// bcrypt ----------------------------------------------------------------------------
const bcrypt = require('bcrypt');

// mongoose --------------------------------------------------------------------------
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://ccapdev:tastetalks@cluster0.y2gde1s.mongodb.net/tastetalks');

const profileSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String },
  password: { type: String }
},{ versionKey: false }); //defaukt field added for 
const profileModel = mongoose.model('profile', profileSchema);

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  highlight: { type: String, required: true },
  reviews: [{
      username: { type: String, required: true },
      content: { type: String, required: true }
  }]
});
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// our functions ---------------------------------------------------------------------



function add(server){ //===================================================================================

// when opening site -----------------------------------------------------------------
server.get('/', function(req, resp){
  resp.render('login',{
    layout: 'index',
    title: 'Login to TasteTalks',
    pageStyles: '<link href="/common/login-styles.css" rel="stylesheet" />'
  });
});

// check login (to home page) --------------------------------------------------------

// Session middleware setup
server.use(session({
  secret: 'your-secret-key', // Change this to a random string
  resave: false,
  saveUninitialized: false
}));

server.post('/submit_login', function(req, resp){
  const name = req.body.username;
  const pass = req.body.password;
  
  const dbo = mongoClient.db(databaseName);
  const colProfile = dbo.collection("profiles");

  const searchQuery = { username: name };
  
  colProfile.findOne(searchQuery).then(function(val){

    if(val !== null){

      console.log('account found');
      console.log('input: ' + pass + '; password: ' + val.password)

      bcrypt.compare(pass, val.password, function(err, result) {
        if (!err && result) {
          // Store user session upon successful login
          req.session.user = val;
          
          // Redirect user to main page after successful login
          resp.redirect('/view_home');
        } else {
          resp.render('login',{
            layout: 'index',
            title: 'Login to TasteTalks',
            pageStyles: '<link href="/common/login-styles.css" rel="stylesheet" />'
          });
          console.log('error searching for account - password mismatch');
        }
      });
    } else {
      resp.render('login',{
        layout: 'index',
        title: 'Login to TasteTalks',
        pageStyles: '<link href="/common/login-styles.css" rel="stylesheet" />'
      });
      console.log('error searching for account - username not found');
    } 
  }).catch(errorFn);
});

// register -------------------------------------------------------------------------
server.get('/register', function(req, resp){
  resp.render('register',{
    layout: 'index',
    title:  'Register for TasteTalks',
    pageStyles: '<link rel="stylesheet" href="/common/register-styles.css">',
  }); 
});

// submit registration ---------------------------------------------------------------
server.post('/submit_registration', function(req, resp){
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confPass = req.body.confirmPassword
  const dbo = mongoClient.db(databaseName);
  
  if(password == confPass) {

    const saltRounds = 10;
    var profileInstance;

    bcrypt.hash(password, saltRounds, function(err, hash) {
      profileInstance = profileModel({
        username: username, email: email, password: hash
      });

      profileInstance.save().then(function(action) {
        /* resp.send({
          player: player, location: location, img: images[0].img
        }); */
        const colResto = dbo.collection("restaurants");
        const cursor = colResto.find();
        cursor.toArray().then(function(vals){
          console.log('List successful');
          resp.render('main',{
            layout: 'index',
            title:  'Home - TasteTalks', 
            pageStyles: '<link rel="stylesheet" href="/common/main-styles.css">',
            'restaurants': vals
          });
        }).catch(errorFn);
      }).catch(errorFn);
    });
    
  } else {
    resp.render('register',{
      layout: 'index',
      title:  'Register for TasteTalks',
      pageStyles: '<link rel="stylesheet" href="/common/register-styles.css">',
    }); 
    console.log('error: passwords do not match');
  }
});

//home page ------------------------------------------------------------------------
server.get('/view_home', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("restaurants");
  
  const cursor = col.find();
  cursor.toArray().then(function(vals){
    console.log('List successful');
    resp.render('main',{
      layout: 'index',
      title:  'Home - TasteTalks', 
      pageStyles: '<link rel="stylesheet" href="/common/main-styles.css">',
      'restaurants': vals
    });
  }).catch(errorFn);
});

// individual resto pages ----------------------------------------------------------
server.get('/view_resto', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("restaurants");

  const restaurantId = req.query.restaurantId;
  const searchQuery = { name: restaurantId };
  
  col.findOne(searchQuery).then(function(vals){
    console.log('List successful'); 

    resp.render('resto',{
      layout: 'index',
      title:  restaurantId+' - TasteTalks',
      pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
      restaurant:  vals
    } );
  }).catch(errorFn);
});

// add review page ------------------------------------------------------------------
server.get('/add_review', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("restaurants");

  const restaurantId = req.query.restaurantId;
  const searchQuery = { name: restaurantId };
  
  col.findOne(searchQuery).then(function(vals){
    console.log('List successful'); 
    const loggedInUser = req.session.user;
    
    col.findOne({ username: loggedInUser.username }).then(function(userProfile) {
      resp.render('review',{
        layout: 'index',
        title:  'Review '+restaurantId+' - TasteTalks',
        pageStyles: '<link rel="stylesheet" href="/common/review-styles.css">',
        restaurant:  vals,
        profile: userProfile
      });
    });

  }).catch(errorFn);
});

// submit review ---------------------------------------------------------------------
server.post('/submit_review', async function(req, resp) {
  // Static restaurant name
  const restaurantName = req.body.restaurant_name;

  // Getting info from the request body
  const loggedInUser = req.session.user;
  const { content, anon } = req.body;

  try {
      // Find the restaurant by its name
      const restaurant = await Restaurant.findOne({ name: restaurantName });

      if (!restaurant) {
          return resp.status(404).json({ message: 'Restaurant not found' });
      }

      let reviewerName = loggedInUser.username;

      if (anon && anon === 'on') {
        reviewerName = 'Anonymous';
      }

      // Push the new review to the reviews array of the restaurant
      restaurant.reviews.push({ 
          username: reviewerName,
          content
      });

      // Save the updated restaurant document
      const savedRestaurant = await restaurant.save();

        // Check if the restaurant was saved successfully
        if (!savedRestaurant) {
        return resp.status(500).json({ message: 'Error saving restaurant' });
      }

      // Respond with success message and updated restaurant document
      return resp.status(201).json({ message: 'Review added successfully', restaurant });
  } catch (error) {
      console.error('Error adding review:', error);
      return resp.status(500).json({ message: 'Internal server error' });
  }
}); 

// edit review page ------------------------------------------------------------------
server.get('/edit_review', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("restaurants");

  const restaurantId = req.query.restaurantId;
  const searchQuery = { name: restaurantId };
  
  col.findOne(searchQuery).then(function(vals){
    console.log('List successful'); 
    const loggedInUser = req.session.user;
    
    col.findOne({ username: loggedInUser.username }).then(function(userProfile) {
          
      const review = vals.reviews.find(review => review.username == loggedInUser.username);
      const reviewIndex = vals.reviews.findIndex(review => review.username == loggedInUser.username);

        resp.render('edit-review',{
          layout: 'index',
          title:  'Edit review for '+restaurantId+' - TasteTalks',
          pageStyles: '<link rel="stylesheet" href="/common/review-styles.css">',
          restaurant:  vals,
          profile: userProfile,
          review,
          reviewIndex
        });

    });

  }).catch(errorFn);
});

// submit edit review ---------------------------------------------------------------------
server.post('/submit_edited_review', async function(req, resp) {
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection('restaurants');

  const { restaurant_name, content, reviewIndex } = req.body;

  col.findOne({ name: restaurant_name }).then(function(vals){
      vals.reviews[reviewIndex].content = content;

      col.updateOne({ name: restaurant_name }, { $set: { reviews: vals.reviews } });

      console.log('Review updated successfully');
  }).catch(errorFn);
}); 

// profile page -------------------------------------------------------------------
server.get('/view_profile', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  // Retrieve user information from session
  const loggedInUser = req.session.user;

  // Find the user's profile data based on the logged-in user's ID
  col.findOne({ username: loggedInUser.username })
     .then(function(userProfile) {
        // Render the profile page with the updated user data
        resp.render('profile-page', {
          layout: 'index',
          title: 'Profile - TasteTalks',
          pageStyles: '<link rel="stylesheet" href="/common/profile-styles.css">',
          user: userProfile
        });
     })
     .catch(function(err) {
        console.error('Error retrieving user profile:', err);
        // Handle error appropriately, maybe render an error page
        resp.status(500).send('Error retrieving user profile');
     });
});


// edit profile page ---------------------------------------------------------------
server.get('/edit_profile', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  const loggedInUser = req.session.user; 
  
  col.findOne({ username: loggedInUser.username }).then(function(vals){
    console.log('List successful'); 
    resp.render('edit-profile',{
      layout: 'index',
      title:  'Edit profile - TasteTalks',
      pageStyles: '<link rel="stylesheet" href="/common/edit-profile-styles.css">',
      user:  vals
    } );
  }).catch(errorFn);
});

// change password page ------------------------------------------------------------
server.get('/change_password', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  //const restaurantId = req.query.restaurantId;
  const searchQuery = { username: 'admin' }; 
  
  col.findOne(searchQuery).then(function(vals){
    console.log('List successful'); 
    resp.render('change-password',{
      layout: 'index',
      title:  'Edit password - TasteTalks',
      pageStyles: '<link rel="stylesheet" href="/common/change-password-styles.css">',
      user:  vals
    } );
  }).catch(errorFn);
});

/*references below =================================================================

server.post('/add-entry', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection(collectionName);

  const info = {
    name: req.body.name,
    age: req.body.age,
    email: req.body.email,
    fav_color: req.body.fav_color,
    active: 'true'
  };
  
  col.insertOne(info).then(function(res){
    resp.render('result',{
      layout: 'index',
      title:  'Result page',
      msg:  'User created successfully'
    });
  }).catch(errorFn);
});
*/

function finalClose(){
    console.log('Close connection at the end!');
    mongoClient.close();
    process.exit();
}

process.on('SIGTERM',finalClose);  //general termination signal
process.on('SIGINT',finalClose);   //catches when ctrl + c is used
process.on('SIGQUIT', finalClose); //catches other termination commands

const port = process.env.PORT | 9090;
server.listen(port, function(){
    console.log('Listening at port '+port);
});


} //=======================================================================================================

module.exports.add = add;

//Note: There are other ways to declare routes. Another way is to
//      use a structure called router. It would look like this:
//      const router = express.Router()
