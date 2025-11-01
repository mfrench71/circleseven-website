---
layout: post
title: DAT612 - The Boathouse at Radford Lake - A Digital Reconstruction & Restoration
date: 2019-05-21 14:29:03 +0000
categories:
- DAT612 - Final Year Project
- Digital Art and Technology
tags:
- Blender
- DAT612
- Photogrammetry
- Photography
- Sound
- Unity
featured_image: Unity-2018.3.8f1-Personal-SampleScene.unity-Final-Year-Project-PC-Mac-Linux-Standalone-_DX11_-16_05_2019-08_31_03
---
## Concept

The concept of my project is a digital, interactive three-dimensional environment. The environment is based on a real location and recreates approximately 100 square metres of an area at Radford Lake, near Plymstock in Devon.

The core of the project lies, firstly, in the digital recreation of a portion of the ruins which are located next to Radford lake. This has been achieved through photogrammetry; that is, taking hundreds of photographs of the ruins, enhancing them, and digitally processing them using photogrammetry software in order to create textured three-dimensional geometry. This geometry is then further cleaned up using Blender 3D modelling software to create the finished models. These models are then incorporated into the digital environment that has been created in the Unity game engine software.

Secondly, the project allows the user to interact with specific areas of the environment, enabling them to digitally ‘restore’ parts of the ruined structures. The restoration is based upon archive images of the original structures which have been sourced through research and is achieved through digitally modelling items such as doors, windows, rooves, and gardens.

To complement these core aspects of the project, and to attempt to create a digital historical ‘experience’, the virtual environment has a number of features that help to bring the project to life. These include:

- A dynamic day/night cycle (and the ability to alter the length of the day through the user interface), including realistic simulations of the movement of the sun, moon, and stars.

- Dynamic ambient sound, such as water and wind audio effects

- Atmospheric effects, such as moving clouds (with shadows), sun and moon ‘god’ rays, and simulated wind

- Flora and fauna, including birds, butterflies, trees, bushes, grasses, flowers, and plants

- Animated doors and ‘restoration’ features

- A fully-modelled terrain featuring Radford lake, woods, footpaths, and a road/track

Finally, a pause menu provides access to some of the archive material on which the restoration is based. The user is able to view photographs of the Boathouse as it appeared from the late 1880s to the early 1900s and textual information gives context and background to the project.

## Background Research

My research was divided into two broad areas: (1) photogrammetry software and techniques, and (2) surveying suitable sites for digital recreation and sourcing archive images.

## Software

<p>Having carried out some research on the various photogrammetry software packages available and the recommended shooting techniques and workflow, I decided to use RealityCapture. This seemed to combine speed of processing with an intuitive workflow. Below is a link to the, admittedly somewhat rough, result of my <a href="{{ site.baseurl }}/dat612-photogrammetry-with-realitycapture-test1/">first proper test</a>, carried out in my back garden.</p>

<p><a href="https://skfb.ly/6HoAq">https://skfb.ly/6HoAq</a></p>

I took 72 photographs in RAW mode using my Nikon D3200 DSLR. RealityCapture processed the images, creating a 3D model in approximately 30 minutes. Photographs were taken from ground level, hence the missing shed roof (the camera didn’t see it). Also, reflective surfaces (such as windows) are difficult for the software to process, so these appear distorted.

It was interesting to partially capture the interior of the shed (through the green door), and it seemed to pay to capture more images as I traversed around the corners of the house and shed. This technique would prove useful when photographing the interior areas of the buildings used in the final assets.

<p>My <a href="{{ site.baseurl }}/dat612-photogrammetry-with-realitycapture-test2-the-armoury/">second test</a> was carried out on a section of my proposed subject for digital restoration: the Armoury building at the Boathouse at St. Keverne’s Quay, Radford Lake. While the circumstances of the photo shoot were not ideal (a blue-sky day with strong, low sunlight caused shadowing on the outside of the structure), I was satisfied with the result which can be seen at the link below.</p>

<p><a href="https://skfb.ly/6HNFv">https://skfb.ly/6HNFv</a></p>

The above model was created from approximately 400 photographs taken over two days. This number of photographs is probably excessive. However, I encountered a number of issues during the processing of the images in RealityCapture which led to missing portions of the structure (the chimney) and decided to repeat the photo shoot in an attempt to fill the gaps.

Clearly there are a number of anomalies, especially around the chimney, and there are some floating artefacts which need to be addressed. However, I was pleased with the appearance of the building’s texture and the fact that I have been able to capture small details, such as the ‘1640’ inscription above the fireplace.

## Site Surveys/Archive Images

