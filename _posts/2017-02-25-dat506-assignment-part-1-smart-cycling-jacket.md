---
layout: post
title: DAT506 - Assignment Part 1 - Smart Cycling Jacket
date: 2017-02-25 13:11:06 +0000
categories:
- DAT506 - Emerging Technologies
- Digital Art and Technology
tags:
- Academic
- Arduino
- DAT506
- Sound
- Tutorial
featured_image: 05/IMG_1940-copy
---
Brief: By embedding technology in items such as clothing and jewellery, the wearables movement aims to make smart clothes and devices that enhance everyday life. Working in groups, and using the fablab and workshop equipment and maker technologies we explore in the class, your task is to produce a piece of wearable technology which will be presented as part of a DAT fashion show.

## Notes:

<ol>- The definition of wearable is broad: anything that might adorn the body; so clothes, shoes, bags (worn not carried), jewellery, shin protectors, makeup, etc.

- The piece must include input and output; that is, it must sense something (e.g. heat, light, movement) and respond in some way (e.g. light, sound, movement). Virtual inputs and outputs are allowed, for example your wearable might react to an xml feed or make posts on twitter.

- The technology should be incorporated within the wearable rather than simply placed on top. Explore wearable technologies such as Flora arduinos and conductive thread, and find out how to use the fablab soldering stations and the sewing machine.
</ol>

This is a digital arts project and requires you to explore beyond or outside current commercial trends for wearable technologies. Such as 3D printing, lasercutting, embedded sensors and entertainment screens, social media windows or mobile communication peripherals. How can sensory garments provoke, connect or protect us? What is the relationship between skin, augmented fabric and the environment?

Explore the work of artists such as Mark Sheppard’s “Under(a)ware” which alerts the wearer to illegal data sniffing (1), Ying Gao’s anti- paparazzi “Playtime” dresses that react to being recorded (2), Intel's "Spider Dress" that reinforces personal space (3) or Studio Roosegarde's "Intimacy dress" that turns transparent when the user is aroused (4).

All these works explore the role of clothing and what happens when we use technology to rethink or subvert standard thinking about clothing and the way we present ourselves.

## Research

- When conducting research we tried to come up with an original idea that hadn't been done before.

- A lot of existing cycling jackets featured thermal insulation and reflectors so we were hoping that our cycling jacket would shine a new light on technology in wearables.

- A website which was useful for inspration was CyclingTips.com, mainly an article called ‘See and be Seen’ which gives tips on daytime lights and nighttime lights ([https://cyclingtips.com/2017/02/see-seen-every-cyclist-needs-know-daytime-running-lights/](https://cyclingtips.com/2017/02/see-seen-every-cyclist-needs-know-daytime-running-lights/))

## Ideas

- We had a few ideas on how we could create the product and what we could use. This included lights, sensors, and reflective features.

- A number of ‘optional extras’ were also discussed, such as a speed indicator. We decided to concentrate on implementing the core features of the cycling jacket and revisit the extra features if time allowed.

## The Design

- Our design was to create a cycling jacket which will help the cyclist indicate their actions to other road users in a clear way, especially when riding at night.

- Safety was an important consideration. We wanted the cyclist to be able to operate the functions of the jacket without taking their hands from the handlebars.

- As the lights would not be visible to the wearer, we wanted a visible feedback system that would tell the cyclist which lights were activated.

## Features

The core features of the cylcing jacket were to be:

- Left and right indicator arrow lights

- Brake light

- Finger-activated switches

- Cuff-mounted status lights

- High visibility mode

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/cycling-jacket"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/cycling-jacket" width="1024" height="789" alt="" loading="lazy"></a><figcaption>LED layout variations</figcaption></figure>

## Testing

- Testing was crucial in establishing how feasible our idea was and whether we would be able to implement all the features in the time provided and with the skills and technology available to the team.

- We spent time testing all of the individual components of the jacket. At the same time, the Arduino code was being developed and tested and Fritzing diagrams created to finalise the circuitry.

<div class="embed-container"><iframe src="https://www.youtube.com/embed/Q2jtvg6xZWQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/cycle-jacket_bb"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/cycle-jacket_bb" width="1024" height="782" alt="" loading="lazy"></a><figcaption>Cycling jacket Fritzing diagram</figcaption></figure>

## Fabrication of the Cycling Jacket

Wearable technology presents its own challenges when it comes to assembling the end product. Luckily we were able get to grips with some, to us, new materials and technologies, such as:

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/flora_logo-e1488013904135"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/flora_logo-e1488013904135" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/flora_logo-e1488013904135 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/flora_logo-e1488013904135 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/flora_logo-e1488013904135 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a><figcaption>Adafruit Flora microcontroller</figcaption></figure>

- Adafruit Flora microcontroller

- Conductive fabric

- Conductive thread

- Bend/flex sensor

- Custom-made thread connectors

- Reed switches

- GPS shield

<div class="embed-container"><iframe src="https://www.youtube.com/embed/PXo4rVBk2w4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

<div class="embed-container"><iframe src="https://www.youtube.com/embed/A_Eyra53fWE" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

## Non-Wearable Enhancements (Prototypes)

## Speed Meter

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/IMG_1936-copy-scaled-1"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/IMG_1936-copy-scaled-1" width="1024" height="768" alt="" loading="lazy"></a><figcaption>Prototype Bicycle Speed Meter</figcaption></figure>

- We wanted to add an indication of the cyclist’s speed so that other roads users would be aware of how fast the cyclist was travelling (for overtaking).

- A large digital readout on the back of the jacket was considered but the cost would have been prohibitive.

- Eventually, we opted for a simple prototype speed meter attached to the rear of the bike as a proof of concept.

- As speed of travel increases, the speed ‘bar’ goes up.

- The Arduino code calculates the MPH of the cyclist so there is potential to develop this further, perhaps as a wrist-mounted, wearable readout.

<div class="embed-container"><iframe src="https://www.youtube.com/embed/OXasguabfYE" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/speed-meter_bb"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/speed-meter_bb" width="925" height="1024" alt="" loading="lazy"></a><figcaption>Speed Meter Fritzing Diagram</figcaption></figure>

## GPS Tracker

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/gps-shield"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/gps-shield" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/gps-shield 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/gps-shield 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/gps-shield 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a><figcaption>Adafruit GPS Shield</figcaption></figure>

- The ubiquity of GPS-enabled devices, such as the Garmin range of watches, prompted the team to investigate the possibility of a wearable GPS tracker.

- GPS data could be recorded, stored and shared via Google Maps.

- A prototype was assembled using an Arduino and a Adafruit GPS shield. A number of sketches were used to record and retrieve GPS data.

- There are some issues with the data being recorded but, with further development, we believe this device could be incorporated as a wearable.

- The following clip demonstrates the how we used the Adafruit LOCUS parser web application to convert the GPS data to a KML file which could be imported into Google Maps to display the route taken by the cyclist.

<div class="embed-container"><iframe src="https://www.youtube.com/embed/YVQZotBt9U4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
