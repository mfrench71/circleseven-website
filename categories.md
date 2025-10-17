---
layout: page
title: Categories
permalink: /categories/
---

<div class="categories-page">
  {% comment %}
  Build a list of unique full category strings from all posts
  {% endcomment %}
  {% assign all_categories = "" | split: "" %}
  {% for post in site.posts %}
    {% assign cat_string = post.categories | join: " " %}
    {% unless all_categories contains cat_string %}
      {% assign all_categories = all_categories | push: cat_string %}
    {% endunless %}
  {% endfor %}
  {% assign sorted_categories = all_categories | sort %}

  <p>Browse posts by category. Click on a category to see all posts in that category.</p>

  <div class="category-cloud">
    {% for category_name in sorted_categories %}
      {% assign posts_count = 0 %}
      {% for post in site.posts %}
        {% assign post_cat = post.categories | join: " " %}
        {% if post_cat == category_name %}
          {% assign posts_count = posts_count | plus: 1 %}
        {% endif %}
      {% endfor %}
      <a href="#{{ category_name | slugify }}" class="category-tag" style="font-size: {{ posts_count | times: 2 | plus: 12 }}px;">
        {{ category_name }} ({{ posts_count }})
      </a>
    {% endfor %}
  </div>

  <hr style="margin: 40px 0;">

  {% for category_name in sorted_categories %}
    <div class="category-section" id="{{ category_name | slugify }}">
      <h2>{{ category_name }} <span class="count">
        {% assign posts_in_cat = 0 %}
        {% for post in site.posts %}
          {% assign post_cat = post.categories | join: " " %}
          {% if post_cat == category_name %}
            {% assign posts_in_cat = posts_in_cat | plus: 1 %}
          {% endif %}
        {% endfor %}
        ({{ posts_in_cat }} posts)
      </span></h2>

      <ul class="post-list">
        {% for post in site.posts %}
          {% assign post_cat = post.categories | join: " " %}
          {% if post_cat == category_name %}
            <li>
              <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
              <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            </li>
          {% endif %}
        {% endfor %}
      </ul>
    </div>
  {% endfor %}

  <style>
    .categories-page {
      max-width: 900px;
    }
    .category-cloud {
      margin: 30px 0;
      line-height: 2.5;
    }
    .category-tag {
      display: inline-block;
      margin: 5px 10px 5px 0;
      padding: 5px 12px;
      background: #f0f0f0;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      transition: background 0.2s;
    }
    .category-tag:hover {
      background: #2a7ae2;
      color: white;
    }
    .category-section {
      margin-bottom: 50px;
    }
    .category-section h2 {
      border-bottom: 2px solid #e8e8e8;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .category-section h2 .count {
      color: #666;
      font-size: 18px;
      font-weight: normal;
    }
    .category-section .post-list {
      list-style: none;
      padding: 0;
    }
    .category-section .post-list li {
      margin-bottom: 12px;
      padding: 8px 0;
    }
    .post-meta {
      font-size: 14px;
      color: #828282;
      margin-right: 15px;
      display: inline-block;
      min-width: 100px;
    }
  </style>
</div>
