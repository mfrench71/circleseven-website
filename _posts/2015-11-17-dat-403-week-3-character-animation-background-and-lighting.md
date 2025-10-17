---
layout: post
title: "DAT 403 - Week 3 - Character Animation Background and Lighting"
date: 2015-11-17 08:42:26 +0000
categories: ["DAT403 - Digital Media Design", "Digital Art and Technology"]
---

Following on from my <a href="{{ site.baseurl }}/dat-403-task-week-3-character-animation-walk-cycle/">Character Animation Walk Cycle post</a>, the character animation After Effects composition was placed as a layer in a new composition. This will be used to place the walking character in a 3D layered environment with a camera move and lighting effects.

<div class="embed-container"><iframe src="https://www.youtube.com/embed/2_tjGgVJs0w" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

Time remapping is enabled for the character animation nested composition and a  loop expression is added to loop the animation
<pre class="EnlighterJSRAW" data-enlighter-language="generic">loopOut(type = "cycle", numKeyframes = 0)</pre>
Solid layers are created for the floor and background and all layers are enabled for 3D. The floor and background layers are then adjusted and positioned in Z space.

A light layer (spot light) is added with 'casts shadows' enabled and the 'Character animation' comp layer &gt; material options &gt; casts shadows is set to 'on'.

A camera layer is added and the camera animated to zoom into the composition over the course of the animation.

Building assets are imported and added to timeline as 3D layers along with other assets, such as the clouds, moon and street lamp. The 'accepts shadows' setting is switched off on layers as appropriate.