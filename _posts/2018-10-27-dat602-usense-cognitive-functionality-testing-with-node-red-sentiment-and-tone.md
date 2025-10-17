---
layout: post
title: "DAT602 - uSense Cognitive Functionality Testing with Node-RED - Sentiment and Tone"
date: 2018-10-27 08:08:18 +0000
categories: ["DAT602 - Everyware", "Digital Art and Technology"]
tags: ["DAT602", "Sound"]

---
As part of the uSense project, we are intending that the device will be able to gauge a person's mood through the things they say, their facial features, and their social media postings. We can leverage IBM's Cognitive Services that are provided with IBM Watson.

The relevant services include tone analysis, sentiment analysis, visual recognition, and speech to text.

Having never used this functionality, I decided to create some simple tests using Node-RED and the Watson nodes that are available as plug-ins.

**Speech to Text Sentiment Analysis**

My first test was with the speech to text functionality. This was done using Node-RED via IBM Bluemix on my laptop.

"The Speech To Text converts the human voice into the written word. This service uses machine intelligence to combine information about grammar and language structure with knowledge of the composition of the audio signal to generate a more accurate transcription."

This would use my laptop's built-in microphone to record my voice and then convert what was said to text. This text would then be passed to a sentiment analysis node to determine a basic positive/neutral/negative score.

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/speech_to_text_node.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/speech_to_text_node.png" alt="" loading="lazy"></a></figure>

The results from different spoken words:

"I feel totally stressed today"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.42.45.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.42.45.png" alt="" loading="lazy"></a></figure>

"I'm having a fantastic time"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.43.14.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.43.14.png" alt="" loading="lazy"></a></figure>

"It is 12:43pm"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.44.13.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-27-at-12.44.13.png" alt="" loading="lazy"></a></figure>

**Tweet Sentiment Analysis**

The following flow is similar to the speech to text sentiment analysis flow. This time, I used the Twitter input node to monitor the tweets of a specific user (me):

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/edit_twitter_input_node.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/edit_twitter_input_node.png" alt="" loading="lazy"></a></figure>

Once some text is tweeted, the flow analyses the text of the tweet and scores it, again, with a basic positive/neutral/negative sentiment value.

<figure><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-13.19.54.png" alt="" loading="lazy"></figure>

The results from different tweets:

"I feel very unhappy today"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.44.41.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.44.41.png" alt="" loading="lazy"></a></figure>

Returns a negative sentiment result.

"I feel very happy today"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.46.14.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.46.14.png" alt="" loading="lazy"></a></figure>

Returns a positive sentiment result.

**Tone Analysis**

"The Tone Analyzer service uses linguistic analysis to detect emotional tones, social propensities, and writing styles in written communication."

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-13.20.15.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-13.20.15.png" alt="" loading="lazy"></a></figure>

The results from two very different sentences:

"I hate you"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.09.36.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.09.36.png" alt="" loading="lazy"></a></figure>

"I love you"

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.10.02.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-10-26-at-15.10.02.png" alt="" loading="lazy"></a></figure>

As can be seen, 'anger' and other negative tones score highly for the first sentence, while 'joy' scores highly for the second sentence with the other tones scoring zero.

**GitHub**

As I have developed these Node-RED flows, I have exported the flows as JSON so that they can be shared and imported by other users.

<p><a href="https://github.com/mfrench71/DAT602" target="_blank" rel="noreferrer noopener">https://github.com/mfrench71/DAT602</a></p>
