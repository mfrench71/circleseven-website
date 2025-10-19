---
layout: post
title: "DAT602 - Face Recognition with Azure Face API and Python"
date: 2018-11-13 15:31:22 +0000
categories: ["DAT602 - Everyware", "Digital Art and Technology"]
tags: ["Academic", "DAT602", "JavaScript", "Photography", "Python"]

---
<p>Having spent many hours tinkering with Amazon's Rekognition API and making little progress, I decided to investigate the face recognition Face API provided as part of <a href="https://azure.microsoft.com/en-us/services/cognitive-services/face/">Microsoft Azure Cognitive Services</a> (Microsoft, no date).</p>

The API provides functionality to implement face detection ("detect one or more human faces in an image and get back face rectangles for where in the image the faces are, along with face attributes which contain machine learning-based predictions of facial features. The face attribute features available are: Age, Emotion, Gender, Pose, Smile, and Facial Hair along with 27 landmarks for each face in the image") and face verification ("check the likelihood that two faces belong to the same person. The API will return a confidence score about how likely it is that the two faces belong to one person").

If I could get this working, I could use this for our reworked uSense project, the aim of which, now, is to allow face-based authentication via a Raspberry Pi and Pi camera for users to be able to access personalised content (such as their Twitter feed, YouTube playlists, Facebook, etc.).

As I had some familiarity with scripting in Python from previous assignments, I decided to use this to test calls to the face recognition API.

## Testing the Pi Camera

The first step was to ensure that the Pi camera was functioning correctly!

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import picamera camera = picamera.PiCamera()
print('Taking photo')
camera.capture('test.jpg')</pre>

## Testing Face - Detect

<p>The next step was to test the <a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f30395236">Face - Detect API</a> call on a test image. The Python script below will take an image from a local path, post it to Azure's /'detect' endpoint and identify if there are any faces in the photo. If there are, the script will draw a blue rectangle around the faces.</p>

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import urllib, httplib, base64
import requests
from PIL import Image, ImageDraw
import sys
import json

KEY = 'XXXXX'
pic = 'images/Cass/cass_01.jpg'
def recogn():
 headers = {'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': KEY}
 body = open(pic ,'rb')
 params = urllib.urlencode({'returnFaceId': 'true'})
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')# build API endpoint
 conn.request("POST", '/face/v1.0/detect?%s' % params, body, headers) # build API endpoint
 response = conn.getresponse()
 photo_data = json.loads(response.read())

 def getRectangle(faceDictionary):
 rect = faceDictionary['faceRectangle']
 left = rect['left']
 top = rect['top']
 bottom = left + rect['height']
 right = top + rect['width']
 return ((left, top), (bottom, right))
 
 img = Image.open(pic) # open image system argument
 draw = ImageDraw.Draw(img)
 for face in photo_data: # for the faces identified
 draw.rectangle(getRectangle(face), outline='blue') # outline faces
 img.show() # display outlined image 
 
 
recogn()</pre>

Here is a sample test result:

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/face_detect-e1541676689943.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/face_detect-e1541676689943-1024x723.png" width="1024" height="723" alt="" loading="lazy"></a><figcaption>Face detection result</figcaption></figure>

## PersonGroup - Create

<p>With a successful Face - Detect complete, a <a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f30395244">Person Group</a> has to be created for use with identification at a later stage.</p>

"A person group is the container for the uploaded person data, including face images and face recognition features."

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import requests
import urllib, httplib, base64

KEY = 'XXXXX'

