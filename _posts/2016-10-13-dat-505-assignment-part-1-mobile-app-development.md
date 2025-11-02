---
layout: post
title: DAT 505 - Assignment Part 1 - Mobile App Development
date: 2016-10-13 09:37:36 +0000
categories:
- DAT505 - Advanced Creative Coding
- Digital Art and Technology
tags:
- DAT505
- Programming
featured_image: dat505_dryer_feature
---
Brief: Using PhoneGap, you must create a "ratings" mobile app, focusing on a product or service of your choice. For example, you might choose: Hotels, Beers, Burgers, Restaurants, Shoe shops, or anything else that can be rated! Your mobile app should allow you to create a "rating card" for each item, with the following information:

- Unique ID for the item

- Name of the item

- Photo of the item

- Geolocation of where the item can be found

- Various item-specific categories (depends on the type of item you choose!)

- Overall rating (from 1 to 5 stars)

Your app should allow a user to do the following:

- Create and rate a new item (filling out all of the above fields)

- Store the newly created item on the phone

- Select an existing item to view

- Update the details of a particular item

- Delete a selected item

If you are feeling a bit more ambitious, you might like to add features to:

- Generate a list of the current top five items (using the overall star rating, plus any other relevant fields as secondary criteria)

- Choose two items to compare (automatic analysis reveals which one is "the best")

- Request the nearest item to your current location (as determined by geolocation)

## The result:

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-01_30267168656_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-01_30267168656_o" width="176" height="300" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-02_30267169016_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-02_30267169016_o" width="176" height="300" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-03_30216439431_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-03_30216439431_o" width="176" height="300" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-04_29671872384_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-04_29671872384_o" width="176" height="300" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-05_30267169786_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/ratemydryer-05_30267169786_o" width="176" height="300" alt="" loading="lazy"></a></figure>

</div>

Using [PhoneGap](http://phonegap.com), [Ionic Creator](https://creator.ionic.io/) and [Brackets](http://brackets.io), I created a hand dryer ratings mobile app for deployment to the Android platform.

The main features of the app are:

- Add, view, edit and delete ratings

- Allow users to add a photo to their rating

- Establish and display the user's current geographic location and that of rated dryers

- View top rated dryers based on five-star overall rating

- View a map of dryers in the user's proximity and link to the dryer in question

- Provide a settings interface to view and delete stored data for testing and diagnostic purposes, and a feature to import dummy ratings

