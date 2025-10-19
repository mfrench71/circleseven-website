---
layout: post
title: DAT503 - Urban API - Plymouth Bomb Sight
date: 2017-03-29 12:15:12 +0000
categories:
- DAT503 - Reflexive Design
- Digital Art and Technology
tags:
- Academic
- DAT503
- Photography
- Photoshop
- Unity
featured_image: 05/Page40-e1490005935534
---
Brief: Urban API is a live project. The project will generate an open real-time intervention or map of the city. The project should map or challenge the city as complex cultural, political and social phenomenon or the project should hack the city in its functions as a whole or aspects of it.

## The Project has TWO components:

<ol>- Methodologies: A series of research, design and production methods will be presented along with practical mini projects to help students build an appropriate set of methodological design and research tools to complete the overall project. As part of this process, some key practical skills will be introduced such as hacking the Open Data and Google Maps API and Unity 3D.

- Planning: Following the introduction, students will be tasked to identify a site (used in the broadest sense) that will be the focus of their project.
</ol>

<h5>Plymouth Bomb Sight</h5>

As a group, we decided to develop a 'Plymouth Bomb Sight' mobile application. This would both map the sites of bombs that fell on Plymouth during World War Two, as well as providing educational and historical background information. The mobile application would provide a Google Maps view of the bomb sites along with an augmented reality camera view interface to the data.

Conceptual sketches and logo ideas:

<div class="gallery">

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-01_33570786571_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-01_33570786571_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-01_33570786571_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-01_33570786571_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-01_33570786571_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-02_33570788761_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-02_33570788761_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-02_33570788761_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-02_33570788761_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-conceptual-sketch-02_33570788761_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-logo-ideas_33570788371_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-logo-ideas_33570788371_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-logo-ideas_33570788371_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-logo-ideas_33570788371_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-logo-ideas_33570788371_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

</div>

## Data Sources

<p>We were able to access bomb site location data for Plymouth via the City Council Archives. The '<a href="http://web.plymouth.gov.uk/archivescatalogue?criteria=bomb+book&amp;operator=AND">Bomb Book</a>' is a collection of around 60 pages detailing the location of bombs that fell over a period totalling approximately two months during World War 2:</p>

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/Page42"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Page42" width="1024" height="848" alt="" loading="lazy"></a><figcaption> Page from Plymouth Bomb Map, from Plymouth City Council Archives</figcaption></figure>

A small JavaScript application was developed using the Google Maps API to store the location of each site as latitude and longitude coordinates within a GeoJSON file. We collected data on approximately 2000 bombs.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/geojson_capture"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/geojson_capture" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/geojson_capture 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/geojson_capture 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/geojson_capture 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a><figcaption>Sample of GeoJSON data</figcaption></figure>

The second data source we accessed was bomb casualty information:

<p><a href="http://www.devonheritage.org/Places/Plymouth/Plymouth5INDEXPAGE.htm">http://www.devonheritage.org/Places/Plymouth/Plymouth5INDEXPAGE.htm</a></p>

As we read through the accounts of those who had died during the bombing of Plymouth, it became clear that whole families had been killed and there were some quite affecting accounts of the victims. We thought this sort of information could be used within our application to lend the data a personal and emotional weight. We decided that if potential users of our application could find out about what happened where they lived or to relatives killed during the war, then this would add tremendous value to our project.

<p>I had in mind the <a href="{{ site.baseurl }}/dat503-on-broadway-paper-review/">'On Broadway' paper by Manovich</a>. When Manovich was testing the application, he observed:</p>

<blockquote><p>"Interestingly, when ordinary New Yorkers interacted with the interface, they immediately located images which were meaningful to them – where they lived or where they were born, for instance. This is much the same as we might explore a more conventional map-based interface such as Google Street View; we tend to first focus on our own town, city, or street."</p>
</blockquote>

