//Routes
// const responder = require('../models/Responder');

// session --------------------------------------------------------------------------
const session = require('express-session');
const express = require('express');
const server = express();

// body-parser ----------------------------------------------------------------------
const bodyParser = require('body-parser');
// npm install body-parser
// Assuming 'server' is your Express application instance
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

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
mongoose.connect('mongodb+srv://ccapdev:group23@cluster0.y2gde1s.mongodb.net/tastetalks');

const profileSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String },
  password: { type: String },
  isOwner: { type: Boolean }
},{ versionKey: false }); //defaukt field added for 
const profileModel = mongoose.model('profile', profileSchema);

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  highlight: { type: String, required: true },
  reviews: [{
      username: { type: String, required: true },
      content: { type: String, required: true },
      helpful: { type: Boolean, required: false},
      response: { type: String, required: false}
  }]
});
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// our functions ---------------------------------------------------------------------
function deleteReview(reviewId) {
  if (confirm("Are you sure you want to delete this review?")) {
      // If user confirms deletion, make an AJAX request to delete the review
      fetch('/delete_review', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reviewId: reviewId })
      })
      .then(response => {
          if (response.ok) {
              // If deletion is successful, redirect the user to the home page
              window.location.href = '/view_home';
          } else {
              // If there's an error, display an error message
              console.error('Error deleting review:', response.statusText);
              alert('Error deleting review. Please try again.');
          }
      })
      .catch(error => {
          console.error('Error deleting review:', error);
          alert('Error deleting review. Please try again.');
      });
  }
}



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
  const colResto = dbo.collection("restaurants");

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
          if(val.isOwner) {
            colResto.findOne({ name: val.ownedResto }).then(function(restaurant){
              resp.render('owner-resto',{
                layout: 'index',
                title: 'Your Restaurant',
                pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
                restaurant
              });
            });
          } else resp.redirect('/view_home');
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

    if(req.session.user.isOwner) {
      col.findOne({ name: req.session.user.ownedResto }).then(function(restaurant){
        resp.render('owner-resto',{
          layout: 'index',
          title: 'Your Restaurant',
          pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
          restaurant
        });
      });
    } else {
      resp.render('main',{
        layout: 'index',
        title:  'Home - TasteTalks', 
        pageStyles: '<link rel="stylesheet" href="/common/main-styles.css">',
        'restaurants': vals
      });
    }
  }).catch(errorFn);
});

