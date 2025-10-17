---
layout: post
title: "DAT602 – Face Login – Profile Image/Amazon S3"
date: 2018-12-18 09:06:13 +0000
categories: DAT602 - Everyware Digital Art and Technology
---

<!-- wp:paragraph -->
<p>As part of the Face Login system, I have access to a number of images of faces that were used to train the face recognition system. It would make sense to be able to display a profile image of the logged-in user using one of these photographs.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The plan is to upload all the images of users to Amazon S3, make each image publicly accessible, and then display the relevant image by linking to the image from the profile page of the Face Login system</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Uploading Images to Amazon S3</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The first step is to upload the images to Amazon's S3 service. To replicate the local folder structure on S3 , I can iterate through each image within each of the folders of face images that I created and upload them. In the below image can be seen folders for the four test users: Cass, Donald, Matthew, and Sam.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I developed a simple Python script, which made use of some of the code from the addPeople.py script previously developed.</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"python"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="python" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">import os
import boto3

bucketName = 'dat-602-users'
s3=boto3.resource('s3')
people = ['Cass','Donald','Matthew','Sam']

for name in people:
directory = '/home/pi/DAT602/face_login/images/'+name
for filename in os.listdir(directory):
if filename.endswith('.jpg'): # .jpg images only
filePath = os.path.join(directory, filename) # creates full file path
data = open(filePath, 'rb')
s3.Bucket(bucketName).put_object(Key=(name+'/'+filename), Body=data, ContentType='image/jpeg')
object_acl = s3.ObjectAcl(bucketName, (name+'/'+filename))
response = object_acl.put(ACL='public-read') # makes link public
link = 'https://s3-eu-west-1.amazonaws.com/'+bucketName+'/'+name+'/'+filename # links in s3 follow this pattern
print(link)</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>The script iterates through each face image in each user folder, uploads the images to an S3 bucket, makes them publicly accessible, and maintains the folder structure as can be seen in the following screenshots:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":911,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.28.41.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.28.41-1024x548.png" alt="" class="wp-image-911"/></a><figcaption class="wp-element-caption">Amazon S3</figcaption></figure>
<!-- /wp:image -->

<!-- wp:image {"id":915,"sizeSlug":"large","linkDestination":"media"} -->
<figure class="wp-block-image size-large"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.48.00.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.48.00-1024x576.png" alt="" class="wp-image-915"/></a><figcaption class="wp-element-caption">Amazon S3</figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>The script outputs the full URL for each image. This will be useful when I come to rebuild this dynamically from the logged-in users name</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Displaying the Profile Images</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Now that I have publicly accessible links for each image, I can include one image on the profile page of the logged-in user. This is how it will look:</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":916,"sizeSlug":"full","linkDestination":"media"} -->
<figure class="wp-block-image size-full"><a href="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.53.42.png"><img src="https://www.circleseven.co.uk/wp-content/uploads/2023/05/Screenshot-2018-12-18-at-19.53.42.png" alt="" class="wp-image-916"/></a></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>I have intentionally maintained naming consistency of the username, image folder names, and the image names so that I can create a link between them.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Once a user has successfully logged in, I have access to their username in a Handlebars view via {{user.local.username}}. To create an image link is relatively simple:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"html"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="html" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;img src="https://s3-eu-west-1.amazonaws.com/dat-602-users/{{user.local.username}}/{{toLowerCase user.local.username}}_01.jpg"></pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>Note: I've added another Handlebars helper function to the <code>server.js</code> file to convert a string to lower case:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"js"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="js" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">// handlebars helper (lower case)
hbs.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
});</pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>When this page is served, the above code is rendered as:</p>
<!-- /wp:paragraph -->

<!-- wp:enlighter/codeblock {"language":"html"} -->
<pre class="EnlighterJSRAW" data-enlighter-language="html" data-enlighter-theme="" data-enlighter-highlight="" data-enlighter-linenumbers="" data-enlighter-lineoffset="" data-enlighter-title="" data-enlighter-group="">&lt;img src="https://s3-eu-west-1.amazonaws.com/dat-602-users/Matthew/matthew_01.jpg"></pre>
<!-- /wp:enlighter/codeblock -->

<!-- wp:paragraph -->
<p>As you can see, the folder name and image filename prefix have been retrieved from the user's username as stored in MongoDB.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Improvements</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Although the above process works and the result is satisfactory, there are number of improvements that I would like to make:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul><!-- wp:list-item -->
<li>When the Python scripts iterates through the images in the each folder, I would like to be able just to point it at the&nbsp;<code>/home/pi/DAT602/face_login/images/</code> folder and programmatically upload all the images in all the subfolders it finds. This would be more maintainable than providing an array of folder names.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>The upload to S3 uses the face images at their original size (which is unnecessarily large). I would like to generate thumbnails and upload these instead.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>I'm not happy with the partly hard-coded nature of the image link in the Handlebars view file. Each image URL could be stored in MongoDB and retrieved along with other data when a user logs in.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->