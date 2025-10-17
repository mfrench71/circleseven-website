---
layout: post
title: "DAT602 - Face Login and User Authentication with Node.js Passport"
date: 2018-11-22 13:07:17 +0000
categories: DAT602 - Everyware Digital Art &amp; Technology
---

<!-- wp:paragraph -->
<p>In my previous post, I described the development of a web interface that used Javascript to access Microsoft's Cognitive Services Azure Face API. This interface allowed an image of a face to be captured via a web-cam and identified against a previously trained Person Group.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Now that this basic system is functioning as expected, I can use it as the basis for a Node.js/Express user authentication system using the popular Node package, <a href="http://www.passportjs.org/"><em>Passport</em></a>.</p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>Passport is authentication middleware for&nbsp;Node.js. Extremely flexible and modular, Passport can be unobtrusively dropped in to any&nbsp;Express-based web application. A comprehensive set of strategies support authentication using a&nbsp;username and password,&nbsp;Facebook,&nbsp;Twitter, and&nbsp;more.</p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph -->
<p>(Passport, no date)</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>How Face Login will Work</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Currently, Python scripts are used to do the work of creating and training the face recognition system which is accessible via Face API calls. These scripts also assign a name to each person trained. The face login system will replace the standard username/password web form by providing a web-cam preview and a login button.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":892,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_login_login_page.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_login_login_page.png" alt="" class="wp-image-892"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>I will be keeping the standard username/password login form but, behind the scenes, Javascript will be used to hide the form, populate both the username and password fields using the person's name as identified via the Python scripts, and finally submit the form.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":908,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_login_web_form.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_login_web_form.png" alt="" class="wp-image-908"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>The identified user's name/password will be authenticated against the details held in a Mongo database. If they match, the user will be taken to a profile page showing some of their account details.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Application Structure</strong></p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">- app
------ models
---------- user.js
------ routes.js

config
------ auth.js
------ database.js
------ passport.js
views
------ index.hbs
------ layout.hbs .
------ login.hbs
------ signup.hbs
------ profile.hbs
package.json
server.js</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The main file which runs the applications is the <code>server.js</code> file. It pulls in all the required modules and configuration files:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// require modules
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// load config variables
var configDB = require('./config/database');
var config = require('./config/auth');

// connect to database
// mongoose.connect(configDB.url); (deprecated)
var promise = mongoose.connect(configDB.url, {
useMongoClient: true,
});

require('./config/passport')(passport); // pass passport for configuration

// set up express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')) // serve static files

// Use Handlebars view engine
app.set('view engine', 'hbs');

// required for passport
app.use(session({
secret: 'dat602-secret', // session secret
resave: true,
saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use flash messaging

// routes
require('./app/routes.js')(app, passport, config); // load our routes and pass in our app and fully configured passport

// start app
app.listen(port);
console.log('Connected on port ' + port);</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The <code>routes.js</code> file will handle requests for the application's pages. The pages it needs to handle are:</p>
<!-- /wp:paragraph -->

<!-- wp:tablepress/table {"id":"1"} -->
[table id=1 /]
<!-- /wp:tablepress/table -->

<!-- wp:paragraph -->
<p>The code for <code>routes.js</code>:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">module.exports = function(app, passport) {

// home
app.get('/', function(req, res) {
    res.render('index.hbs', {
        user: req.user
    });
});

// profile
app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile.hbs', {
        user : req.user
    });
});

// logout
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// show the login form
app.get('/login', function(req, res) {
    res.render('login.hbs', { message: req.flash('loginMessage') });
});

// process the login form
app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

// show the signup form
app.get('/signup', function(req, res) {
    res.render('signup.hbs', { message: req.flash('signupMessage') });
});

// process the signup form
app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
if (req.isAuthenticated())
return next();

