---
layout: post
title: "DAT 405 - Week 1 - Processing Programming Language"
date: 2015-11-24 08:58:24 +0000
categories: ["DAT405 - Creative Coding", "Digital Art and Technology"]
tags: ["DAT405", "JavaScript"]

---
Today we were introduced to the Processing programming language (<a href="http://www.processing.org">http://www.processing.org</a>).

Working through six practical tasks, we became familiar with:
 	- Declaring variables names and their types e.g. String, int and float
 	- Assigning values to variables
 	- Performing calculations using mathematical operators e.g. addition and multiplication
 	- Outputting to the console, including concatenation
 	- Commenting code

The final Processing code produced was:
```generic
// Declare variables:

String forename;
char gender;
int age;
float feet;
int numberOfDays;
int numberOfHours;
int numberOfMinutes;
int numberOfMinutesTo;
int numberOfHoursTo;

// Assign variables:

forename = "Matthew";
gender = 'M';
age = 44;
feet = 6.0;

// Set number of days since last birthday and calculate hours and minutes this equates to

numberOfDays = 1;

numberOfHours = numberOfDays * 24;
numberOfMinutes = numberOfHours * 60;

// Calculate hours and minutes to next birthday based on 365 minus number of days since last birthday

numberOfHoursTo = (365-numberOfDays) * 24;
numberOfMinutesTo = numberOfHoursTo * 60;

// Print output with inline calculations

println(forename + " is " + gender + " and is " + age + " years old.");
println(forename + " is " + feet*0.3048 + " metres tall.");
println("The number of days since my last birthday is: " + numberOfDays);
println("The number of days until my next birthday is: " + (365-numberOfDays));
println("");

// Insert tab with 't' character

println("ttWeeks,tDaystHourstSeconds");
println("Since last birthdayt" + (numberOfDays/7) + "t" + numberOfDays + "t" + numberOfHours + "t" + (numberOfMinutes * 60));
println("Until next birthdayt" + (365-numberOfDays)/7 + "t" + (365-numberOfDays) + "t" + numberOfHoursTo + "t" + (numberOfMinutesTo * 60));
```