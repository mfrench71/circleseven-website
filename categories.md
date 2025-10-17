---
layout: page
title: Categories
permalink: /categories/
---

<div class="categories-page">
  {% assign sorted_categories = site.categories | sort %}

  <p>Browse posts by category. Posts are organized into parent categories (bold) and subcategories.</p>

  <div class="category-cloud">
    {% for category in sorted_categories %}
      {% assign category_name = category[0] %}
      {% assign posts_count = category[1] | size %}
      {% assign font_size = posts_count | times: 1.5 | plus: 13 %}
      {% if font_size > 24 %}{% assign font_size = 24 %}{% endif %}
      <a href="{{ site.baseurl }}/category/{{ category_name | slugify }}/" class="category-tag" style="font-size: {{ font_size }}px;">
        {{ category_name }} <span class="count">({{ posts_count }})</span>
      </a>
    {% endfor %}
  </div>

  <hr style="margin: 40px 0;">

  {% for category in sorted_categories %}
    {% assign category_name = category[0] %}
    {% assign posts = category[1] %}

    <div class="category-section" id="{{ category_name | slugify }}">
      <h2>
        <a href="{{ site.baseurl }}/category/{{ category_name | slugify }}/">{{ category_name }}</a>
        <span class="count">({{ posts | size }})</span>
      </h2>

      <ul class="post-list">
        {% for post in posts %}
          <li>
            <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            {% if post.categories.size > 1 %}
              <span class="post-breadcrumb">
                {% for cat in post.categories %}
                  {{ cat }}{% unless forloop.last %} › {% endunless %}
                {% endfor %}
              </span>
            {% endif %}
          </li>
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
    .category-section h2 a {
      color: #111;
      text-decoration: none;
    }
    .category-section h2 a:hover {
      color: #2a7ae2;
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
    .post-breadcrumb {
      display: block;
      font-size: 12px;
      color: #999;
      margin-top: 3px;
      margin-left: 115px;
      font-style: italic;
    }
    .category-tag .count {
      font-size: 0.85em;
      opacity: 0.7;
    }
  </style>
</div>
