---
layout: post
title: "‘Arcade’ – Sinclair Spectrum White Lightning Feature – Part 3"
date: 2018-04-24 15:06:00 +0000
categories: Projects Retro Computing
---

<!-- wp:paragraph -->
<p>This is the third (and final) part in a series of Spectrum White Lightning articles originally written in the late 1980s (when I was a teenager) for inclusion in our ZX Spectrum fanzine, 'Arcade'. Having re-read my scribblings almost 30 years later, I don't pretend to understand any of it. It might be useful. It might not. If you do find it useful or, at least, interesting, please leave a comment below.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>From the user manual:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><em>"White Lightning</em>&nbsp;is a high level development system for the Spectrum 48K.&nbsp;It is aimed primarily at the user who has commercial games writing in mind and has the patience to learn a sizeable new language. It is not a games designer and stunning results probably won't be produced overnight, but it does have the power and flexibility to produce software of a commercial standard (with a little perseverance!). "</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Read <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-1/">part one</a> and <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-2/">part two</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>For some further context for these articles, please see<a href="{{ site.baseurl }}/arcade-a-sinclair-zx-spectrum-fanzine/" data-type="post" data-id="121"> 'Arcade' - A Sinclair ZX Spectrum Fanzine</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>White Lightning Feature</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Last month we had a program that scrolled a landscape left and right. This month we have a window scrolling in eight possible directions under keyboard control. (Phew! Advanced stuff, eh?)</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Type the following proggy into screen 6:</p>
<!-- /wp:paragraph -->

<!-- wp:preformatted -->
<pre class="wp-block-preformatted">0: SET 0 COL! 10 ROW! 20 LEN! 5 HGT;<br>1: UP 1 NPX! WCRV;<br>2: DOWN -1 NPX! WCRV;<br>3: LEFT WRL4V; : RIGHT WRR4V;<br>4: KEYS 7 1 KB IF LEFT ENDIF 8 1 KB IF DOWN ENDIF;<br>5: KEY2 1 1 KB IF LEFT ENDIF 1 2 KB IF RIGHT ENDIF;<br>6: TEST SET BEGIN KEYS KEY2 8 2 KB UNTIL;</pre>
<!-- /wp:preformatted -->

<!-- wp:paragraph -->
<p>That's all it is. Imagine trying to do that in BASIC.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>ENTER and SPACE for left and right. CAPS SHIFT and Z for up and down. SYMBOL SHIFT exits.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>If you want to use your own keys, then here are the keyboard numbers (what a service!)</p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"ids":[99],"linkTo":"media","sizeSlug":"medium","align":"left"} -->
<figure class="wp-block-gallery alignleft has-nested-images columns-default is-cropped"><!-- wp:image {"id":99,"sizeSlug":"medium","linkDestination":"media","style":{"border":{"radius":"6px"}}} -->
<figure class="wp-block-image size-medium has-custom-border"><a href="https://res.cloudinary.com/circleseven/image/upload/IMG_2236-e1520947600686-scaled.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/IMG_2236-e1520947600686-300x225.jpg" alt="" class="wp-image-99" style="border-radius:6px"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph -->
<p><strong>Notes on conversion:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 0: sets up the dimensions and positions of the window.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 1: defines UP. NPX is the number of pixels and WCRV is scrolling the window vertically with wrap.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 2: defines DOWN. As UP but -1 NPX indicates a downward scroll.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 3: defines LEFT and RIGHT. WRL4V and WRR4V are commands to scroll the window left and right by 4 pixels with wrap.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Lines 4 and 5: polls the keyboard.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 6: executes the program until SYMBOL SHIFT is pressed.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Next month: Who knows, I certainly don't. Something good as usual.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Matthew F.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>The Originals</strong></p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media","sizeSlug":"medium","align":"left"} -->
<figure class="wp-block-gallery alignleft has-nested-images columns-default is-cropped"><!-- wp:image {"id":102,"sizeSlug":"medium","linkDestination":"media","style":{"border":{"radius":"6px"}}} -->
<figure class="wp-block-image size-medium has-custom-border"><a href="https://res.cloudinary.com/circleseven/image/upload/IMG_2234-scaled.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/IMG_2234-225x300.jpg" alt="" class="wp-image-102" style="border-radius:6px"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":100,"sizeSlug":"medium","linkDestination":"media","style":{"border":{"radius":"6px"}}} -->
<figure class="wp-block-image size-medium has-custom-border"><a href="https://res.cloudinary.com/circleseven/image/upload/IMG_2235-scaled.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/IMG_2235-225x300.jpg" alt="" class="wp-image-100" style="border-radius:6px"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->