Again, we extracted this data and converted it to a JSON file. We wanted to associate casualty data with bomb location data, potentially linking the recorded place of death to a particular bomb. A second small JavaScript application was developed to leverage the Google Maps Geocoding API to take the street address of casualties and convert them to latitude and longitude coordinates. We collected data on approximately 1000 casualties.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/casualty_json"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/casualty_json" width="1024" height="319" alt="" loading="lazy"></a><figcaption>Sample of casualty JSON data</figcaption></figure>

## How it Works

The application determines the geographic location of the user. Their location is marked in the interface by a bold icon.

Initially, bomb data is presented via a Google Maps view, with different bomb types (exploded, unexploded, incendiary and paramines) depicted with different icons. Clicking on a bomb icon in this view informs the user as to the type of bomb clicked on. The user is able to filter bomb data by date using a slider. A list of air raids is also accessible, again allowing the user to see the bombs that were dropped during a particular raid.

An augmented reality camera provides a first-person perspective on the bomb data. Clicking an icon in this view provides access to details about the casualties of the bomb selected. Additional background information is available on buildings and locations in close proximity to the bomb site selected.

Recreation of Charles Church, Plymouth, which was largely destroyed by fire during World War Two:

<div class="embed-container"><iframe src="https://www.youtube.com/embed/jfu0DBpCT8Q" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

Mobile application screen shots:

<div class="gallery">

<figure><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/plymouth-bombsight-air-raid-list_33700017625_o-576x1024.png"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/plymouth-bombsight-air-raid-list_33700017625_o" width="576" height="1024" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-augmented-reality-view_33561359696_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-augmented-reality-view_33561359696_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-augmented-reality-view_33561359696_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-augmented-reality-view_33561359696_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-augmented-reality-view_33561359696_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>
<figure><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/plymouth-bombsight-casualty-details_33700016455_o-576x1024.png"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/plymouth-bombsight-casualty-details_33700016455_o" width="576" height="1024" alt="" loading="lazy"></a></figure>
<figure><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/plymouth-bombsight-casualty-list_33315880710_o-576x1024.png"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/plymouth-bombsight-casualty-list_33315880710_o" width="576" height="1024" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-google-maps-view_33472895031_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-google-maps-view_33472895031_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-google-maps-view_33472895031_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-google-maps-view_33472895031_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-google-maps-view_33472895031_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>
<figure><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/plymouth-bombsight-loading-screen_32886604283_o-576x1024.png"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/plymouth-bombsight-loading-screen_32886604283_o" width="576" height="1024" alt="" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1600,q_auto,f_auto/05/plymouth-bombsight-location-background-information_33561359746_o"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/plymouth-bombsight-location-background-information_33561359746_o" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/plymouth-bombsight-location-background-information_33561359746_o 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/plymouth-bombsight-location-background-information_33561359746_o 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/plymouth-bombsight-location-background-information_33561359746_o 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

</div>

Below is a short promotional video produced to accompany the Plymouth Bomb Sight project:

<div class="embed-container"><iframe src="https://www.youtube.com/embed/UCzb8Z173D8" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

## Evaluation

Evaluation of the mobile application was carried out in a controlled setting i.e. by the members of the project team (although it was also tested 'in the wild' y a member of the team); the process was iterative, beginning from the development of the first version or prototype and continuing until the end of the time allowed for the project.

Informal formative assessment and feedback from our tutors throughout the conceptualisation and development phases were also influential in how the application was developed. We took on board, and implemented, a number of their suggestions which we believe have resulted in an improved end product.

As a result of the ongoing evaluation, there were a number of enhancements and changes made to the application, relating to usability, performance and the overall user experience. Some examples are detailed below:

- Initially, all 2000 bomb sites were being displayed to the user. This resulted in a cluttered display. We decided to implement a timeline control to filter bomb sites by date and to provide a useful user interface control.

- Our original idea had been to concentrate solely on bomb site data. However, following discussions with a number of tutors, we decided to integrate casualty data as well. This gave a much more personal and emotional feel to the application and an enhanced user experience.

- A number of improvements were made to optimise performance. The application requires quite a lot of data to be loaded initially, meaning that there is a delay before the application starts. We added a loading screen to provide visual user feedback while data loads in the background.

