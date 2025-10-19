---
layout: post
title: DAT602 - uSense Cognitive Functionality Testing with Node-RED - Sentiment and
  Tone
date: 2018-10-27 08:08:18 +0000
categories:
- DAT602 - Everyware
- Digital Art and Technology
tags:
- DAT602
- Sound
featured_image: 05/Screenshot-2018-10-27-at-12.48.21
---
As part of the uSense project, we are intending that the device will be able to gauge a person's mood through the things they say, their facial features, and their social media postings. We can leverage IBM's Cognitive Services that are provided with IBM Watson.

The relevant services include tone analysis, sentiment analysis, visual recognition, and speech to text.

Having never used this functionality, I decided to create some simple tests using Node-RED and the Watson nodes that are available as plug-ins.

## Speech to Text Sentiment Analysis

My first test was with the speech to text functionality. This was done using Node-RED via IBM Bluemix on my laptop.

"The Speech To Text converts the human voice into the written word. This service uses machine intelligence to combine information about grammar and language structure with knowledge of the composition of the audio signal to generate a more accurate transcription."

This would use my laptop's built-in microphone to record my voice and then convert what was said to text. This text would then be passed to a sentiment analysis node to determine a basic positive/neutral/negative score.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/speech_to_text_node"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/speech_to_text_node" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/speech_to_text_node 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/speech_to_text_node 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/speech_to_text_node 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

The results from different spoken words:

"I feel totally stressed today"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-27-at-12.42.45"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.42.45" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.42.45 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.42.45 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.42.45 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

"I'm having a fantastic time"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-27-at-12.43.14"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.43.14" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.43.14 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.43.14 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.43.14 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

"It is 12:43pm"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-27-at-12.44.13"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.44.13" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.44.13 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.44.13 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-27-at-12.44.13 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

## Tweet Sentiment Analysis

The following flow is similar to the speech to text sentiment analysis flow. This time, I used the Twitter input node to monitor the tweets of a specific user (me):

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/edit_twitter_input_node"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/edit_twitter_input_node" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/edit_twitter_input_node 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/edit_twitter_input_node 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/edit_twitter_input_node 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

Once some text is tweeted, the flow analyses the text of the tweet and scores it, again, with a basic positive/neutral/negative sentiment value.

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-13.19.54"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.19.54" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.19.54 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.19.54 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.19.54 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

The results from different tweets:

"I feel very unhappy today"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-15.44.41"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.44.41" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.44.41 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.44.41 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.44.41 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

Returns a negative sentiment result.

"I feel very happy today"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-15.46.14"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.46.14" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.46.14 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.46.14 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.46.14 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

Returns a positive sentiment result.

## Tone Analysis

"The Tone Analyzer service uses linguistic analysis to detect emotional tones, social propensities, and writing styles in written communication."

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-13.20.15"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.20.15" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.20.15 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.20.15 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-13.20.15 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

The results from two very different sentences:

"I hate you"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-15.09.36"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.09.36" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.09.36 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.09.36 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.09.36 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

"I love you"

<figure><a href="https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/05/Screenshot-2018-10-26-at-15.10.02"><img src="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,h_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.10.02" srcset="https://res.cloudinary.com/circleseven/image/upload/c_limit,w_400,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.10.02 400w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_800,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.10.02 800w, https://res.cloudinary.com/circleseven/image/upload/c_limit,w_1200,q_auto,f_auto/05/Screenshot-2018-10-26-at-15.10.02 1200w" sizes="(max-width: 768px) 100vw, 800px" alt="" loading="lazy"></a></figure>

As can be seen, 'anger' and other negative tones score highly for the first sentence, while 'joy' scores highly for the second sentence with the other tones scoring zero.

## GitHub

As I have developed these Node-RED flows, I have exported the flows as JSON so that they can be shared and imported by other users.

<p><a href="https://github.com/mfrench71/DAT602" target="_blank" rel="noreferrer noopener">https://github.com/mfrench71/DAT602</a></p>
