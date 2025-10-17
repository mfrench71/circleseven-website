---
layout: post
title: "DAT 505 - Assignment Part 1 - Mobile App Development"
date: 2016-10-13 09:37:36 +0000
categories: DAT505 - Advanced Creative Coding Digital Art &amp; Technology
---

<!-- wp:paragraph {"className":"brief"} -->
<p class="brief">Brief: Using PhoneGap, you must create a "ratings" mobile app, focusing on a product or service of your choice. For example, you might choose: Hotels, Beers, Burgers, Restaurants, Shoe shops, or anything else that can be rated! Your mobile app should allow you to create a "rating card" for each item, with the following information:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Unique ID for the item</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Name of the item</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Photo of the item</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Geolocation of where the item can be found</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Various item-specific categories (depends on the type of item you choose!)</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Overall rating (from 1 to 5 stars)</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>Your app should allow a user to do the following:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Create and rate a new item (filling out all of the above fields)</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Store the newly created item on the phone</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Select an existing item to view</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Update the details of a particular item</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Delete a selected item</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>If you are feeling a bit more ambitious, you might like to add features to:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Generate a list of the current top five items (using the overall star rating, plus any other relevant fields as secondary criteria)</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Choose two items to compare (automatic analysis reveals which one is "the best")</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Request the nearest item to your current location (as determined by geolocation)</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><strong>The result:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media","sizeSlug":"medium"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":656,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-01_30267168656_o.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-01_30267168656_o-176x300.png" alt="" class="wp-image-656"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":660,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-02_30267169016_o.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-02_30267169016_o-176x300.png" alt="" class="wp-image-660"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":659,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-03_30216439431_o.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-03_30216439431_o-176x300.png" alt="" class="wp-image-659"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":658,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-04_29671872384_o.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-04_29671872384_o-176x300.png" alt="" class="wp-image-658"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":657,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-05_30267169786_o.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ratemydryer-05_30267169786_o-176x300.png" alt="" class="wp-image-657"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p>Using <a href="http://phonegap.com">PhoneGap</a>, <a href="https://creator.ionic.io/">Ionic Creator</a> and <a href="http://brackets.io">Brackets</a>, I created a hand dryer ratings mobile app for deployment to the Android platform.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The main features of the app are:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Add, view, edit and delete ratings</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Allow users to add a photo to their rating</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Establish and display the user's current geographic location and that of rated dryers</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>View top rated dryers based on five-star overall rating</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>View a map of dryers in the user's proximity and link to the dryer in question</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Provide a settings interface to view&nbsp;and delete&nbsp;stored data for testing and diagnostic purposes,&nbsp;and a feature to&nbsp;import dummy ratings</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->