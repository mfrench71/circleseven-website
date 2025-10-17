---
layout: post
title: "DAT503 - Urban API - Plymouth Bomb Sight"
date: 2017-03-29 12:15:12 +0000
categories: DAT503 - Reflexive Design Digital Art and Technology
---

<!-- wp:paragraph {"className":"brief"} -->
<p class="brief">Brief: Urban API is a live project. The project will generate an open real-time intervention or map of the city. The project should map or challenge the city as complex cultural, political and social phenomenon or the project should hack the city in its functions as a whole or aspects of it.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>The Project has TWO components:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol><!-- wp:list-item -->
<li>Methodologies: A series of research, design and production methods will be&nbsp;presented along with practical mini projects to help students build an&nbsp;appropriate set of methodological design and research tools to complete the&nbsp;overall project. As part of this process, some key practical skills will be&nbsp;introduced such as hacking the Open Data and Google Maps API and Unity&nbsp;3D.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Planning: Following the introduction, students will be tasked to identify a site&nbsp;(used in the broadest sense) that will be the focus of their project.</li>
<!-- /wp:list-item --></ol>
<!-- /wp:list -->

<!-- wp:heading {"level":5} -->
<h5 class="wp-block-heading">Plymouth Bomb Sight</h5>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>As a group, we decided to develop a&nbsp;'Plymouth Bomb Sight' mobile application. This would both map the sites of bombs that fell on Plymouth during World War Two, as well as providing educational and historical background information. The mobile application would provide a Google Maps view of the bomb sites along with an augmented reality camera view interface to the data.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Conceptual sketches and logo ideas:</p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":838,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-conceptual-sketch-01_33570786571_o.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-conceptual-sketch-01_33570786571_o.jpg" alt="" class="wp-image-838"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":837,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-conceptual-sketch-02_33570788761_o.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-conceptual-sketch-02_33570788761_o.jpg" alt="" class="wp-image-837"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":836,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-logo-ideas_33570788371_o.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-logo-ideas_33570788371_o.jpg" alt="" class="wp-image-836"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p><strong>Data Sources</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>We were able to access bomb site location data for Plymouth via the City Council Archives. The '<a href="http://web.plymouth.gov.uk/archivescatalogue?criteria=bomb+book&amp;operator=AND">Bomb Book</a>' is a collection of around 60 pages detailing the location of bombs that fell over a period totalling approximately two months during World War 2:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":839,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/Page42.jpeg"><img src="https://res.cloudinary.com/circleseven/image/upload/Page42-1024x848.jpeg" alt="" class="wp-image-839"/></a><figcaption class="wp-element-caption"> Page from Plymouth Bomb Map, from Plymouth City Council Archives</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>A small JavaScript application was developed using the Google Maps API to store the location of each site as latitude and longitude coordinates within a GeoJSON file. We collected data on approximately 2000 bombs.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":840,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://res.cloudinary.com/circleseven/image/upload/geojson_capture.jpeg"><img src="https://res.cloudinary.com/circleseven/image/upload/geojson_capture.jpeg" alt="" class="wp-image-840"/></a><figcaption class="wp-element-caption">Sample of GeoJSON data</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>The second data source we accessed was bomb casualty information:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="http://www.devonheritage.org/Places/Plymouth/Plymouth5INDEXPAGE.htm">http://www.devonheritage.org/Places/Plymouth/Plymouth5INDEXPAGE.htm</a></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>As we read through the accounts of those who had died during the bombing of Plymouth, it became clear that whole families had been killed and there were some quite affecting accounts of the victims. We thought this sort of information could be used within our application to lend the data a personal and emotional weight. We decided that if potential users of our application could find out about what happened where they lived or to relatives killed during the war, then this would add tremendous value to our project.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I had in mind the <a href="https://www.circleseven.co.uk/dat503-on-broadway-paper-review/">'On Broadway' paper by Manovich</a>. When Manovich was testing the application, he observed:</p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>"Interestingly, when ordinary New Yorkers interacted with the interface, they immediately located images which were meaningful to them – where they lived or where they were born, for instance. This is much the same as we might explore a more conventional map-based interface such as Google Street View; we tend to first focus on our own town, city, or street."</p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph -->
<p>Again, we extracted this data and converted it to a JSON file. We wanted to associate casualty data with bomb location data, potentially linking the recorded place of death to a particular bomb. A second small JavaScript application was developed to leverage the Google Maps Geocoding API to take the street address of casualties and convert them to latitude and longitude coordinates. We collected data on approximately 1000 casualties.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":841,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/casualty_json.jpeg"><img src="https://res.cloudinary.com/circleseven/image/upload/casualty_json-1024x319.jpeg" alt="" class="wp-image-841"/></a><figcaption class="wp-element-caption">Sample of casualty JSON data</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p><strong>How it Works</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The application determines the geographic location of the user. Their location is marked in the interface by a bold icon.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Initially, bomb data is presented via a Google Maps view, with different bomb types (exploded, unexploded, incendiary and paramines) depicted with different icons. Clicking on a bomb icon in this view informs the user as to the type of bomb clicked on. The user is able to filter bomb data by date using a slider. A list of air raids is also accessible, again allowing the user to see the bombs that were dropped during a particular raid.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>An augmented reality camera provides a first-person perspective on the bomb data. Clicking an icon in this view provides access to details about the casualties of the bomb selected. Additional background information is available on buildings and locations&nbsp;in close proximity to the bomb site selected.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Recreation of Charles Church, Plymouth, which was largely destroyed by fire during World War Two:</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://www.youtube.com/watch?v=jfu0DBpCT8Q","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=jfu0DBpCT8Q
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p>Mobile application screen shots:</p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":845,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-air-raid-list_33700017625_o-576x1024.png" alt="" class="wp-image-845"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":844,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-augmented-reality-view_33561359696_o.png"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-augmented-reality-view_33561359696_o.png" alt="" class="wp-image-844"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":847,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-casualty-details_33700016455_o-576x1024.png" alt="" class="wp-image-847"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":846,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-casualty-list_33315880710_o-576x1024.png" alt="" class="wp-image-846"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":843,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-google-maps-view_33472895031_o.png"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-google-maps-view_33472895031_o.png" alt="" class="wp-image-843"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":848,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-loading-screen_32886604283_o-576x1024.png" alt="" class="wp-image-848"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":842,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-location-background-information_33561359746_o.png"><img src="https://res.cloudinary.com/circleseven/image/upload/plymouth-bombsight-location-background-information_33561359746_o.png" alt="" class="wp-image-842"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p>Below is a&nbsp;short promotional video produced to accompany the Plymouth Bomb Sight project:</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://www.youtube.com/watch?v=UCzb8Z173D8","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=UCzb8Z173D8
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p><strong>Evaluation</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Evaluation of the mobile application was carried out in a controlled setting i.e. by the members of the project team (although it was also tested 'in the wild' y a member of the team); the process was iterative, beginning from the development of the first version or prototype and continuing until the end of the time allowed for the project.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Informal formative assessment and feedback from&nbsp;our tutors throughout the conceptualisation and development phases were also influential in how the application was developed. We took on board, and implemented, a number of their suggestions which we believe have resulted in an improved end product.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>As a result of the ongoing evaluation, there were a number of enhancements and changes made to the application, relating to usability, performance and the overall user experience. Some examples are detailed below:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>Initially, all 2000 bomb sites were being displayed to the user. This resulted in a cluttered display. We decided to implement a timeline control to filter bomb sites by date and to provide a useful user interface control.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Our original idea had been to concentrate solely on bomb site data. However, following discussions with a number of tutors, we decided to integrate casualty data as well. This gave a much more personal and emotional feel to the application and an enhanced user experience.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>A number of improvements were made to optimise performance. The application requires quite a lot of data to be loaded initially, meaning that there is a delay before the application starts. We added a loading screen to provide visual user feedback while data loads in the background.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->