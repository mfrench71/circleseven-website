---
layout: post
title: DAT602 - uSense Cognitive Functionality Testing with Node-RED - Visual Recognition
date: 2018-10-31 07:34:59 +0000
categories:
- DAT602 - Everyware
- Digital Art and Technology
tags:
- DAT602
- Photography
featured_image: visual_recognition_flow-e1540983848824
---
<p>In my <a href="{{ site.baseurl }}/dat602-usense-cognitive-functionality-testing-with-node-red-sentiment-and-tone/">previous post</a>, I documented my tests with Node-RED and IBM Watson's sentiment and tone analysis services. This post will look at basic face detection using the visual recognition service.</p>

Ultimately, I hope to use visual recognition for emotion detection.

For this testing, I will be using a Raspberry Pi, Pi Camera, and a local installation on the Pi of Node-RED.

## Flow Summary

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/visual_recognition_flow-e1540983848824"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/visual_recognition_flow-e1540983848824" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/visual_recognition_flow-e1540983848824 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/visual_recognition_flow-e1540983848824 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/visual_recognition_flow-e1540983848824 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

<ol>- An *injection* node sends an empty string to the *execute* node.

- The *execute* node runs the following script: <code>raspistill -o /home/pi/Pictures/image1.jpg -q 25</code> This uses the Pi camera to take a still image and save it in the specified directory with a JPEG quality of 25%.

- A *template* node can optionally be used to output to the debug console.

- The *file in* node gets the previously saved image and outputs it as a buffer object.

- The *function* node receives the image buffer and passes it to the *visual recognition* node.

- The *visual recognition* node processes the image data and passes the result to a *debug* node to output to the console.
</ol>

## Results

Here are some results of testing on two different images:

<div class="gallery">

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/male_photo-scaled-1.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/male_photo-scaled-1-1024x769" width="1024" height="769" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/male_result-e1540983795734"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/male_result-e1540983795734" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/male_result-e1540983795734 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/male_result-e1540983795734 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/male_result-e1540983795734 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>
<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/female_photo-scaled-1.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/female_photo-scaled-1-1024x769" width="1024" height="769" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/female_result-e1540983699762"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/female_result-e1540983699762" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/female_result-e1540983699762 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/female_result-e1540983699762 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/female_result-e1540983699762 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

</div>

In both tests, the results of the analysis of age and gender of the individual's face was accurate.

## GitHub

The code for the above flow is available here:

<p><a href="https://github.com/mfrench71/DAT602/blob/master/Node%20Red%20Flows/pi_face_detection.json" target="_blank" rel="noreferrer noopener">https://github.com/mfrench71/DAT602/blob/master/Node%20Red%20Flows/pi_face_detection.json</a></p>