Initially, I made use of social media to spread awareness of my project and to gain some possible suggestions for sites suitable for digital recreation. Through Facebook, I contacted the Plymouth Archaeological Society (PAS) and The Friends of Radford Woods.

A member of the PAS suggested the now derelict saw mill that stands at the head of Waterhead Creek near South Pool in Devon.  I was also advised that the Kingsbridge Cookworthy Museum held archive photographs of the mill when it was a going concern.

Following my muddy visit to the saw mill site, I paid a visit to the resource centre at the Kingsbridge Cookworthy Museum. With the help of the staff, I was able to view the range of photographs of the mill. Unfortunately, the majority of them were, for one reason or another, unusable; the most useful image is this postcard of a painting of the mill dating from the early 1900s:

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/postcard"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/postcard" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/postcard 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/postcard 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/postcard 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

The lack of detailed photographs would make a digital restoration of this site challenging. It was also a large site on a steep bank and approximately an hour’s drive from my home (a consideration when multiple visits would be required). However, the staff at the museum provided me with the details of the Devon Rural Archive where further material might be available.

A visit to the Devon Rural Archive confirmed the lack of archive material relating to the saw mill. There was, however, material available for another site that I had in mind: the Boathouse at Radford Lake. This site lent itself well to my proposed project; it is easily accessible, can be photographed from (almost) 360 degrees, and there are some archive images available from which it would be possible to digitally recreate the structure and its surrounding environment. The staff at the Devon Rural Archive were also able to give me the name of a local historian (Brian Steele) who had written a booklet on the history of Radford. In turn, Brian provided me with contact details for Neill Mitchell, a relative of the last owner of Radford House (now demolished), in the grounds of which the Boathouse once stood. Neill was kind enough to send me some good quality scanned images of photographs and these have proved invaluable in creating the restoration assets.

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/IMG_0131-scaled-1"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/IMG_0131-scaled-1" width="1024" height="768" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/RADFORD-St.-Kevernes-2-circa-1880s-90s-Wightman-scaled-1"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/RADFORD-St.-Kevernes-2-circa-1880s-90s-Wightman-scaled-1" width="1024" height="642" alt="" loading="lazy"></a></figure>

</div>

Additional images were sourced from the internet and from the archives at Plymouth City Council.

## Development and Implementation

Having decided upon and tested suitable photogrammetry software and having found an appropriate site and archive material for a digital recreation, the development process could begin.

## Planning &amp; Modelling the Terrain

The first step was to determine an overall plan and the boundaries of the environment; decisions were taken to establish which assets would be created through photogrammetry, which would need to be modelled from scratch, and which features of the natural geography would be incorporated to create the surroundings into which the created structures would be placed.

To that end, I created an aerial plan of the site with the position of key features marked out which could then be used as a guide within Unity to start modelling the terrain, placing test features, and checking that the scale of the test models was accurate:

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/aerial-plan_33490774068_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/aerial-plan_33490774068_o" width="1018" height="1024" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-16_30_22_46981164925_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-16_30_22_46981164925_o" width="1024" height="540" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-17_16_57_47107898634_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-17_16_57_47107898634_o" width="1024" height="536" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-17_20_09_46981164815_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone_-_dx11_-14_05_2019-17_20_09_46981164815_o" width="1024" height="535" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-17_06_57_47107899574_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-17_06_57_47107899574_o" width="1024" height="539" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-17_09_12_47897224921_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-17_09_12_47897224921_o" width="1024" height="539" alt="" loading="lazy"></a></figure>

</div>

Over the course of the project, the terrain evolved and became more representative of the actual terrain of the location. Pathways through the woods were created, inviting users to explore the environment and to be able to view the areas of interest from different vantage points. Subtle changes in slope and elevation were incorporated, such as those in the formal garden area. Flowers, plants, ferns, and rocks were included to add interest and variation. Practical technical issues were also addressed at this time, such as adding ‘colliders’ to prevent users wandering outside the bounds of the environment or falling in the lake.

## Photogrammetry – Creating the Buildings

At the same time, I made a number of visits to the Boathouse site to begin the photogrammetry process. This involved photographing the buildings from every available angle to acquire full coverage. My original tests had shown that anything that the camera doesn’t see doesn’t get modelled correctly. I purchased a painter’s pole, camera adapter, and a wireless shutter release to attempt to get higher elevation shots.

With the buildings photographed, the images were cleaned up in Photoshop to remove extraneous elements and enhanced in Lightroom to correct camera lens distortion and increase contrast for a better analysis in RealityCapture.

