---
layout: post
title: "DAT 406 - Arduino: Potentiometer-controlled LED"
date: 2016-02-02 08:44:57 +0000
categories: ["DAT406 - Digital Making", "Digital Art and Technology"]
---

This is the result of a practical task with <a href="http://www.arduino.cc">Arduino</a> that uses a potentiometer to vary the flashing speed of an LED. The code listed in this article takes the analogue input from the potentiometer. This value is then used to vary the time between the LED being on and being off.

Arduino code:
<pre class="EnlighterJSRAW" data-enlighter-language="generic">int sensorPin = 0;
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
}</pre>
Result:

[embed]https://youtu.be/fOmaUUZdB6U[/embed]