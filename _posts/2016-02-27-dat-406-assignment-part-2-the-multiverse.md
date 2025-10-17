---
layout: post
title: "DAT 406 - Assignment Part 2 - 'The Multiverse'"
date: 2016-02-27 14:12:13 +0000
categories: DAT406 - Digital Making Digital Art &amp; Technology
---

<!-- wp:paragraph {"className":"brief"} -->
<p class="brief">Brief: Your task within your groups is to create an animation using Blender suitable for easy playback within the Immersive Vision Theatre (IVT) exploring the theme of the multiverse.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Multiverse - a definition:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>The multiverse (or meta-universe) is the hypothetical set of finite and infinite possible universes, including the universe we live in. Together, these universes comprise everything that exists: the entirety of space, time, matter, energy, and the physical laws and constants that describe them.</p>
<!-- /wp:paragraph --><cite>https://en.wikipedia.org/wiki/Multiverse</cite></blockquote>
<!-- /wp:quote -->

<!-- wp:paragraph -->
<p><strong>Design Concept</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>With such an open-ended brief, I decided that an abstract concept would be most effective in representing the idea of 'the multiverse'. To that end, I decided to think about the relationship between virtual shape and the physical space of the IVT and how the audience will view the final animation.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":637,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ivtt-1024x820-1.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/ivtt-1024x820-1.jpg" alt="" class="wp-image-637"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>Immersion Vision Theatre at Plymouth University</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I thought it would be interesting to investigate how an animation composed mostly of cubes would work in the circular space and dome of the IVT. At the same time, I wanted to incorporate an organic or natural feel to the movement. Having viewed a number of animations in the dome, I was aware of the effect that camera movement could have on the viewer's pereception of what they were watching. I wanted to make use of sweeping camera movements that really made use of the phyical space of the dome.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Technical Implementation</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The creation of this piece in 3D software, Blender, begins with a mountainous landscape. This was implemented using a sub-divided plane combined with a&nbsp;displacement map and some manual sculpting to raise and lower areas of the landscape. A second plane is created and sub-division and shrink-wrap modifiers are added (the shrink-wrap is set to target the contoured landscape). A cube is created, extended and parented to the shrink-wrapped surface. Duplication &gt; Verts creates a copy of the cube for every vertex of the surface. Some simple modelling of the cube will ensure that there are more edges and surfaces to catch and reflect light.&nbsp;To create the movement of the landscape, the underlying contoured mesh is animated.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Finishing touches involve creating a metallic material for the cubes, adding an environment image, modifying the lighting and adding some compositing effects in Blender's node editor. Finally, the camera is animated and scenes are rendered.</p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media","sizeSlug":"medium"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"id":639,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/01-blender-landscape-mesh_24666379814_o.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/01-blender-landscape-mesh_24666379814_o-300x234.jpg" alt="" class="wp-image-639"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":643,"sizeSlug":"medium","linkDestination":"none"} -->
<figure class="wp-block-image size-medium"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/02-blender-shrinkwrap-mesh_25270766696_o-300x206.jpg" alt="" class="wp-image-643"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":640,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/03-blender-isolated-mesh_24670232283_o.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/03-blender-isolated-mesh_24670232283_o-300x224.jpg" alt="" class="wp-image-640"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":644,"sizeSlug":"medium","linkDestination":"none"} -->
<figure class="wp-block-image size-medium"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/04-blender-duplicated-verts_25001404810_o-284x300.jpg" alt="" class="wp-image-644"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":638,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/05-blender-modelled-cube_25178751652_o.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/05-blender-modelled-cube_25178751652_o-300x218.jpg" alt="" class="wp-image-638"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":642,"sizeSlug":"medium","linkDestination":"none"} -->
<figure class="wp-block-image size-medium"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/06-blender-landscape-solid_25203901931_o-300x203.jpg" alt="" class="wp-image-642"/></figure>
<!-- /wp:image -->

<!-- wp:image {"id":641,"sizeSlug":"medium","linkDestination":"media"} -->
<figure class="wp-block-image size-medium"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/07-blender-node-editor_25001400960_o-scaled.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/07-blender-node-editor_25001400960_o-300x172.jpg" alt="" class="wp-image-641"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p><strong>Audio</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The audio I chose aims to highlight and complement the visuals and dynamic camera movement. There is an industrial piston-like audio track underlying the majority of the animation. This reflects the vertical up-and-down movement of the piece's geometric pattern. A sense of weight and momentum is provide by deep bass 'swooshes' as the landscape revolves.&nbsp;&nbsp;A final reverberating swoosh and a black screen lend tension before the short final coda - a lingering bass blare&nbsp;reminiscent of parts of the movie 'Inception'.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The final animation rendered with an equidistant fisheye lens for dome projection:</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://vimeo.com/156469017","type":"video","providerNameSlug":"vimeo","responsive":true,"className":"wp-embed-aspect-4-3 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-vimeo wp-block-embed-vimeo wp-embed-aspect-4-3 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://vimeo.com/156469017
</div></figure>
<!-- /wp:embed -->