The images are processed in RealityCapture via a series of processes: analysis of the images, the generation of a point cloud, the creation of geometry, decimation (simplification) of the geometry, texturing, and final export as an .FBX file for importing into Unity. The process can be quite lengthy, even with a moderately high-specification PC.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/armoury_feature"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/armoury_feature" width="1024" height="564" alt="" loading="lazy"></a></figure>

The models that RealityCapture generates are of a generally high quality. However, the simplification process introduces some unwanted geometry. This, combined with my inability to cover some of the highest elevations of the structures, meant that further editing of the models was required.

This editing was carried out in Blender and largely involved removing floating artefacts, removing elements created as a result of the simplification process, and closing holes in geometry. This was extremely time-consuming as the models being edited were comprised of millions of vertices. However, the resulting models, once imported into Unity had a much better visual appearance.

The structures that were created from photogrammetry are:

- The armoury (400 photographs)

- The covered walkway and ‘ruin’ (250 photographs)

- The cider press (19 photographs)

- The quay wall (38 photographs)

<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/gKkMz95iqCE" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>

## Creating the 'Restoration'

To simulate the restoration process, a number of assets from the original buildings were required. These included, doors, windows, rooves, hedges, and pillars. These assets were modelled in Blender and then imported into the Unity environment.

A sample of the ‘restoration’ assets:

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/blender_-e__armoury_roofblend-14_05_2019-18_08_08_47897225071_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/blender_-e__armoury_roofblend-14_05_2019-18_08_08_47897225071_o" width="1024" height="586" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/blender_-e__pressblend-14_05_2019-18_09_23_47107899614_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/blender_-e__pressblend-14_05_2019-18_09_23_47107899614_o" width="1024" height="598" alt="" loading="lazy"></a></figure>

</div>

Once these assets were incorporated and correctly scaled and positioned in relation to the original buildings, simulating the restoration was a matter of animating assets based on a user’s line of sight. For example, when a user interacts with the armoury, the roof flies off, the windows and doors shoot smoothly out of sight, the floor lowers into the ground, and the crackling log fire is extinguished (along with the smoke from the chimney). Another keypress from the user reverses this process: everything settles gently back into place and the fire is rekindled. This animation process is applied to all of the restoration assets.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/Unity-2018.3.8f1-Personal-SampleScene.unity-Final-Year-Project-PC-Mac-Linux-Standalone-_DX11_-14_05_2019-19_23_30"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/Unity-2018.3.8f1-Personal-SampleScene.unity-Final-Year-Project-PC-Mac-Linux-Standalone-_DX11_-14_05_2019-19_23_30" width="1024" height="478" alt="" loading="lazy"></a></figure>

The armoury doors have additional interaction, in that the user is able to open and close these with a keypress. This triggers an appropriate audio effect.

## Bringing the Environment to Life

Rather than just exploring a relatively static environment, I wanted the user to be able to experience my creation at any time of day; to be able to look up at the sky and see the clouds moving in the breeze, to see the sway of a tree’s branches, to hear the crackle of the log fire in the armoury and the lapping of water from the lake, and to witness the play of shadows across the formal gardens as the sun set behind the trees. I wanted to bring the environment to life.

To that end, I incorporated the following elements:

- A dynamic day/night cycle (and the ability to alter the length of the day through the user interface), including realistic simulations of the movement of the sun, moon, and stars.

- Dynamic ambient sound, such as water and wind-in-the-trees audio effects. As the user approaches the lake or wooded areas, the effect is more noticeable.

- Particle, shader, lighting, and audio effects combine to simulate the armoury’s cracking log fire. The flames create moving shadows, sparks jump out from the fire, and the light reflects on the restored floor. Smoke rises from the fire and drifts from the top of the chimney.

- Atmospheric effects, such as moving clouds (with shadows), sun and moon ‘god’ rays, and simulated wind.

- Flora and fauna, including birds (with bird calls), butterflies, trees, bushes, grasses, flowers, and plants.

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_50_27_47897234691_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_50_27_47897234691_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_50_54_47897224751_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_50_54_47897224751_o" width="1024" height="479" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_51_44_47107899344_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_51_44_47107899344_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_53_24_46981165975_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-18_53_24_46981165975_o" width="1024" height="476" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-19_00_24_47897234181_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-14_05_2019-19_00_24_47897234181_o" width="1024" height="476" alt="" loading="lazy"></a></figure>

</div>

The pause menu (activated by pressing the TAB key) serves a number of purposes. The user is able to view a slideshow of images and supporting text sourced from research. Additionally, the length of day setting can be adjusted to simulate time-lapse-style visuals. A page of acknowledgements details those individuals and organisations who have provided assistance with this project. Finally, the user can terminate the application by pressing the ‘Exit’ button.

