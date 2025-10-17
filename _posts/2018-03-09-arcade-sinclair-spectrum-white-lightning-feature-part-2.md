---
layout: post
title: "‘Arcade’ – Sinclair Spectrum White Lightning Feature – Part 2"
date: 2018-03-09 09:29:00 +0000
categories: Projects Retro Computing
---

<!-- wp:paragraph -->
<p>This is part two in a series of Spectrum White Lightning articles originally written in the late 1980s (when I was a teenager) for inclusion in our ZX Spectrum fanzine, 'Arcade'. Having re-read my scribblings almost 30 years later, I don't pretend to understand any of it. It might be useful. It might not. If you do find it useful or, at least, interesting, please leave a comment below.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>From the user manual:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><em>"White Lightning</em>&nbsp;is a high level development system for the Spectrum 48K.&nbsp;It is aimed primarily at the user who has commercial games writing in mind and has the patience to learn a sizeable new language. It is not a games designer and stunning results probably won't be produced overnight, but it does have the power and flexibility to produce software of a commercial standard (with a little perseverance!). "</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Read <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-1/">part one</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>For some further context for these articles, please see <a href="{{ site.baseurl }}/arcade-a-sinclair-zx-spectrum-fanzine/">'Arcade' - A Sinclair ZX Spectrum Fanzine</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>White Lightning Feature</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Yes, I've made it! Never fear! This feature has made it to its next month. Amazing, isn't it? Anyway, with the sprites in memory, type this into screen 6 and then type <code>6 LOAD</code> and then <code>TEST 1</code> and press 'Enter':</p>
<!-- /wp:paragraph -->

<!-- wp:preformatted -->
<pre class="wp-block-preformatted">0: SET 44 SPN!;<br>1: LEFT WRR1M PUTBLS;<br>2: RIGHT WRL1M PUTBLS;<br>3: TEST 1 1 KB IF LEFT ENDIF 8 1 KB IF RIGHT ENDIF;<br>4: TEST 1: ATTOFF SET BEGIN TEST 8 2 KB UNTIL;</pre>
<!-- /wp:preformatted -->

<!-- wp:paragraph -->
<p>Don't be alarmed if nothing happens, just press 'Caps Shift' or 'Space' and watch...</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>'Symbol Shift' gets you out.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>This routine would be useful if you had a game like <a href="http://www.worldofspectrum.org/infoseekid.cgi?id=0009372">Lunar Jetman</a> (in my opinion, the most addictive game yet) which had a scrolling landscape rather like the one in this routine.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>When you press 'Space', the landscape goes left, and right when you press 'Caps Shift', rather than the expected right for 'Space' and left for 'Caps' because this simulates a character going over the landscape from left to right and so the landscape would go left and vice-versa.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Notes on conversion:</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 0: sets up sprite 44 - the lunar landscape.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 1: defines left as WRR1M - scrolling a sprite 1 pixel right with wrap.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Lines 2: as line 1, but scrolls left.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 3: tests to see if SPACE or CAPS SHIFT are pressed and executes to words LEFT or RIGHT accordingly.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Line 4: Switches attributes off. Tests to see if SYMBOL SHIFT is pressed and stops if it is, other it executes TEST to continue the routine.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Now the improvements on the program with the ball in last month's issue. For those who didn't get last month's issue (tsk, tsk!), <a href="http://www.circleseven.co.uk/2018/03/09/arcade-spectrum-white-lightning-feature-part-1/">here's the program again</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Change line 0 to:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>0: DELAY 500 0 DO 0.1 BLEEP NOOP LOOP;</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>OR (not as well!)</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Add line 7:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>7: GO2 GO SET4 SET3 SET2 SET1; --&gt;</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>SCR#7:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>0: FINAL GO GO2;</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Type <code>6 LOAD</code> then <code>FINAL</code>.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>The Originals</strong></p>
<!-- /wp:paragraph -->

<!-- wp:gallery {"linkTo":"media","sizeSlug":"medium","align":"left"} -->
<figure class="wp-block-gallery alignleft has-nested-images columns-default is-cropped"><!-- wp:image {"id":59,"sizeSlug":"full","linkDestination":"media","style":{"border":{"radius":"6px"}}} -->
<figure class="wp-block-image size-full has-custom-border"><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2232-e1520612840652-scaled.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2022/12/IMG_2232-e1520612840652-scaled.jpg" alt="" class="wp-image-59" style="border-radius:6px"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"id":60,"sizeSlug":"medium","linkDestination":"media","style":{"border":{"radius":"6px"}}} -->
<figure class="wp-block-image size-medium has-custom-border"><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2233-e1520612866457-scaled.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2022/12/IMG_2233-e1520612866457-225x300.jpg" alt="" class="wp-image-60" style="border-radius:6px"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->