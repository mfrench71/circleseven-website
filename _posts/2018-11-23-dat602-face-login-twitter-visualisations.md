---
layout: post
title: "DAT602 - Face Login - Twitter Visualisations"
date: 2018-11-23 10:15:05 +0000
categories: DAT602 - Everyware Digital Art and Technology
---

<!-- wp:paragraph -->
<p>I have developed a functioning face login system based on Microsoft's Azure Face API, Node.js and Express. After users have logged in using the face recognition system, I would like them to be able to access some personalised content from their social media platforms.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The first platform I looked at was Twitter and I made use of <a href="https://github.com/ttezel">Tolga Tezel's</a> Twit package (Tezel, no date).</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The first step to displaying some information from Twitter was to allow user's to add their Twitter handle as part of the signup information they provide and store this in the Mongo database along with their username and password:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":928,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.08.20.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.08.20.png" alt="" class="wp-image-928"/></a><figcaption class="wp-element-caption">Face Login Signup<a href="http://localhost/wp-content/uploads/2018/11/Screenshot-2018-11-23-at-12.08.20.png"></a></figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p><strong>Getting Twitter Friends</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Getting the friends of a Twitter user is a two-step process. Firstly, the IDs of the friends of the user are retrieved via the Twitter API using the <a href="https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-friends-ids">friends/ids API call</a>&nbsp;(Twitter, no date):</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// Get the user IDs of 100 friends
function getFriends(screen_name, next) {
    twitter.get('friends/ids', { screen_name: screen_name, count: 100 }, function(err, data) {
        // If we have the IDs, we can look up user information
        if (!err &amp;&amp; data) {
            lookupUsers(data.ids, next);
        }
        // Otherwise, return with error
        else {
            next(err);
        }
    });
}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The list of friend IDs are then used to lookup the details for each user using the Twitter API users/lookup API call:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// Get user information for the array of user IDs provided
function lookupUsers(user_ids, next) {
    twitter.get('users/lookup', { user_id: user_ids.join() }, function(err, data) {
        // If we have user information, we can pass it along to render
        if (!err &amp;&amp; data) {
            // We'll fill this array with the friend data you need
            var friends_array = new Array();
            for (index in data) {
                // Get your friend's join date and do some leading zero magic
                var date = new Date(data[index].created_at);
                var date_str = date.getFullYear() + '-'

               + ('0' + (date.getMonth()+1)).slice(-2) + '-'
               + ('0' + date.getDate()).slice(-2);
               // Push the info to an array
               friends_array.push({
                   'name' : data[index].name,
                   'screen_name' : data[index].screen_name,
                   'created_at' : date_str,
                   'profile_image' : data[index].profile_image_url,
                   'link_color' : data[index].profile_link_color
               });
           }
          // The callback function defined in the getFriends call
          next(err, friends_array);
        }
        // Otherwise, return with error
        else {
            next(err);
        }
    });
}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>With these two functions in place, a new route can be created to call these functions and render a view with the logged-in user's Twitter friends:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// twitter friends
    app.get('/twitter', isLoggedIn, function(req, res){
      // get twitter screen name of currently logged-in user
      var user = req.user;
      var screen_name = user.local.twitter;
      // get user's friend information
      getFriends(screen_name, function(err, data) {
        // Render the page with our Twitter data
        if (!err &amp;&amp; data) {
          res.render('twitter.hbs', {
               user: req.user, 
               friends: data 
           });
        }
        // Otherwise, render an error page
        else {
          res.send(err.message);
        }
      });
    });</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The code for the Handlebars view that renders the Twitter friend information:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;h1>&lt;i class="fab fa-twitter mb-4">&lt;/i> Twitter Friends&lt;/h1>
{{#grouped_each 3 friends}}
  &lt;div class="row">
    {{#each this }}
      &lt;img class="align-self-start mr-3" src="{{this.profile_image}}" style="border-bottom: 3px solid #{{this.link_color}}">
      &lt;div class="media-body">
        &lt;a href="twitter/{{this.screen_name}}">&lt;p>&lt;strong>@{{this.screen_name}}&lt;/strong>&lt;/a>&lt;/br>
        {{this.name}}&lt;/p>
      &lt;/div>
  {{/each}}
  &lt;/div>
{{/grouped_each}}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>Which renders as:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":929,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.35.38.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.35.38-1024x624.png" alt="" class="wp-image-929"/></a><figcaption class="wp-element-caption">Twitter friends</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>Note: In order to render the column layout, I registered a Handlbars helper function with the main <code>server.js</code> file:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// handlebars helper (columns)
hbs.registerHelper('grouped_each', function(every, context, options) {
    var out = "", subcontext = [], i;
    if (context &amp;&amp; context.length > 0) {
        for (i = 0; i &lt; context.length; i++) {
            if (i > 0 &amp;&amp; i % every === 0) {
                out += options.fn(subcontext);
                subcontext = [];
            }
            subcontext.push(context[i]);
        }
        out += options.fn(subcontext);
    }
    return out;
});</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p><strong>Getting Tweets that mention Twitter Friends</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The&nbsp;statuses/user_timeline Twitter API call "returns a collection of the most recent&nbsp;Tweets&nbsp;posted by the&nbsp;user&nbsp;indicated by the screen_name or user_id parameters."</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I have access to the screen_name from the previous code, so this can be passed to the Twiter statuses/user_timeline Twitter API call via a querystring parameter as the code below demonstrates:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// tweets
    app.get('/twitter/:screen_name', isLoggedIn, function(req, res) {
        // get friend's tweets
      twitter.get('statuses/user_timeline', { screen_name: req.params.screen_name, count: 10 }, function(err, data) {
        // Render the page with our Twitter data
        if (!err &amp;&amp; data) {
            console.log(data);
          res.render('tweets.hbs', {
               user: req.user,
               screen_name: req.params.screen_name,
               profile_link_color: data[0].user.profile_link_color,
               profile_image_url: data[0].user.profile_image_url,
               profile_banner_url: data[0].user.profile_banner_url,
               tweets: data
           });
        }
        // Otherwise, render an error page
        else {
          res.send(err.message);
        }
      });
    });</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The returned tweet data is passed to a view and rendered using the following code:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;style>
#banner {
    background-image:url({{profile_banner_url}});
    width: 1024px;
    height:300px;
    background-repeat:no-repeat;
    background-size:cover;
    background-position: center;
}
&lt;/style>
&lt;h1>&lt;i class="fab fa-twitter mb-4">&lt;/i> Tweets&lt;/h1>
&lt;div class="row">
  &lt;div id="banner">&lt;/div>
&lt;/div>
&lt;div class="row mt-1 pb-1 pt-1" style="border-bottom: 3px solid #{{profile_link_color}}">
  &lt;img class="align-self-start mr-3" src="{{profile_image_url}}">
  &lt;div class="media-body">
    &lt;h2 class="mt-1">@{{screen_name}}&lt;/h2>
  &lt;/div>
&lt;/div>
{{#each tweets}}
  &lt;div class="row mt-2 mb-2 pb-2 pt-2" style="border-bottom: 1px solid silver;">
    &lt;i class="fab fa-twitter mr-2">&lt;/i>
    &lt;div class="media-body">
      {{this.text}}
    &lt;/div>
  &lt;/div>
{{/each}}</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>Which renders as:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":930,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-30-at-08.49.26.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-30-at-08.49.26.png" alt="" class="wp-image-930"/></a><figcaption class="wp-element-caption">Tweets</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p><strong>Visualisation Using Vis.js</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I also decided to create a more creative Twitter visualisation and decided to use <a href="http://visjs.org">Vis.js</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>Vis.js is a"dynamic, browser based visualization library. The library is designed to be easy to use, to handle large amounts of dynamic data, and to enable manipulation of and interaction with the data. The library consists of the components DataSet, Timeline, Network, Graph2d and Graph3d."</p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph -->
<p>(Vis.js, 2017)</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I used the timeline component of vis.js to develop a visualisation displaying a timeline of when the logged-in user's friends joined Twitter.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The code in <code>routes.js</code> is the same as that used above to get a user's Twitter friends:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock -->
<pre class="EnlighterJSRAW" data-enlighter-language="generic" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// twitter visualisation test
    app.get('/twitter-vis', isLoggedIn, function(req, res){
      // get twitter screen name of currently logged-in user
      var user = req.user;
      var screen_name = user.local.twitter;
      // get user's friend information
      getFriends(screen_name, function(err, data) {
        // Render the page with our Twitter data
        if (!err &amp;&amp; data) {
          res.render('twitter.ejs', {
               user: req.user, 
               friends: data 
           });
        }
        // Otherwise, render an error page
        else {
          res.send(err.message);
        }
      });
    });</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The data returned by the <code>getFriends</code> function is passed to a view:</p>
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
    &lt;script src="http://visjs.org/dist/vis.js">&lt;/script>
    &lt;link href="http://visjs.org/dist/vis.css" rel="stylesheet" type="text/css" />

  &lt;style>
    .starter-template {
            padding: 5rem 1.5rem;
        }

    .user-image {
      float: left;
    }

    .user-image img {
      width: 30px;
      height: 30px;
    }

    .user-info {
      float: right;
      text-align: left;
      margin-left: 5px;
    }
  &lt;/style>

&lt;body>
  &lt;header>
            &lt;nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
                &lt;a class="navbar-brand" href="/">&lt;i class="far fa-grin-wink">&lt;/i> Face Login&lt;/a>
                &lt;button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
                &lt;span class="navbar-toggler-icon">&lt;/span>
                &lt;/button>
                &lt;div class="collapse navbar-collapse" id="navbarsExampleDefault">
                    &lt;ul class="navbar-nav mr-auto">
                        &lt;% if (!user) { %>
                        &lt;li class="nav-item">
                            &lt;a class="nav-link" href="/login">Login&lt;/a>
                        &lt;/li>
                        &lt;li class="nav-item">
                            &lt;a class="nav-link" href="/signup">Signup&lt;/a>
                        &lt;/li>
                        &lt;% } %>
                        &lt;% if (user) { %>
                            &lt;li class="nav-item">
                                &lt;a class="nav-link" href="/profile">Profile&lt;/a>
                            &lt;/li>
                            &lt;li class="nav-item">
                                &lt;a class="nav-link" href="/logout">Logout&lt;/a>
                            &lt;/li>
                        &lt;% } %>
                    &lt;/ul>
                &lt;/div>
            &lt;/nav>
        &lt;/header>
        &lt;main role="main" class="container">
            &lt;div class="starter-template">
        &lt;h2>&lt;i class="fab fa-twitter">&lt;/i> Twitter Friends&lt;/h2>
        &lt;div id="visualization">&lt;/div>

        &lt;script>
        // Create the dataset by looping over the friends array
        var items = new vis.DataSet([
          &lt;% for(var i=0; i&lt;friends.length; i++) {%>
            {
              id: &lt;%= i %>,
              start: '&lt;%= friends[i].created_at %>',
              content: '&lt;div class="user-image">&lt;img src="&lt;%= friends[i].profile_image %>" style="border-bottom: 3px solid #&lt;%= friends[i].link_color %>;" />&lt;/div>&lt;div class="user-info">&lt;b>&lt;%= friends[i].name %>&lt;/b>&lt;br />@&lt;%= friends[i].screen_name %>&lt;/div>'
            }&lt;% if (i != friends.length-1) {%>,&lt;%}%>
          &lt;% } %>
        ]);

        // Reference to the visualization container
        var container = document.getElementById('visualization')

        // Get today's date for max range
        var date = new Date();
        var options = {
          height: '500px',
          min: new Date(2006, 0, 21), // lower limit of visible range
          max: new Date(date.getFullYear(), date.getMonth()+2, date.getDate()) // upper limit of visible range
        };

        // Create the timeline!
        var timeline = new vis.Timeline(container, items, options);
      &lt;/script>
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
<p>The Javascript at the end of this view creates a vis.js dataset by looping through the friends data which is, in turn, used to create the timeline, which renders as:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":919,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.18.15.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-11-23-at-12.18.15-1024x504.png" alt="" class="wp-image-919"/></a><figcaption class="wp-element-caption">Twitter visualisation</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p><strong>Bibliography</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Twitter (no date) <em>Follow, search, and get users</em>. Available at: <a href="https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-friends-ids">https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-friends-ids</a> (Accessed: 23 November 2018).</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Vis.js (2017) <em>Vis.js</em>. Available at <a href="http://visjs.org/">http://visjs.org/</a> (Accessed: 23 November 2018).</p>
<!-- /wp:paragraph -->