---
layout: post
title: DAT 505 - Assignment Part 2 - Python Chatbot
date: 2016-10-25 09:58:46 +0000
categories:
- DAT505 - Advanced Creative Coding
- Digital Art and Technology
tags:
- DAT505
- Python
- Programming
featured_image: python_chat_feature
description: "Python chatbot using Wikipedia API and Beautiful Soup web scraping to provide intelligent conversation and birth year facts."
---
Brief: In the practical session you will create an interactive Python chatbot. This should engage the user in interesting and intelligent conversation. The bot should be able to ask and answer questions. Try to make it as realistic and life-like as possible.

Below is a demonstration of the completed chatbot script:

<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/XsKA09tUvXQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>

The main features of the script are:

- Use of stop words to filter out non-meaningful user input

- User's name is checked against a dictionary of 5000+ common first names

- The Python Wikipedia library is used to provide responses to user's questions

- The urllib and Beautiful Soup libraries are used to present a set of 'interesting facts' about the user's year of birth, scraped from the web