group_id = 'users'
body = '{"name": "Users"}'
params = urllib.urlencode({'personGroupId': group_id})
headers = {'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY}

conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
conn.request("PUT", "/face/v1.0/persongroups/{personGroupId}?%s" % params, body, headers)
response = conn.getresponse()
data = response.read()
print(data)
conn.close()</pre>

## PersonGroup Person - Create

With a PersonGroup initialised, it can be populated with people and faces using the PersonGroup Person - Create API call.

I created an images directory with sub-directories containing photographs of the people I wanted to use to train the face recognition system. The subdirectories were named according to the person's name:

<figure><a href="{{ site.baseurl }}/wp-content/uploads/2023/05/faces_photos-e1541679916440.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/faces_photos-e1541679916440.png" alt="" loading="lazy"></a><figcaption>Directory of faces</figcaption></figure>

I wanted to use a variety of images, as, during testing, I noticed that the lighting conditions when a photo was taken had a subsequent impact on the reliability of face detection.

<p><a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f3039523b">Image requirements for the Face API</a>.</p>

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import urllib, httplib, base64, json
import sys
import os
import time

people = ['Cass','Donald','Matthew']
nameAndID = [] # empty list for person's name and personId
group_id = 'users'
KEY = 'XXXXX'

# creates people in personGroup of specified group_Id
def addPeople():
 headers = {'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY}
 params = urllib.urlencode({'personGroupId': group_id})
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 for name in people:
 body = "{'name':'"+name+"'}"
 conn.request("POST", "/face/v1.0/persongroups/{employees}/persons?%s" % params, body, headers)
 response = conn.getresponse()
 data = json.loads(response.read()) # turns response into index-able dictionary
 out = name+"'s ID: " +data['personId']
 print(out)
 nameAndID.append((name, data['personId'])) # fills list with tuples of name and personId
 conn.close()
 return nameAndID

# adds faces to the created people in PersonGroup
def addFaceToPerson(list):
 headers = {'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key':KEY}
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 for item in list:
 params = urllib.urlencode({'personGroupId': group_id, 'personId': item[1]}) # item[1] is the personId created from addPeople()
 directory = '/home/pi/DAT602/images/'+item[0] # item[0] is person's name for filename in os.listdir(directory):
 if filename.endswith('.jpg'): # file type of photos
 filePath = os.path.join(directory, filename) # creates full file path
 body = open(filePath,'rb')
 conn.request("POST", "/face/v1.0/persongroups/{employees}/persons/"+item[1]+"/persistedFaces?%s" % params, body, headers)
 response = conn.getresponse()
 data = json.loads(response.read()) # print persistedFaceId
 print(data)
 time.sleep(3)
 conn.close()

addFaceToPerson(addPeople())</pre>

## PersonGroup Person - List

<p>To verify the information in my PersonGroup, the <a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f30395241">PersonGroup Person - List API</a> call can be used.</p>

"List all persons’ information in the specified person group, including personId, name, userData and persistedFaceIds of registered person faces."

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import httplib, urllib, base64, json

headers = {
 # Request headers
 'Ocp-Apim-Subscription-Key': 'XXXXX',
}

params = urllib.urlencode({
 # Request parameters
 # 'start': '{string}',
 # 'top': '1000',
})

try:
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 conn.request("GET", "/face/v1.0/persongroups/users/persons?%s" % params, "{body}", headers)
 response = conn.getresponse()
 data = response.read()
 print (data);
 conn.close()
except Exception as e:
 print("[Errno {0}] {1}".format(e.errno, e.strerror))</pre>

Here is the ouput

<pre class="EnlighterJSRAW" data-enlighter-language="json" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">[ 
 { 
 "personId":"4b334dda-e191-4557-9596-167ff19b0a28",
 "persistedFaceIds":[ 
 "4d6c901f-0934-497f-b5e6-25f73071455b",
 "5342a702-2d18-425a-b2d1-e495dcdc13bb",
 "9f3e854f-20ed-4ca0-a40a-f99cf3616c44",
 "a33b8cbf-0416-4fcb-8c74-20d5fea08ba5",
 "aeefe37d-959f-44e8-b74e-a1cc81eb1bbc",
 "b518184a-0de3-4a30-a403-412db74e210f"
 ],
 "name":"Sam",
 "userData":null
 },
 { 
 "personId":"82d54b40-b385-4f51-9bf2-a67fa7e2a267",
 "persistedFaceIds":[ 
 "62dd4cd4-223d-42ae-a622-00094d3152be",
 "aa86dab5-3d95-4b17-95a7-59e771e53407",
 "b26abbdf-2d64-4d57-9ba6-eaa216d84299",
 "dc566515-879d-4504-8f23-e1d7b2c28631",
 "ec267865-4ae1-490f-9fa7-3046decc3803"
 ],
 "name":"Donald",
 "userData":null
 },
 { 
 "personId":"abe5851c-5b5e-404e-b1f8-dc65fc215ec7",
 "persistedFaceIds":[ 
 "03c7fbef-29bf-45dc-99e3-c72fc12b5c2c",
 "1734edc6-daae-46f6-a28f-2023b0b69062",
 "2f9a3584-4e84-4439-b113-2c9c56609b00",
 "45f80c50-3ebe-4f9c-9bc9-68d0ee44e815",
 "4b186100-0efd-4e14-ab49-16dc557e5a9a",
 "6d48f52d-cc57-4fd6-9827-ca36ec1cfbe0",
 "c84b98d0-3047-4304-b79b-180aac3eecd5",
 "c84bc6c4-e288-45c9-8b91-01d4614f3161"
 ],
 "name":"Matthew",
 "userData":null
 },
 { 
 "personId":"f3fad711-b38e-4497-b84e-c553ffcf300a",
 "persistedFaceIds":[ 
 "65beee33-355a-4955-8579-d7c9cf36fc73",
 "81cfc54a-cc8c-4cbb-84af-2e342f2dac91",
 "f974beda-1c1b-4aa9-862a-768c5e23c7ec",
 "fc68d8d0-256f-4c30-953d-2d0dce556290"
 ],
 "name":"Cass",
 "userData":null
 }
]</pre>

## PersonGroup - Train

<p>The PersonGroup has been populated with people and their faces. The PersonGroup can now be trained to recognise the faces using the <a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f30395249">PersonGroup - Train API</a> call.</p>

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import urllib, httplib, base64, json

group_id = 'users'
KEY = 'XXXXX'

params = urllib.urlencode({'personGroupId': group_id})
headers = {'Ocp-Apim-Subscription-Key': KEY}

conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
conn.request("POST", "/face/v1.0/persongroups/users/train?%s" % params, "{body}", headers)
response = conn.getresponse()
data = json.loads(response.read())
print(data) # should be empty</pre>

## PersonGroup Identify

<p>We now have a PersonGroup trained with the faces of known users of the system. The <a href="https://westus.dev.cognitive.microsoft.com/docs/services/563879b61984550e40cbbe8d/operations/563879b61984550f30395239">Identify API</a> call accepts a list of faceIds from detectFace and returns the personId and a confidence value of possible matches. The personId can be used to retrieve the person's name and the confidence value as a measure of recognition.</p>

The code for taking a photo of a person, processing their image and comparing it with the list of known users looks like:

<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import requests
import paho.mqtt.client as mqttClient
from operator import itemgetter
from picamera import PiCamera
import sys
import json
import os
import urllib, httplib, base64, json
import datetime
import shutil
import time

BaseDirectory = '/home/pi/DAT602/images/' # directory where photos are stored
KEY = 'XXXXX' # authorisation key for Face API
group_id = 'users' # name of personGroup

#Camera Setup
camera = PiCamera() # initiate camera

#Functions

# Iterate specified directory detecting faces
def iter():
 for fileName in os.listdir(directory):
 if fileName.endswith('.jpg'):
 filePath = os.path.join(directory, fileName) #create full file path
 fileList.append(filePath)
 detect(filePath)

#Detect faces in images in directory using Face API post request
def detect(img_url):
 headers = {'Content-Type': 'application/octet-stream', 'Ocp-Apim-Subscription-Key': KEY}
 body = open(img_url,'rb')

 params = urllib.urlencode({'returnFaceId': 'true'})
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 conn.request("POST", '/face/v1.0/detect?%s' % params, body, headers)
 response = conn.getresponse()
 photo_data = json.loads(response.read())

 if not photo_data: # if post response is empty (no face found)
 print('No face identified')
 else: # if face is found
 for face in photo_data: # for the faces identified in each photo
 faceIdList.append(str(face['faceId'])) # get faceId for use in identify

# Receives a list of faceIds and match face to known faces
def identify(ids):
 if not faceIdList: # if list is empty, no faces found in photos
 result = [('n', .0), 'n'] # create result with 0 confidence
 return result # return result 
 else: # else there is potential match
 headers = {'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY}
 params = urllib.urlencode({'personGroupId': group_id})

 body = "{'personGroupId':'users', 'faceIds':"+str(ids)+", 'confidenceThreshold': '.5'}"
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 conn.request("POST", "/face/v1.0/identify?%s" % params, body, headers)
 response = conn.getresponse()

 data = json.loads(response.read()) # turns response into index-able dictionary

 for resp in data:
 candidates = resp['candidates']
 for candidate in candidates: # for each candidate in the response
 confidence = candidate['confidence'] # retrieve confidence
 personId = str(candidate['personId']) # and personId
 confidenceList.append((personId, confidence))
 conn.close()
 SortedconfidenceList = zip(confidenceList, fileList) # merge fileList and confidence list
 sortedConfidence = sorted(SortedconfidenceList, key=itemgetter(1)) # sort confidence list by confidence
 return sortedConfidence[-1] # returns tuple with highest confidence value (sorted from smallest to biggest)

# Get known person's name from person_Id with API GET request
def getName(person_Id):
 headers = {'Ocp-Apim-Subscription-Key': KEY}
 params = urllib.urlencode({'personGroupId': group_id, 'personId': person_Id})
 conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
 conn.request("GET", "/face/v1.0/persongroups/{"+group_id+"}/persons/"+person_Id+"?%s" % params, "{body}", headers)
 response = conn.getresponse()
 data = json.loads(response.read())
 name = data['name']
 conn.close()
 return name

#*****Main*****#
count = 0
while True:
 fileList = [] # list of filePaths of images
 faceIdList = [] # list for face id's
 confidenceList = [] # list of confidence values derived from api - identify
 count += 1 # count allows for a new directory to be made for each set of photos
 directory = BaseDirectory+str(count)+'/'
 print("Starting...")
 if not os.path.isdir(directory):
 os.mkdir(directory) # create directory for photos to be uploaded to
 print('Count: ' + str(count))
 for x in range(0,1):
 date = datetime.datetime.now().strftime('%m_%d_%Y_%M_%S_') # unique file name
 print('Taking photo...')
 camera.capture(directory + date +'.jpg')
 time.sleep(1) # take photo every second
 iter()
 print('Directory: ' + directory)
 result = identify(faceIdList)
 if result[0][1] > .7: # if confidence greater than 70% get name of person
 print(getName(result[0][0]) +' recognised.')
 #remove uploaded images
 if os.path.isdir(directory):
 shutil.rmtree(directory)
 break

 else:
 print('Face NOT recognised')
 #remove uploaded images
 if os.path.isdir(directory):
 shutil.rmtree(directory)
 time.sleep(5) # wait 5 seconds before taking another picture

#*****Publish name of recognised person over MQTT*****#

broker_address= "m23.cloudmqtt.com"
#broker address = "mqtt://broker.i-dat.org:80"
port = 16269
#port = 80
user = "xtrzjlsv"
password = "XXXXX"

client = mqttClient.Client("DAT602") #create new instance
client.username_pw_set(user, password=password) #set username and password
#client.on_connect= on_connect #attach function to callback
print('Connecting to MQTT broker')
client.connect(broker_address, port=port) #connect to broker
client.publish("DAT602/test", getName(result[0][0]))
client.disconnect()</pre>

## Bibliography

<p>Microsoft (no date) *Face*. Available at: <a href="https://azure.microsoft.com/en-gb/services/cognitive-services/face/">https://azure.microsoft.com/en-gb/services/cognitive-services/face/</a> (Accessed: 13 November 2018).</p>
