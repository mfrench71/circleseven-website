---
layout: post
title: 'DAT 406 - Arduino: Potentiometer-controlled LED'
date: 2016-02-02 08:44:57 +0000
categories:
- DAT406 - Digital Making
- Digital Art and Technology
tags:
- Arduino
- DAT406
- Programming
featured_image: IMG_1673-scaled-1
description: "Arduino tutorial using a potentiometer to control LED flashing speed with analogue input reading and serial output debugging."
---
This is the result of a practical task with [Arduino](http://www.arduino.cc) that uses a potentiometer to vary the flashing speed of an LED. The code listed in this article takes the analogue input from the potentiometer. This value is then used to vary the time between the LED being on and being off.

Arduino code:
```generic
int sensorPin = 0;
int ledPin = 13;

void setup() {
pinMode(ledPin, OUTPUT);
Serial.begin(9600);
}

void loop() {
int sensorValue = analogRead(sensorPin);
digitalWrite(ledPin, HIGH);
delay(sensorValue);
digitalWrite(ledPin, LOW);
delay(sensorValue);
Serial.println(sensorValue);
}
```
Result:

<div class="embed-container"><iframe src="https://www.youtube.com/embed/fOmaUUZdB6U" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>