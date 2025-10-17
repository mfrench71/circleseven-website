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
        {% for post in posts limit:5 %}
          <li class="post-item-compact">
            {% if post.image %}
            <div class="post-image-small">
              <a href="{{ post.url | relative_url }}">
                <img src="{{ post.image | relative_url }}" alt="{{ post.title | escape }}">
              </a>
            </div>
            {% endif %}
            <div class="post-info">
              <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
              <a href="{{ post.url | relative_url }}" class="post-title-link">{{ post.title }}</a>
              {% if post.categories.size > 1 %}
                <span class="post-breadcrumb">
                  {% for cat in post.categories %}
                    {{ cat }}{% unless forloop.last %} › {% endunless %}
                  {% endfor %}
                </span>
              {% endif %}
            </div>
          </li>
        {% endfor %}
        {% if posts.size > 5 %}
          <li class="view-all-link">
            <a href="{{ site.baseurl }}/category/{{ category_name | slugify }}/">View all {{ posts.size }} posts →</a>
          </li>
        {% endif %}
      </ul>
    </div>
  {% endfor %}

  
</div>
