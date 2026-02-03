---
layout: post
title: Book Assembly: Building a Privacy-Focused Book Tracker
date: 2026-02-03T09:56:00.000Z
categories:
  - Projects
tags:
  - Web Development
  - Programming
  - JavaScript
image: Screenshot_2026-02-03_at_10.04.40
last_modified_at: 2026-02-03 10:06:12
---

It's been a while since I posted here. Most of my recent energy has gone into a side project that started small and grew into something real.

## The Problem

I wanted a simple way to track my books. I collect secondhand books - charity shops, car boot sales, Hay-on-Wye -and I kept buying duplicates because I couldn't remember what I already owned.

I tried Goodreads, but the interface felt dated and I wasn't comfortable with Amazon owning my reading data. Other alternatives either lacked features I wanted or had the same privacy concerns.

So I built my own.

## Book Assembly

[Book Assembly](https://bookassembly.co.uk) is a personal book tracking app. It lets you catalogue your library, track what you're reading, organise with lists and series, and see stats about your reading habits.

The core principle is privacy - no ads, no tracking, no data selling. Your library is yours.

### Key Features

- **Barcode scanning** for adding books quickly
- **Goodreads import** to migrate your existing library
- **Series tracking** with reading progress
- **Reading stats** including activity heatmaps and streaks
- **Reading progress** with page-level tracking
- **Custom lists** for flexible organisation (TBR, book club, etc.)
- **Offline browsing** via PWA with cached library data
- **Library health check** to find and fix missing metadata
- **Full data export** in JSON and CSV

### Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Hosting:** Netlify
- **Book data:** Google Books and Open Library APIs

It's a Progressive Web App, so it works on any device and can be added to your home screen.

## What I've Learned

This project has been an exercise in scope management. What started as "scan barcodes, check if I own it" turned into a full reading tracker with stats, imports, series tracking, and a blog.

Some things I've enjoyed working through:

- **Offline-first thinking** - caching strategies with Firestore persistent cache and service workers
- **Data modelling** - designing a reading status system that handles re-reads, pauses, and DNFs without impossible states
- **Import pipelines** - parsing Goodreads CSV exports and mapping their data model to mine
- **Mobile-first UI** - building something that works well in a charity shop with one hand

## Current State

Book Assembly is in open beta. It's free to use and I'm actively developing it based on user feedback. The codebase is private but I'm building in public — there's a subreddit at [r/BookAssembly](https://www.reddit.com/r/BookAssembly) and a [blog](https://bookassembly.co.uk/blog) with development updates.

If you track your reading — or want to start — feel free to give it a try at [bookassembly.co.uk](https://bookassembly.co.uk).