// individual resto pages ----------------------------------------------------------
server.get('/view_resto', async function(req, resp) {
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("restaurants");

  const restaurantId = req.query.restaurantId;

  try {
    // Find the restaurant by its name
    const restaurant = await col.findOne({ name: restaurantId });

    if (!restaurant) {
      return resp.status(404).json({ message: 'Restaurant not found' });
    }

    console.log('List successful');

    // Sort the reviews array by date in descending order to get the most recent review first
    restaurant.reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render the 'resto' template with the updated restaurant data
    resp.render('resto', {
      layout: 'index',
      title: restaurantId + ' - TasteTalks',
      pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
      restaurant: restaurant
    });

  } catch (error) {
    console.error('Error fetching restaurant:', error);
    // Handle error appropriately, maybe render an error page
    resp.status(500).send('Error fetching restaurant');
  }
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

      // Redirect the user to the reviews page after successfully submitting the review
      return resp.redirect('/view_home');
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

// add comment ----------------------------------------------------------------------------
// Route to handle fetching comments for a review
server.get('/get_comments', async (req, res) => {
  try {
    // Ensure that the user is authenticated before proceeding
    const username = req.session.username; // Assuming you have session middleware set up

    if (!username) {
      return res.status(401).send('Unauthorized');
    }

    // Extract the review ID from the request query
    const reviewId = req.query.reviewId;

    // Find the review by its ID
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    // Extract comments from the review
    const comments = review.comments;

    // Send the comments back to the client
    return res.status(200).json({ comments: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// submit add comment ---------------------------------------------------------------------
// Route to handle adding comments
server.post('/add_comment', async (req, res) => {
  try {
      const dbo = mongoClient.db(databaseName);
      const col = dbo.collection('restaurants');
    
      const { restaurantId, reviewContent, comment } = req.body;
      console.log(reviewContent + comment);

      /* Find the restaurant by review ID and update the response/comment in the corresponding review
      const updatedRestaurant = await Restaurant.findOneAndUpdate(
          { name: restaurantId }, // Find restaurant with review ID
          { $set: { 'reviews.$.response': comment } }, // Update response in the matching review
          { new: true } // Return the updated document
      );

      if (!updatedRestaurant) {
          return res.status(404).send('Restaurant or review not found');
      } */

      col.findOne({ name: restaurantId }).then(function(restaurant) {
        const reviewIndex = restaurant.reviews.findIndex(review => review.content == reviewContent);
  
        restaurant.reviews[reviewIndex].response = comment;
  
        col.updateOne({ name: restaurantId }, { $set: { reviews: restaurant.reviews } });
  
        console.log('Response added successfully: ' + restaurant.reviews[reviewIndex].response);
  
        return res.render('owner-resto',{
          layout: 'index',
          title: 'Your Restaurant',
          pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
          restaurant
        });
      }).catch(errorFn);

      //return res.status(200).send('Comment failed successfully');
  } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).send('Internal Server Error');
  }
});

// submit edit review ---------------------------------------------------------------------
server.post('/submit_edited_review', async function(req, resp) {
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection('restaurants');

  const { restaurant_name, content, reviewIndex, reviewId, reviewer } = req.body;

  if (req.body.action === 'edit') { //--------------------------------
    try {
      const restaurant = await col.findOne({ name: restaurant_name });

      if (!restaurant) {
        return resp.status(404).json({ message: 'Restaurant not found' });
      }

      // Ensure the reviewIndex is a valid index within the reviews array
      if (reviewIndex < 0 || reviewIndex >= restaurant.reviews.length) {
        return resp.status(400).json({ message: 'Invalid review index' });
      }

      // Check if the review was authored by the logged-in user
      const loggedInUsername = req.session.user.username;
      const reviewUsername = restaurant.reviews[reviewIndex].username;

      if (loggedInUsername !== reviewUsername) {
        return resp.status(403).json({ message: 'You are not authorized to edit this review' });
      }

      restaurant.reviews[reviewIndex].content = content;

      await col.updateOne({ name: restaurant_name }, { $set: { reviews: restaurant.reviews } });

      console.log('Review updated successfully');

      return resp.redirect(`/view_resto?restaurantId=${restaurant_name}`);
    } catch (error) {
      console.error('Error updating review:', error);
      return resp.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.body.action === 'delete') { //--------------------------------
    col.findOne({ name: restaurant_name }).then(async function(restaurant) {
      console.log(restaurant.reviews[reviewIndex].content);
      let revs = restaurant.reviews.filter(review => review.content != content);

      await col.updateOne({ name: restaurant_name }, { $set: { reviews: revs } });

      console.log('Review deleted successfully');
      return resp.redirect(`/view_resto?restaurantId=${restaurant_name}`);
   }).catch(errorFn);  
  }
});

// mark review helpful ---------------------------------------------------------------
server.post('/mark_helpful', function(req, resp) {
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection('restaurants');

  const restaurantId = req.body.restaurantId;
  const reviewContent = req.body.reviewContent;
  const isHelpful = req.body.helpful;

    col.findOne({ name: restaurantId }).then(function(restaurant) {
      const reviewIndex = restaurant.reviews.findIndex(review => review.content == reviewContent);

      console.log(restaurant.reviews[reviewIndex].helpful);
      console.log(isHelpful);
      if(isHelpful=="true")
        restaurant.reviews[reviewIndex].helpful = true;
      else restaurant.reviews[reviewIndex].helpful = false;

      col.updateOne({ name: restaurantId }, { $set: { reviews: restaurant.reviews } });

      console.log('Review updated successfully: ' + restaurant.reviews[reviewIndex].helpful);

      resp.render('owner-resto',{
        layout: 'index',
        title: 'Your Restaurant',
        pageStyles: '<link rel="stylesheet" href="/common/resto-styles.css">',
        restaurant
      });
    }).catch(errorFn);
});


// profile page -------------------------------------------------------------------
server.get('/view_profile', function(req, resp){
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  /* Check if user session exists and contains user information
  if (!req.session || !req.session.user || !req.session.user.username) {
    // Redirect the user to the login page or handle it appropriately
    resp.redirect('/login');
    return;
  } */

  // Retrieve user information from session
  const loggedInUsername = req.session.user.username;

  // Find the user's profile data based on the logged-in user's username
  col.findOne({ username: loggedInUsername })
     .then(function(userProfile) {
        if (!userProfile) {
          // If user profile is not found, handle it appropriately
          console.error('User profile not found');
          resp.status(404).send('User profile not found');
          return;
        }

        // Render the profile page with the user data
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
// submit edit review
server.post('/edit_profile', function(req, resp) {
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  const loggedInUser = req.session.user;

  // Retrieve updated profile information from the request body
  const updatedProfileData = req.body;

  // Update the user's profile data in the database
  col.updateOne({ username: loggedInUser.username }, { $set: updatedProfileData })
     .then(function(result) {
        if (result.modifiedCount > 0) {
          console.log('Profile updated successfully');

          // Update the session with the new username if it's changed
          if (updatedProfileData.username) {
            req.session.user.username = updatedProfileData.username;
          }

          // Redirect the user to the view profile page after successful update
          resp.redirect('/view_profile');
        } else {
          console.log('No profile updated');
          // Handle appropriately, maybe render an error page or redirect back to edit page
          resp.status(500).send('Failed to update profile');
        }
     })
     .catch(function(err) {
        console.error('Error updating user profile:', err);
        // Handle error appropriately, maybe render an error page
        resp.status(500).send('Error updating user profile');
     });
});

/* delete review ---------------------------------------------------------------------
server.get('/delete_review', function(req, res) {
  const { restaurant_name, reviewId } = req.body;

  // Assuming you're using Mongoose for MongoDB interaction
  Review.findByIdAndDelete(reviewId, function(err, deletedReview) {
      if (err) {
          console.error('Error deleting review:', err);
          // Handle error appropriately, maybe render an error page
          res.status(500).send('Error deleting review');
          return;
      }

      console.log('Review deleted successfully');
      // Redirect the user to a relevant page after deletion
      res.redirect('/view_home');
  });
});

// submit delete review --------------------------------------------------------------
server.post('/delete-review', (req, res) => {
  const restaurantName = req.params.restaurantName;
  const username = req.params.username;

  // Find the restaurant by name
  const restaurant = restaurants.find(r => r.name === restaurantName);

  if (!restaurant) {
      return res.status(404).send('Restaurant not found');
  }

  // Find the index of the review to delete
  const reviewIndex = restaurant.reviews.findIndex(review => review.username === username);

  if (reviewIndex === -1) {
      return res.status(404).send('Review not found');
  }

  // Remove the review from the reviews array
  restaurant.reviews.splice(reviewIndex, 1);

  // Respond with a success message
  res.send('Review deleted successfully');
});

/* server.post('/delete_review', function(req, res) {
  const reviewId = req.body.reviewId;

  // Assuming you're using Mongoose for MongoDB interaction
  Review.findByIdAndDelete(reviewId, function(err, deletedReview) {
      if (err) {
          console.error('Error deleting review:', err);
          // Handle error appropriately, maybe render an error page
          res.status(500).send('Error deleting review');
          return;
      }

      if (!deletedReview) {
          console.error('Review not found');
          // Handle case where review with the given ID was not found
          res.status(404).send('Review not found');
          return;
      }

      console.log('Review deleted successfully');
      // Redirect the user to a relevant page after deletion
      res.redirect('/view_home');
  });
}); */

// change password page ------------------------------------------------------------
/*server.get('/change_password', function(req, resp){
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
});*/
server.get('/change_password', function(req, resp){
  // Retrieve the logged-in user's information from the session
  const loggedInUser = req.session.user;

  if (!loggedInUser) {
    // If the user is not logged in, redirect them to the login page or handle it appropriately
    resp.redirect('/login');
    return;
  }

  // Connect to the database
  const dbo = mongoClient.db(databaseName);
  const col = dbo.collection("profiles");

  // Find the user's profile data based on the logged-in user's username
  col.findOne({ username: loggedInUser.username })
     .then(function(userProfile) {
        console.log('Profile found successfully'); 
        resp.render('change-password', {
          layout: 'index',
          title: 'Edit password - TasteTalks',
          pageStyles: '<link rel="stylesheet" href="/common/change-password-styles.css">',
          user: userProfile
        });
     })
     .catch(function(err) {
        console.error('Error retrieving user profile:', err);
        // Handle error appropriately, maybe render an error page
        resp.status(500).send('Error retrieving user profile');
     });
});


// submit change password ---------------------------------------------------------
server.post('/change_password', function(req, resp) {
  // Retrieve the logged-in user's information from the session
  const loggedInUser = req.session.user;

  if (!loggedInUser) {
    // If the user is not logged in, redirect them to the login page or handle it appropriately
    resp.redirect('/login');
    return;
  }

  // Extract new password from the form submission
  const newPassword = req.body.newPassword;

  // Hash the new password
  bcrypt.hash(newPassword, 10, function(err, hashedPassword) {
    if (err) {
      console.error('Error hashing password:', err);
      resp.status(500).send('Error updating password');
      return;
    }

    // Connect to the database
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection("profiles");

    // Update the user's password in the database with the hashed password
    col.updateOne({ username: loggedInUser.username }, { $set: { password: hashedPassword } })
       .then(function(result) {
          if (result.modifiedCount > 0) {
            console.log('Password updated successfully');
            // Redirect the user to a success page or the view profile page
            resp.redirect('/view_profile');
          } else {
            console.log('No password updated');
            // Handle appropriately, maybe render an error page or redirect back to change password page
            resp.status(500).send('Failed to update password');
          }
       })
       .catch(function(err) {
          console.error('Error updating user password:', err);
          // Handle error appropriately, maybe render an error page
          resp.status(500).send('Error updating user password');
       });
  });
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

const port = process.env.PORT | 8080;
server.listen(port, function(){
    console.log('Listening at port '+port);
});


} //=======================================================================================================

module.exports.add = add;

//Note: There are other ways to declare routes. Another way is to
//      use a structure called router. It would look like this:
//      const router = express.Router()
