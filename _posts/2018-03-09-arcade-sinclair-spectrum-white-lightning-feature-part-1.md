---
layout: post
title: '''Arcade'' - Sinclair Spectrum White Lightning Feature - Part 1'
date: 2018-03-09 08:50:00 +0000
categories:
- Projects
- Retro Computing
featured_image: 03/WhiteLightning-e1670345166147
---

This is part one an a series of Spectrum White Lightning articles originally written in the late 1980s (when I was a teenager) for inclusion in our ZX Spectrum fanzine, 'Arcade'. Having re-read my scribblings almost 30 years later, I don't pretend to understand any of it. It might be useful. It might not. If you do find it useful or, at least, interesting, please leave a comment below.

From the user manual:

*"White Lightning* is a high level development system for the Spectrum 48K. It is aimed primarily at the user who has commercial games writing in mind and has the patience to learn a sizeable new language. It is not a games designer and stunning results probably won't be produced overnight, but it does have the power and flexibility to produce software of a commercial standard (with a little perseverance!). "

<p>For some further context for this article, please see <a href="{{ site.baseurl }}/arcade-a-sinclair-zx-spectrum-fanzine/">'Arcade' - A Sinclair ZX Spectrum Fanzine</a>.</p>

## White Lightning Feature

<p>This feature is to help owners of White Lightning to get good, fast results from the package and to produce small routines to incorporate into larger Forth/BASIC programs to create 'arcade' quality games. I have included notes on the programs to help <a href="http://www.worldofspectrum.org/infoseekid.cgi?id=0008327">Laser BASIC</a> owners convert to their language.</p>

The first routine you may recognise as a part of the demonstration.

<pre>0: DELAY 500 0 DO NOOP LOOP;<br>1: SET COL! ROW! SPN! PUTBLS DELAY;<br>2: SET1 45 10 10 SET;<br>3: SET2 46 10 10 SET;<br>4: SET3 47 10 10 SET;<br>5: SET4 48 10 10 SET;<br>6: GO 40 0 DO SET1 SET2 SET3 SET4 LOOP;</pre>

After that, type <code>6 LOAD</code> and then <code>GO</code>.

## Notes on conversion:

Line 0: defines a word called <code>DELAY</code> which does a no-operation (does nothing) (NOOP) loop 0 - 500 to act as a pause.

Line 1: sets up the parameters of the column, row, and sprite number. It also includes <code>PUTBLS</code> which block-moves sprite data from sprite to screen, and the pause in <code>DELAY</code>. This line saves typing because you can now enter the values as in lines 2, 3, 4, and 5.

Lines 2 - 5: puts column, row, and sprite number values into line 1 parameters and also executes <code>PUTBLS</code> and <code>DELAY</code>.

Line 6: executes all definitions 40 times.

The routine can be sped up or slowed down by changing the value of <code>DELAY</code> in line 0.

The routine can be lengthened or shortened by changing the value of the loop in line 6.

Next month: improvements on this routine and something new (I hope!).

Send any routines to me at my usual place of residence (not Adam's!)

Matthew F.

## The Originals

<div class="gallery">

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2230-e1520611800537-scaled.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/12/IMG_2230-e1520611800537" width="225" height="300" alt="" style="border-radius:6px" loading="lazy"></a></figure>
<figure><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2231-e1520611813740-scaled.jpg"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/12/IMG_2231-e1520611813740" width="225" height="300" alt="" style="border-radius:6px" loading="lazy"></a></figure>

</div>
