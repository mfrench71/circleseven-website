---
layout: post
title: DAT602 - Face Recognition with Azure Face API and Javascript
date: 2018-11-13 13:28:05 +0000
categories:
- DAT602 - Everyware
- Digital Art and Technology
tags:
- DAT602
- JavaScript
- Photography
- Python
- Web Development
featured_image: 05/matthew_result
---
<p>In my previous post, I developed some Python scripts which used Microsoft's Azure <a href="https://azure.microsoft.com/en-us/services/cognitive-services/face/">Face API</a> (Microsoft, no date) to train and recognise faces.</p>

Whilst the scripts functioned in the way I intended, the usability of the Python scripts for face recognition is not ideal for a number of reasons.

- The interface is unattractive. A mostly blank terminal window with a few text status messages is not especially pleasing to the eye!

- The Pi camera is programmed to take pictures at five second intervals until a face is recognised. This could be made more efficient by the user triggering the picture to be taken when they are sitting in front of the camera.

- There is no picture preview of the photo being taken, so a person's face might be out of frame, causing the face identification to fail.

- Ultimately, once the user has had their face identified, they will be taken to some personalised content presented via a web interface. The integration between the Python scripts and a web-based system is challenging.

To overcome these weaknesses, I decided to first attempt to implement a basic web-based front-end which would present the face detection and face identification functionality of my Python script into a more usable and friendly form.

## Requirements for Web-Based Face Recognition

This basic system would need to:

<ol>- Provide a real-time preview of the photo being taken

- Allow the user to take a photo by clicking a button

- Post the image data to the Detect Face API call

- Take the faceId returned from step 3 and post it to the Identify Face API call

- Take the personId returned from step 4 and use a GET request to the PersonGroup Persons API to retrieve the name of the identified user from the previously trained PersonGroup
</ol>

## The HTML Page

I developed a basic HTML page with sections to display the live camera preview, the captured image, a button to call the Javascript, and the JSON results returned by the various Face API calls. Bootstrap and JQuery were linked via CDNs and local Javascript files for the webcam and the API calls were linked.

```html
<!doctype html>
<html lang="en">
 <head>
 <!-- Required meta tags -->
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
 <title>Face Login Test</title>
 <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
 <style>
 #results, #identity, #name {
 display: block;
 font-family: monospace;
 white-space: pre;
 margin: 1em 0;
 }
 </style>
</head>
<body>
 <div class="container">
 <div class="row">
 <div class="col">
 <div id="my_camera"></div>
 <form class="mb-2 mt-2">
 <input type=button class="btn btn-primary" value="Take Snapshot" onClick="take_snapshot()">
 </form>
 </div>
 <div class="col">
 <canvas id="viewport" width="320" height="240"></canvas>
 </div>
 </div>
 
 <div class="row">
 <div class="col">Detect face:
 <pre id="results">
 </pre>
 </div>
 <div class="col">Identity:
 <pre id="identity">
 </pre>
 </div>
 <div class="col">Name:
 <pre id="name">
 </pre>
 </div>
 </div>
 </div>
 <script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js"></script>
 <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js"></script>
 <script src="webcam.min.js"></script>
 <script src="javascript.js"></script>
</body>
</html>
```

This renders as:

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/face_login_html.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_login_html.png" alt="" loading="lazy"></a><figcaption>HTML page</figcaption></figure>

## Capturing a Live Image

<p>I used <a href="https://github.com/jhuckaby/webcamjs/blob/master/DOCS.md">WebcamJS</a> to provide the live preview and image capture functionality.</p>

"WebcamJS is a small ... standalone JavaScript library for capturing still images from your computer's camera, and delivering them to you as JPEG or PNG Data URIs" (Huckaby, no date)

The code to initialise the camera:

```js
Webcam.set({
 width: 320,
 height: 240,
 image_format: 'jpeg',
 jpeg_quality: 90
});
Webcam.attach('#my_camera');

var canvas = document.getElementById('viewport'),
 context = canvas.getContext('2d')
```

A button is used to allow the user to take a picture. This is linked to the take_snapshot() function which takes the image data and posts it to the Detect API call. If a face is detected, the results are returned and the HTML page updated accordingly:

```js
function take_snapshot() {
 // take snapshot and get image data
 Webcam.snap(function(data_uri) {
 base_image = new Image();
 base_image.src = data_uri;
 base_image.onload = function() {
 context.drawImage(base_image, 0, 0, 320, 240);

 let data = canvas.toDataURL('image/jpeg');

 fetch(data)
 .then(res => res.blob())
 .then(blobData => {
 $.post({
 url: "https://westus.api.cognitive.microsoft.com/face/v1.0/detect",
 contentType: "application/octet-stream",
 headers: {
 'Ocp-Apim-Subscription-Key': 'XXXXX'
 },
 processData: false,
 data: blobData
 })
 .done(function(data) {
 $("#results").text(JSON.stringify(data, null, 2));
 faceIdGlobal = data[0].faceId;
 identify(faceIdGlobal);
 })
 .fail(function(err) {
 $("#results").text(JSON.stringify(err));
 })
 });
 }
 });
};
```

After the face detection API call, the identify() function is called to post the faceId returned from the take_snapshot() function to the Identify API endpoint. The results are then used to update the HTML page:

```js
function identify(faceIdGlobal) {
 $.post({
 url: "https://westus.api.cognitive.microsoft.com/face/v1.0/identify",
 contentType: "application/json",
 headers: {
 'Ocp-Apim-Subscription-Key': 'XXXXX'
 },
 data: "{personGroupId:'users', faceIds:['" + faceIdGlobal + "'], confidenceThreshold: '.5'}"
 })
 .done(function(data) {
 $("#identity").text(JSON.stringify(data, null, 2));
 personIdGlobal = data[0].candidates[0].personId;
 getName(personIdGlobal);
 })
 .fail(function() {
 alert("error");
 });
 };
```

Finally, the getName() function is called with the personId returned from the identify() function. This retrieves the name of the user identified and updates the HTML page:

```js
function getName(personIdGlobal) {
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
 $("#name").text(data.name);
 })
 .fail(function() {
 alert("error");
 });
 }
```

The final result looks like:

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/matthew_result-1.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/matthew_result-1.png" alt="" loading="lazy"></a></figure>

## Bibliography

<p>Huckaby, J. (no date) *WebcamJS*. Available at: <a href="https://github.com/jhuckaby/webcamjs/blob/master/DOCS.md">https://github.com/jhuckaby/webcamjs/blob/master/DOCS.md</a> (Accessed: 13 November 2018).</p>

<p>Microsoft (no date) *Face*. Available at: <a href="https://azure.microsoft.com/en-gb/services/cognitive-services/face/">https://azure.microsoft.com/en-gb/services/cognitive-services/face/</a> (Accessed: 13 November 2018).</p>
