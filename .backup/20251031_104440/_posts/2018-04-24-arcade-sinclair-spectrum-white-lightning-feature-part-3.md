---
layout: post
title: ‘Arcade’ – Sinclair Spectrum White Lightning Feature – Part 3
date: 2018-04-24 15:06:00 +0000
categories:
- Projects
- Retro Computing
tags:
- Photoshop
/featured_image: WhiteLightning-e1670345166147
---
This is the third (and final) part in a series of Spectrum White Lightning articles originally written in the late 1980s (when I was a teenager) for inclusion in our ZX Spectrum fanzine, 'Arcade'. Having re-read my scribblings almost 30 years later, I don't pretend to understand any of it. It might be useful. It might not. If you do find it useful or, at least, interesting, please leave a comment below.

From the user manual:

*"White Lightning* is a high level development system for the Spectrum 48K. It is aimed primarily at the user who has commercial games writing in mind and has the patience to learn a sizeable new language. It is not a games designer and stunning results probably won't be produced overnight, but it does have the power and flexibility to produce software of a commercial standard (with a little perseverance!). "

<p>Read <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-1/">part one</a> and <a href="{{ site.baseurl }}/arcade-sinclair-spectrum-white-lightning-feature-part-2/">part two</a>.</p>

<p>For some further context for these articles, please see<a href="{{ site.baseurl }}/arcade-a-sinclair-zx-spectrum-fanzine/" data-type="post" data-id="121"> 'Arcade' - A Sinclair ZX Spectrum Fanzine</a>.</p>

## White Lightning Feature

Last month we had a program that scrolled a landscape left and right. This month we have a window scrolling in eight possible directions under keyboard control. (Phew! Advanced stuff, eh?)

Type the following proggy into screen 6:

<pre>0: SET 0 COL! 10 ROW! 20 LEN! 5 HGT;<br>1: UP 1 NPX! WCRV;<br>2: DOWN -1 NPX! WCRV;<br>3: LEFT WRL4V; : RIGHT WRR4V;<br>4: KEYS 7 1 KB IF LEFT ENDIF 8 1 KB IF DOWN ENDIF;<br>5: KEY2 1 1 KB IF LEFT ENDIF 1 2 KB IF RIGHT ENDIF;<br>6: TEST SET BEGIN KEYS KEY2 8 2 KB UNTIL;</pre>

That's all it is. Imagine trying to do that in BASIC.

ENTER and SPACE for left and right. CAPS SHIFT and Z for up and down. SYMBOL SHIFT exits.

If you want to use your own keys, then here are the keyboard numbers (what a service!)

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2236-e1520947600686"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2236-e1520947600686" width="300" height="225" alt="" style="border-radius:6px" loading="lazy"></a></figure>

## Notes on conversion:

Line 0: sets up the dimensions and positions of the window.

Line 1: defines UP. NPX is the number of pixels and WCRV is scrolling the window vertically with wrap.

Line 2: defines DOWN. As UP but -1 NPX indicates a downward scroll.

Line 3: defines LEFT and RIGHT. WRL4V and WRR4V are commands to scroll the window left and right by 4 pixels with wrap.

Lines 4 and 5: polls the keyboard.

Line 6: executes the program until SYMBOL SHIFT is pressed.

Next month: Who knows, I certainly don't. Something good as usual.

Matthew F.

## The Originals

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2234"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2234" width="225" height="300" alt="" style="border-radius:6px" loading="lazy"></a></figure>
<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2235"><img src="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/2022/12/IMG_2235" width="225" height="300" alt="" style="border-radius:6px" loading="lazy"></a></figure>