## The Project Result

The outcome of this project is an attractive and dynamic environment in which the user is able to experience and interact with a real-world location. Photogrammetry and painstaking terrain and asset modelling with reference to archive material has resulted in a realistic and accurate representation of the Boathouse and its surroundings. Furthermore, the use of dynamic physical, audio, and atmospheric effects contributes to the overall experience of the environment.

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_31_03_47107899134_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_31_03_47107899134_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_31_31_46981165485_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_31_31_46981165485_o" width="1024" height="479" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_32_09_47107898964_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_32_09_47107898964_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_36_58_46981165295_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_36_58_46981165295_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_37_12_47107898884_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_37_12_47107898884_o" width="1024" height="478" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_40_39_46981165165_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_40_39_46981165165_o" width="1024" height="476" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_41_02_47107898744_o"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/unity-201838f1-personal-samplesceneunity-final-year-project-pc-mac-linux-standalone-_dx11_-16_05_2019-08_41_02_47107898744_o" width="1024" height="478" alt="" loading="lazy"></a></figure>

</div>

## Critical Evaluation

This report has documented the research, development, and implementation of the digital reconstruction and restoration of the Boathouse at Radford project.

Overall, the project has successfully realised the aims stated in the original proposal document. Effective research at an early stage has proved crucial; a considerable amount of time and effort was required to survey potential locations, contact individuals and organisations for assistance, visit museums and libraries, and locate archive imagery to aid the reconstructions. An element of luck also played a part in the steps that led me to acquiring quality scanned images of the Boathouse from Neill Mitchell. Mention should also be made of the feedback that I received from those individuals I contacted, which was positive and encouraging. Early tests of photogrammetry assets were circulated to Plymouth City Council, The Plymouth Archaeological Society, Plymouth University Arts Institute, and the Devon Rural Archive. The unanimous verdict was that the project was really interesting and the results ‘amazing’.

Photogrammetry, being the key technology in this project, has been effectively used to develop the core assets required to create the digital environment. There were some unforeseen issues involved in the photogrammetry process and, due to lack of experience, resolving these took longer than anticipated. However, because the photogrammetry was undertaken at an early stage of the project, sufficient time was available to recognise, understand, and work to rectify aspects of the resulting geometry.  Experience led to the development of a proven basic workflow; the models thus generated have proved to be of a high quality in terms of realism and detail.

The development of original 3D assets used for the simulation of the restoration process using Blender was another time-consuming aspect of the project. The original intention was to create two versions of each of the major assets (such as the armoury building). One would be generated from photogrammetry and the other modelled from scratch in Blender. During the project I reflected that, while this was possible, it would be a very lengthy process and also an unnecessary one. I could use the photogrammetry assets as the basis for the restoration and simply add in the missing elements using 3D models of doors, windows, etc. This realisation also helped to confirm how the mechanics of the restoration simulation would work. Rather than creating two separate environments (for the ‘then’ and ‘now), a single environment, incorporating both sets of assets could be achieved through the user’s ability to switch on and off the restoration elements.

Creating the environment in the Unity game engine proved to be a good choice. Consideration was initially given to both Unity and Unreal Engine; Unity being favoured due to previous experience working with this software and an awareness that its functionality was sufficient to create the environment and incorporate some of the more dynamic features which the project required. Again, early planning of the basic layout of the location meant that the plenty of time could be given to modelling the terrain and incorporating the flora, fauna, and dynamic effects that would contribute to the overall experience of the project. This was an iterative process, beginning with digitally blocking out the major elements of the location, such as the lake, the road, paths, and vegetation. As the project evolved, further elements were added, and the environment was refined accordingly. The day/night cycle was instrumental in bring the location to life. This, in combination with dynamic effects such as wind and water, as well as ambient audio, contributed positively to a life-like experience of the digital recreation. Each stage of the refinement incurred a degradation of the performance of the application; therefore, testing was carried out to ensure that player movement and interaction remained sufficiently responsive. On reflection, and with further experience, it’s possible that Unity environment could be optimised as there is a noticeable performance lag during the exploration of certain highly detailed areas of the terrain. Testing would also need to be undertaken using different hardware setups and platforms to ensure a positive user experience.

The overall aesthetic quality of the project is high, as can be seen in the screenshots in this document. It is interesting to compare the result of the digital recreation with the archive photographs on which they are based; certain photos can be ‘recreated’ by positioning the user in the digital environment in the place from the which the original photo was taken. This is testament to the effectiveness of the photogrammetry process and the thoroughness of the work put into accurately modelling and digitally recreating the Boathouse location on the shore of Radford Lake.
