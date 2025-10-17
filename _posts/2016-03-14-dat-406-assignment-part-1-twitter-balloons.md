---
layout: post
title: "DAT 406 - Assignment Part 1 - Twitter Balloons"
date: 2016-03-14 11:22:36 +0000
categories: DAT406 - Digital Making Digital Art &amp; Technology
---

<!-- wp:paragraph {"className":"brief"} -->
<p class="brief">Brief: Your task is to link virtual and physical technology in an artistic, thoughtful, engaging and/or playful way. Create a system where a real object controls something on the web, or virtual data controls a real object. Be imaginative and creative and have fun. You might think of it as real-world data visualisation, or using physical objects to make a comment on virtual processes.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Working in a group of four, the first idea that was suggested was that of an electric guitar that could be played by motor-controlled means. The motors would be actuated and controlled based on input from Twitter feeds. Given the timescale involved, this idea was seen as over-ambitious.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I suggested an idea of, again, visually representing Twitter feeds, this time through the use of stepper-motor-controlled twitter balloons. The stepper motors would be controlled via a Raspberry Pi running a Python script to actuate the motors based on the occurrence of selected hashtags in tweets. The motors would unwind the line connected to the balloon, causing them to rise.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>After some discussion, the group decided it would be interesting to compare the occurrence of the popular hashtags used by the 2016 United States presidential candidate front runners (Donald Trump, Hillary Clinton, Ted Cruz and Bernie Sanders). Whilst this method would not be accurate as measure of popularity (tweets could be negative), it would give an indication of the interest shown in each candidate which could then be visually represented by balloons.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":629,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Rite-Tag-Donald-Trump.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Rite-Tag-Donald-Trump-300x266.jpg" alt="" class="wp-image-629"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>Screen shot from ritetag.com showing popular Twitter hashtags for Donald Trump</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>High concept:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Balloons are used frequently during US presidential election campaigns (see photo)</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Politicians - hot air!</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Short lifespan of balloons could be indicative of the transient and fickle nature of politics/celebrity</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:image {"id":630,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/87818129_151022626.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/87818129_151022626-300x169.jpg" alt="" class="wp-image-630"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>US presidential election - balloons</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li><strong>Python code</strong> The Python script combines the Twython Twitter API wrapper for Python with code to light an LED in each balloon via the Raspberry Pi's GPIO pins and send a string via the Raspberry Pi's serial connection to the Arduino.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>Arduino sketch</strong> Each of the two Arduinos is running a sketch which reads the input from the USB port (being sent from the Pi). One sketch looks for 'trump' and 'clinton', the other looks for 'cruz' and 'sanders'. Conditional code triggers the stepper motors to turn when the corresponding string is received from the Python code.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>The following video shows the setup for proof of concept for the project. The code running on the Raspberry Pi causes one of four LEDs to be lit depending upon the occurrence of Twitter hashtags. At this stage, the Arduino is not being used.</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://youtu.be/Nl4wgFlQfhU","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://youtu.be/Nl4wgFlQfhU
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p>The next video shows two terminal windows displaying&nbsp;the tweets from Donald Trump and Hillary Clinton that have been matched by the Python code running of the Raspberry Pi. Two stepper motors are connected to an Arduino and labelled to clearly show them rotating in response to the tweets.</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://youtu.be/StY8G-A0jS0","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://youtu.be/StY8G-A0jS0
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p>#AmericanFloaters completed build</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://youtu.be/IdDz_dOa3qU","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://youtu.be/IdDz_dOa3qU
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p><strong>Issues encountered:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Power consumption issues were encountered on two occasions, both times leading to serial write failures/USB disconnects. The first of these failures happened when trying to run two stepper motors via the Arduino. Research on the Internet pointed towards a power supply issue. To surmount this problem, I connected a 9 volt battery to the Arduino to provide additional power. The second failure occurred when all four motors were in use. Again research suggested a lack of power supply from the Raspberry Pi's USB ports. Eventually I found adding a setting in Boot &gt; config.txt (max_usb_power = 1) that allowed me to increase available power to Pi's USB ports.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The lack of available pins on the Arduino was also a problem. Each stepper motor requires four signal connections plus two for positive and negative power connections. I decided to use two Arduinos, both powered by 9 volt batteries to double the number of available pins to run the motors.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The Twitter API&nbsp;limited requests to two concurrent search processes. Therefore, two separate Twitter API applications were created with two search processes each.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->