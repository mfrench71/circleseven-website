---
layout: post
title: "DAT602 - uSense Cognitive Functionality Testing with Node-RED - Visual Recognition"
date: 2018-10-31 07:34:59 +0000
categories: DAT602 - Everyware Digital Art and Technology
---

<!-- wp:paragraph -->
<p>In my <a href="https://www.circleseven.co.uk/dat602-usense-cognitive-functionality-testing-with-node-red-sentiment-and-tone/">previous post</a>, I documented my tests with Node-RED and IBM Watson's&nbsp; sentiment and tone analysis services. This post will look at basic face detection using the visual recognition service.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Ultimately, I hope to use visual recognition for emotion detection.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>For this testing, I will be using a Raspberry Pi, Pi Camera, and a local installation on the Pi of Node-RED.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Flow Summary</strong></p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":979,"sizeSlug":"full","linkDestination":"custom"} -->
<figure class="wp-block-image size-full"><img src="https://res.cloudinary.com/circleseven/image/upload/visual_recognition_flow-e1540983848824.png" alt="" class="wp-image-979"/></figure>
<!-- /wp:image -->

<!-- wp:list {"ordered":true} -->
<ol><!-- wp:list-item -->
<li>An <em>injection</em> node sends an empty string to the <em>execute</em> node.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The <em>execute</em> node runs the following script: <code>raspistill -o /home/pi/Pictures/image1.jpg -q 25</code> This uses the Pi camera to take a still image and save it in the specified directory with a JPEG quality of 25%.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>A <em>template</em> node can optionally be used to output to the debug console.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The <em>file in</em> node gets the previously saved image and outputs it as a buffer object.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The <em>function</em> node receives the image buffer and passes it to the <em>visual recognition</em> node.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The <em>visual recognition</em> node processes the image data and passes the result to a <em>debug</em> node to output to the console.</li>
<!-- /wp:list-item --></ol>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p><strong>Results</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Here are some results of testing on two different images:</p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":983,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/male_photo-scaled-1.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/male_photo-scaled-1-1024x769.jpg" alt="" class="wp-image-983"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":982,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/male_result-e1540983795734.png"><img src="https://res.cloudinary.com/circleseven/image/upload/male_result-e1540983795734.png" alt="" class="wp-image-982"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:gallery {"linkTo":"media"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":986,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/female_photo-scaled-1.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/female_photo-scaled-1-1024x769.jpg" alt="" class="wp-image-986"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":985,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/female_result-e1540983699762.png"><img src="https://res.cloudinary.com/circleseven/image/upload/female_result-e1540983699762.png" alt="" class="wp-image-985"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p>In both tests, the results of the analysis of age and gender of the individual's face was accurate.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>GitHub</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The code for the above flow is available here:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="https://github.com/mfrench71/DAT602/blob/master/Node%20Red%20Flows/pi_face_detection.json" target="_blank" rel="noreferrer noopener">https://github.com/mfrench71/DAT602/blob/master/Node%20Red%20Flows/pi_face_detection.json</a></p>
<!-- /wp:paragraph -->