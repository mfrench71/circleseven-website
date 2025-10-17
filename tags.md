---
layout: default
title: Tags
permalink: /tags/
---

<div class="tags-page">
  <header class="page-header">
    <h1 class="page-title">All Tags</h1>
    <p class="page-description">Browse content by topic</p>
  </header>

  <div class="tag-cloud">
    {% assign sorted_tags = site.tags | sort %}
    {% for tag in sorted_tags %}
      {% assign tag_name = tag[0] %}
      {% assign posts = tag[1] %}
      {% assign post_count = posts | size %}

      {% comment %}Calculate tag size based on post count{% endcomment %}
      {% assign tag_size = 'small' %}
      {% if post_count > 10 %}
        {% assign tag_size = 'large' %}
      {% elsif post_count > 5 %}
        {% assign tag_size = 'medium' %}
      {% endif %}

      <a href="{{ site.baseurl }}/tag/{{ tag_name | slugify }}/" class="tag-cloud-item tag-{{ tag_size }}">
        {{ tag_name }}
        <span class="count">({{ post_count }})</span>
      </a>
    {% endfor %}
  </div>

  <div class="tag-list">
    {% for tag in sorted_tags %}
      {% assign tag_name = tag[0] %}
      {% assign posts = tag[1] | sort: 'date' | reverse %}
      {% assign post_count = posts | size %}

      <section class="tag-section">
        <h2 id="{{ tag_name | slugify }}">
          <a href="{{ site.baseurl }}/tag/{{ tag_name | slugify }}/">
            {{ tag_name }}
          </a>
          <span class="count">({{ post_count }})</span>
        </h2>

        <ul class="post-list">
          {% for post in posts limit:5 %}
          <li class="post-item-compact">
            {% if post.image %}
            <div class="post-image-small">
              <a href="{{ post.url | relative_url }}">
                <img src="{{ post.image | relative_url }}" alt="{{ post.title | escape }}" loading="lazy">
              </a>
            </div>
            {% endif %}
            <div class="post-info">
              <a href="{{ post.url | relative_url }}" class="post-title-link">{{ post.title | escape }}</a>
              <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
            </div>
          </li>
          {% endfor %}
        </ul>

        {% if post_count > 5 %}
        <p class="view-all-link">
          <a href="{{ site.baseurl }}/tag/{{ tag_name | slugify }}/">
            View all {{ post_count }} posts →
          </a>
        </p>
        {% endif %}
      </section>
    {% endfor %}
  </div>
</div>
