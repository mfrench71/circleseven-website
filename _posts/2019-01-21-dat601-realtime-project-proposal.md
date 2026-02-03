---
layout: post
title: "DAT601 - Realtime - Project Proposal"
date: 2019-01-21 13:03:16 +0000
categories: ["DAT601 - Realtime", "Digital Art and Technology"]
tags: ["DAT601"]
description: "Project proposal for interactive ocean pollution installation using LED bottles, proximity sensors, Arduino and ambient soundscapes."
---
## Area of Interest

Through the use of light, natural and man-made elements, sound, and audience participation, we want to explore the interaction of light, air, water, sound, and translucent material (sea-glass). Our intention is to produce a thought-provoking, visually striking, and interactive piece of art that is both compelling to the audience and also highlights environmental issues: specifically ocean plastic pollution.

We have chosen materials (glass, plastic, fishing line) which are indisputably man-made, combining these with natural elements/phenomenon (water, air, light, sound), and what might be described as a semi-natural element (sea-glass). We hope this will provoke some thought around what is considered pollution: plastic bottles and fishing line being washed up on beaches is considered polluting; sea-glass, on the other hand, though originally man-made, has been transformed by nature into an almost organic element, and returned to the shore, just as plastic is. Can this then be considered pollution, or is it a more ‘acceptable’ form of contamination?

## Practitioners

Sabrina Raaf's 'Translator II: Grower' (2004-2005) is a work that is activated by chance factors. The robot draws green lines at the base of a wall. The height of the line is based on the level of CO2 in the room. The act of observing the artwork provides the chance stimulus that drives the artistic process (Raaf, 2004).

Prismatica is an "installation includes 50 prisms made from panels laminated with a dichroic film - this allows the panels to transmit and reflect every color in the visible spectrum. Contained in their bases are projectors that create an infinite interplay of lights and reflections. And, as the prisms rotate, a soundtrack of bells play, too" (*Prismatica: Public Art Installation by RAW*, 2015).

## Description of Project/Objective

Plastic and glass bottles will be suspended by fishing line from a driftwood support. Each bottle will be partially filled with sea-glass and water. Arduino-controlled air pumps, activated by an individual’s proximity to the installation, will pump air via a tube and air diffuser into the water at the bottom of each bottle. At the same time, a ring of LEDs or Neopixels attached to the bottom of each bottle, facing upwards, will light. The intention is that the movement of the air bubbles and their interaction with the translucent sea-glass, light, and water will create a pleasing aesthetic, reflecting the interplay of elements found at the seashore. At the same time, we hope to introduce a playful aspect to the piece, as observers become aware that they can influence the generation of bubbles and illumination through their proximity.

This project is not only about the interaction of light and translucency, but also about sound. Atmosphere and context, as well as a feeling of location, will be created through the use of ambient sounds from the seashore, such as waves, pebbles, the cries of gulls, and the wind, etc. We hope to be able to vary the sound and volume based on people’s movement around the installation.

There has been some discussion around varying the behaviour of the bottles, depending on whether the bottle is glass or plastic. We have thought about plastic bottles having a more ‘aggressive’ response, as these may be seen as more polluting. This behaviour could be emphasised by the use of sound. Someone approaching a plastic bottle could trigger a piece of audio which evokes the industrial manufacturing of plastic containers. This could provide an interesting juxtaposition with the more natural and peaceful sounds that are triggered by the glass bottles.

We are anticipating that the bottles will rotate and would like to incorporate this natural movement into the artwork through the use of accelerometers or compass sensors. These could, perhaps, be used to vary the colour of the lights based on the bottles’ movement.

## Potential Issues

Whilst we intend to share the work required across a number of Arduinos (and possibly a Raspberry Pi), each device will need to perform more than one action simultaneously, e.g. activating the air pump *and* lighting LEDs. We will need to consider the use of a state machine to enable the Arduinos to do more than one thing at a time. We also need to think about  whether the use of plastic bottles will provide a sufficiently attractive aesthetic. An alternative approach might be to use attractive glass bottles but vary the contents; so some might contain actual ocean plastic while the others remain unpolluted.

## Bibliography
 	- *Prismatica: Public Art Installation by RAW* (2015) Available at: [http://theinspirationgrid.com/prismatica-public-art-installation-by-raw/](http://theinspirationgrid.com/prismatica-public-art-installation-by-raw/) (Accessed: 19 October 2018).
 	- Raaf, S. (2004) *Sabrina Raaf :: New Media Artist*. Available at: [http://raaf.org/projects.php?pcat=2&amp;proj=4](http://raaf.org/projects.php?pcat=2&amp;proj=4) (Accessed: 10 October 2018).

