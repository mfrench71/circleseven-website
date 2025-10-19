---
layout: post
title: DAT 406 - Assignment Part 1 - Twitter Balloons
date: 2016-03-14 11:22:36 +0000
categories:
- DAT406 - Digital Making
- Digital Art and Technology
tags:
- Academic
- DAT406
- Python
featured_image: IMG_1696-scaled-1
---
Brief: Your task is to link virtual and physical technology in an artistic, thoughtful, engaging and/or playful way. Create a system where a real object controls something on the web, or virtual data controls a real object. Be imaginative and creative and have fun. You might think of it as real-world data visualisation, or using physical objects to make a comment on virtual processes.

Working in a group of four, the first idea that was suggested was that of an electric guitar that could be played by motor-controlled means. The motors would be actuated and controlled based on input from Twitter feeds. Given the timescale involved, this idea was seen as over-ambitious.

I suggested an idea of, again, visually representing Twitter feeds, this time through the use of stepper-motor-controlled twitter balloons. The stepper motors would be controlled via a Raspberry Pi running a Python script to actuate the motors based on the occurrence of selected hashtags in tweets. The motors would unwind the line connected to the balloon, causing them to rise.

After some discussion, the group decided it would be interesting to compare the occurrence of the popular hashtags used by the 2016 United States presidential candidate front runners (Donald Trump, Hillary Clinton, Ted Cruz and Bernie Sanders). Whilst this method would not be accurate as measure of popularity (tweets could be negative), it would give an indication of the interest shown in each candidate which could then be visually represented by balloons.

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Rite-Tag-Donald-Trump.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/Rite-Tag-Donald-Trump-300x266" width="300" height="266" alt="" loading="lazy"></a></figure>

Screen shot from ritetag.com showing popular Twitter hashtags for Donald Trump

## High concept:

- Balloons are used frequently during US presidential election campaigns (see photo)

- Politicians - hot air!

- Short lifespan of balloons could be indicative of the transient and fickle nature of politics/celebrity

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/87818129_151022626.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/87818129_151022626-300x169" width="300" height="169" alt="" loading="lazy"></a></figure>

US presidential election - balloons

- **Python code** The Python script combines the Twython Twitter API wrapper for Python with code to light an LED in each balloon via the Raspberry Pi's GPIO pins and send a string via the Raspberry Pi's serial connection to the Arduino.

- **Arduino sketch** Each of the two Arduinos is running a sketch which reads the input from the USB port (being sent from the Pi). One sketch looks for 'trump' and 'clinton', the other looks for 'cruz' and 'sanders'. Conditional code triggers the stepper motors to turn when the corresponding string is received from the Python code.

The following video shows the setup for proof of concept for the project. The code running on the Raspberry Pi causes one of four LEDs to be lit depending upon the occurrence of Twitter hashtags. At this stage, the Arduino is not being used.

<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/Nl4wgFlQfhU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>

The next video shows two terminal windows displaying the tweets from Donald Trump and Hillary Clinton that have been matched by the Python code running of the Raspberry Pi. Two stepper motors are connected to an Arduino and labelled to clearly show them rotating in response to the tweets.

<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/StY8G-A0jS0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>

#AmericanFloaters completed build

<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/IdDz_dOa3qU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>

## Issues encountered:

- Power consumption issues were encountered on two occasions, both times leading to serial write failures/USB disconnects. The first of these failures happened when trying to run two stepper motors via the Arduino. Research on the Internet pointed towards a power supply issue. To surmount this problem, I connected a 9 volt battery to the Arduino to provide additional power. The second failure occurred when all four motors were in use. Again research suggested a lack of power supply from the Raspberry Pi's USB ports. Eventually I found adding a setting in Boot &gt; config.txt (max_usb_power = 1) that allowed me to increase available power to Pi's USB ports.

- The lack of available pins on the Arduino was also a problem. Each stepper motor requires four signal connections plus two for positive and negative power connections. I decided to use two Arduinos, both powered by 9 volt batteries to double the number of available pins to run the motors.

- The Twitter API limited requests to two concurrent search processes. Therefore, two separate Twitter API applications were created with two search processes each.