res.redirect('/');

}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The profile page is only accessible to logged in users, so route middleware is used.</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// profile
app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile.hbs', {
        user : req.user
    });
});</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The <code>isLoggedIn</code> function checks to see if the user accessing this route is logged and, if not, redirects them to the home page.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Views</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>For a user authentication system, the views are quite simple:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">- views
------ index.hbs
------ login.hbs
------ signup.hbs
------ profile.hbs</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>I have made use of the <a href="https://handlebarsjs.com/">Handlebars</a> view engine, which allows layout templates to be created, providing an easily maintainable and consistent site layout.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The <code>layout.hbs</code> file is the master page layout. It includes meta information, Bootstrap, Font Awesome, and JQuery via CDNs, and some conditional logic for displaying login/logout links, etc.</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"html"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="html" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;!doctype html>
&lt;html lang="en">
    &lt;head>
        &lt;!-- Required meta tags -->
        &lt;meta charset="utf-8">
        &lt;meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        &lt;!-- Bootstrap CSS -->
        &lt;link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
        &lt;link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.5.0/css/all.css">
        &lt;style>
            .starter-template {
                padding: 5rem 1.5rem;
            }
        &lt;/style>
        &lt;title>Face Login&lt;/title>
    &lt;/head>
    &lt;body>
        &lt;header>
            &lt;nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
                &lt;a class="navbar-brand" href="/">&lt;i class="far fa-grin-wink">&lt;/i> Face Login&lt;/a>
                &lt;button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
                &lt;span class="navbar-toggler-icon">&lt;/span>
                &lt;/button>
                &lt;div class="collapse navbar-collapse" id="navbarsExampleDefault">
                    &lt;ul class="navbar-nav mr-auto">
                        {{#unless user}}
                        &lt;li class="nav-item">
                            &lt;a class="nav-link" href="/login">Login&lt;/a>
                        &lt;/li>
                        &lt;li class="nav-item">
                            &lt;a class="nav-link" href="/signup">Signup&lt;/a>
                        &lt;/li>
                        {{/unless}}
                        {{#if user}}
                            &lt;li class="nav-item">
                                &lt;a class="nav-link" href="/profile">Profile&lt;/a>
                            &lt;/li>
                            &lt;li class="nav-item">
                                &lt;a class="nav-link" href="/logout">Logout&lt;/a>
                            &lt;/li>
                        {{/if}}
                    &lt;/ul>
                &lt;/div>
            &lt;/nav>
        &lt;/header>
        &lt;main role="main" class="container">
            &lt;div class="starter-template">
                {{#if message}}
                    &lt;div class="alert alert-danger">{{message}}&lt;/div>
                {{/if}}
                {{{ body }}}
            &lt;/div>
        &lt;/main>
        &lt;footer class="footer">
            &lt;div class="container">
                &lt;span class="text-muted">&lt;i class="far fa-grin-wink">&lt;/i> DAT602 - Face Login&lt;/span>
            &lt;/div>
        &lt;/footer>
        &lt;!-- Optional JavaScript -->
        &lt;!-- jQuery first, then Popper.js, then Bootstrap JS -->
        &lt;script src="https://code.jquery.com/jquery-3.3.1.min.js">&lt;/script>
        &lt;script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js">&lt;/script>
        &lt;script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js">&lt;/script>
    &lt;/body>
&lt;/html></pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The use of the <code>{{{body}}}</code> Handlebars code ensures that content from our views will be injected into the <code>layout.hbs</code> file in the appropriate place.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The code for <code>index.hbs</code> (Home page):</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"html"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="html" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;h1>&lt;i class="far fa-grin-wink mb-4">&lt;/i> Face Login&lt;/h1>

{{#unless user}}
  &lt;div class="row text-center">
      &lt;div class="col text-center my-auto">
          &lt;div class="card bg-secondary">
              &lt;div class="card-body align-items-center d-flex justify-content-center">
                  &lt;a href="/login" class="btn btn-lg btn-block btn-secondary">Login&lt;/a>
              &lt;/div>
          &lt;/div>
      &lt;/div>
      &lt;div class="col text-center my-auto">
          &lt;div class="card bg-secondary">
              &lt;div class="card-body align-items-center d-flex justify-content-center">
                  &lt;a href="/signup" class="btn btn-lg btn-block btn-secondary">Signup&lt;/a>
              &lt;/div>
          &lt;/div>
      &lt;/div>
  &lt;/div>
{{/unless}}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The code for <code>login.hbs</code> (Login page):</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"html"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="html" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;style>
    /* Hide login form elements */
    .form-group  {
        display: none; 
    }
    /* Preview styling */
    #viewport, #my\_camera {
        border: 1px solid silver;
        background-color: white;
    }
    #viewport {
        background: white url('camera-solid.svg') no-repeat center;
        background-size: 100px 100px;
    }
&lt;/style>
&lt;h1>&lt;i class="fas fa-sign-in-alt">&lt;/i> Login&lt;/h1>
&lt;div class="row text-center">
    &lt;div class="col text-center my-auto">
        &lt;div class="card bg-light">
            &lt;div class="card-body align-items-center d-flex justify-content-center">
                &lt;div id="my\_camera">&lt;/div>
            &lt;/div>
        &lt;/div>
    &lt;/div>
    &lt;div class="col text-center my-auto">
        &lt;div id="card" class="card bg-warning">
            &lt;div class="card-body align-items-center d-flex justify-content-center">
                &lt;canvas id="viewport" width="320" height="240">&lt;/canvas>
            &lt;/div>
        &lt;/div>
    &lt;/div>
&lt;/div>

&lt;!-- Login Form -->
&lt;form id="login" action="/login" method="post">
    &lt;div class="form-group">
        &lt;label>Username&lt;/label>
        &lt;input id="name" type="text" class="form-control" name="username">
    &lt;/div>
    &lt;div class="form-group">
        &lt;label>Password&lt;/label>
        &lt;input id="password" type="password" class="form-control" name="password">
    &lt;/div>
    &lt;input type=button class="btn btn-primary btn-lg mt-2" value="Login" onClick="take\_snapshot()">
&lt;/form>
&lt;script src="webcam.min.js">&lt;/script>
&lt;script src="javascript.js">&lt;/script></pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The <code>login.hbs</code> file includes two Javascript files which provide the functionality for the web-cam preview and the Face API calls. The <code>javascript.js</code> file was used in my previous post and has been amended slightly to automatically populate the login form's username and password fields and submit the form:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">function getName(personIdGlobal) {
var params = {
    'personGroupId': 'users',
    'personId': personIdGlobal
};

  $.get({
        url: "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/users/persons/" + personIdGlobal,
        headers: {
          'Ocp-Apim-Subscription-Key': 'XXXXX'
        },
  })
  .done(function(data) {
      $("#name").val(data.name);
      $("#password").val(data.name);
      $('form#login').submit();
  })
  .fail(function() {
      alert("error");
  });

}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:html -->
<form action="/signup" method="post">The code for&nbsp;<code>profile.hbs</code>&nbsp;(Profile page):
<p>&nbsp;</p>
<pre class="EnlighterJSRAW" data-enlighter-language="html">&lt;h1 class="mb-4"&gt;Profile Page&lt;/h1&gt;
&lt;div class="card"&gt;
    &lt;h5 class="card-header"&gt;{{user.local.username}}&lt;/h5&gt;
    &lt;div class="card-body"&gt;
        &lt;p class="card-text"&gt;ID: {{user.id}}&lt;/p&gt;
        &lt;p class="card-text"&gt;Password: {{user.local.password}}&lt;/p&gt;
    &lt;/div&gt;
&lt;/div&gt;</pre>
<p>The code for&nbsp;<code>signup.hbs</code>&nbsp;(Signup page):</p>
<pre class="EnlighterJSRAW" data-enlighter-language="html">&lt;h1&gt;&lt;i class="fas fa-user-plus mb-4"&gt;&lt;/i&gt; Signup&lt;/h1&gt;
&lt;!-- Signup Form --&gt;
&lt;form action="/signup" method="post"&gt;
  &lt;div class="input-group mb-4"&gt;
    &lt;div class="input-group-prepend"&gt;
      &lt;div class="input-group-text"&gt;&lt;i class="fas fa-user"&gt;&lt;/i&gt;&lt;/div&gt;
    &lt;/div&gt;
    &lt;input type="text" class="form-control form-control-lg" placeholder="Username" name="username"&gt;
  &lt;/div&gt;
  &lt;div class="input-group mb-4"&gt;
    &lt;div class="input-group-prepend"&gt;
      &lt;div class="input-group-text"&gt;&lt;i class="fas fa-lock"&gt;&lt;/i&gt;&lt;/div&gt;
    &lt;/div&gt;
    &lt;input type="password" class="form-control form-control-lg" placeholder="Password" name="password"&gt;
  &lt;/div&gt;
  
  &lt;button type="submit" class="btn btn-secondary btn-lg"&gt;Signup&lt;/button&gt;
&lt;/form&gt;</pre>
<p><strong>User Authentication with Passport</strong></p>
</form>
<!-- /wp:html -->

<!-- wp:paragraph -->
<p>Each user will have their username and password stored in a Mongo database. A user model will be required. This model defines the schema that will be used to store the information, as well as a number of methods related to users, such as hashing their password.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The code for the user model looks like:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// require modules
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({

local            : {
    username     : String,
    password     : String
}

});

// method to generate a hash
userSchema.methods.generateHash = function(password) {
return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// method to check if password is valid
userSchema.methods.validPassword = function(password) {
return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and make it available to our app
module.exports = mongoose.model('User', userSchema);

The passport.js file handles the login and signup functionality:

// require an authentication strategy
var LocalStrategy = require('passport-local').Strategy;

// require the user model
var User = require('../app/models/user');

module.exports = function(passport) {

// serialize the user for the session
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// login
passport.use('local-login', new LocalStrategy({
    usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
},
function(req, username, password, done) {
    // asynchronous
    process.nextTick(function() {
        User.findOne({ 'local.username' :  username }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.'));

            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Incorrect password.'));

            // no errors, return user
            else
                return done(null, user);
        });
    });

}));

// signup
passport.use('local-signup', new LocalStrategy({
    usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
},
function(req, username, password, done) {
    // asynchronous
    process.nextTick(function() {
        // if the user is not already logged in:
        if (!req.user) {
            User.findOne({ 'local.username' :  username }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // check to see if theres already a user with that username
                if (user) {
                    return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
                } else {

                    // create the user
                    var newUser            = new User();
                    newUser.local.username = username;
                    newUser.local.password = newUser.generateHash(password);
                    newUser.save(function(err) {
                        if (err)
                            return done(err);
                        return done(null, newUser);
                    });
                }
            });
        } 
    });
}));

};</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p><strong>Bibliography</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Handlebars (no date) <em>Handlebars</em>. Available at: <a href="https://handlebarsjs.com/">https://handlebarsjs.com/</a> (Accessed: 22 November 2018).</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Passport (no date) <em>Passport</em>. Available at: <a href="http://www.passportjs.org">http://www.passportjs.org</a> (Accessed: 22 November 2018).</p>
<!-- /wp:paragraph -->