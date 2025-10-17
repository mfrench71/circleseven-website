---
layout: post
title: "‘Arcade’ – Sinclair Spectrum White Lightning Feature – Part 2"
date: 2018-03-09 09:29:00 +0000
categories: ["Projects", "Retro Computing"]
---

This is part two in a series of Spectrum White Lightning articles originally written in the late 1980s (when I was a teenager) for inclusion in our ZX Spectrum fanzine, 'Arcade'. Having re-read my scribblings almost 30 years later, I don't pretend to understand any of it. It might be useful. It might not. If you do find it useful or, at least, interesting, please leave a comment below.

From the user manual:

*"White Lightning* is a high level development system for the Spectrum 48K. It is aimed primarily at the user who has commercial games writing in mind and has the patience to learn a sizeable new language. It is not a games designer and stunning results probably won't be produced overnight, but it does have the power and flexibility to produce software of a commercial standard (with a little perseverance!). "

<p>Read <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-1/">part one</a>.</p>

<p>For some further context for these articles, please see <a href="{{ site.baseurl }}/arcade-a-sinclair-zx-spectrum-fanzine/">'Arcade' - A Sinclair ZX Spectrum Fanzine</a>.</p>

**White Lightning Feature**

Yes, I've made it! Never fear! This feature has made it to its next month. Amazing, isn't it? Anyway, with the sprites in memory, type this into screen 6 and then type <code>6 LOAD</code> and then <code>TEST 1</code> and press 'Enter':

<pre>0: SET 44 SPN!;<br>1: LEFT WRR1M PUTBLS;<br>2: RIGHT WRL1M PUTBLS;<br>3: TEST 1 1 KB IF LEFT ENDIF 8 1 KB IF RIGHT ENDIF;<br>4: TEST 1: ATTOFF SET BEGIN TEST 8 2 KB UNTIL;</pre>

Don't be alarmed if nothing happens, just press 'Caps Shift' or 'Space' and watch...

'Symbol Shift' gets you out.

<p>This routine would be useful if you had a game like <a href="http://www.worldofspectrum.org/infoseekid.cgi?id=0009372">Lunar Jetman</a> (in my opinion, the most addictive game yet) which had a scrolling landscape rather like the one in this routine.</p>

When you press 'Space', the landscape goes left, and right when you press 'Caps Shift', rather than the expected right for 'Space' and left for 'Caps' because this simulates a character going over the landscape from left to right and so the landscape would go left and vice-versa.

**Notes on conversion:**

Line 0: sets up sprite 44 - the lunar landscape.

Line 1: defines left as WRR1M - scrolling a sprite 1 pixel right with wrap.

Lines 2: as line 1, but scrolls left.

Line 3: tests to see if SPACE or CAPS SHIFT are pressed and executes to words LEFT or RIGHT accordingly.

Line 4: Switches attributes off. Tests to see if SYMBOL SHIFT is pressed and stops if it is, other it executes TEST to continue the routine.

<p>Now the improvements on the program with the ball in last month's issue. For those who didn't get last month's issue (tsk, tsk!), <a href="http://www.circleseven.co.uk/2018/03/09/arcade-spectrum-white-lightning-feature-part-1/">here's the program again</a>.</p>

Change line 0 to:

0: DELAY 500 0 DO 0.1 BLEEP NOOP LOOP;

OR (not as well!)

Add line 7:

7: GO2 GO SET4 SET3 SET2 SET1; --&gt;

SCR#7:

0: FINAL GO GO2;

Type <code>6 LOAD</code> then <code>FINAL</code>.

**The Originals**

<figure><figure><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2232-e1520612840652-scaled.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2022/12/IMG_2232-e1520612840652-scaled.jpg" alt="" style="border-radius:6px" loading="lazy"></a></figure>

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2022/12/IMG_2233-e1520612866457-scaled.jpg"><img src="https://www.circleseven.co.uk/wp-content/uploads/2022/12/IMG_2233-e1520612866457-225x300.jpg" width="225" height="300" alt="" style="border-radius:6px" loading="lazy"></a></figure>
</figure>
