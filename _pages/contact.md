---
layout: default
title: Contact
permalink: /contact/
---

<div class="contact-page">
  <header class="page-header">
    <h1 class="page-title">Get In Touch</h1>
    <p class="page-description">Have a question or want to work together? Send me a message!</p>
  </header>

  <div class="contact-content">
    <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="contact-form">
      <p class="hidden">
        <label>
          Don't fill this out if you're human: <input name="bot-field" />
        </label>
      </p>

      <div class="form-group">
        <label for="name">Name <span class="required">*</span></label>
        <input type="text" id="name" name="name" required />
      </div>

      <div class="form-group">
        <label for="email">Email <span class="required">*</span></label>
        <input type="email" id="email" name="email" required />
      </div>

      <div class="form-group">
        <label for="subject">Subject</label>
        <input type="text" id="subject" name="subject" />
      </div>

      <div class="form-group">
        <label for="message">Message <span class="required">*</span></label>
        <textarea id="message" name="message" rows="6" required></textarea>
      </div>

      <div class="form-group">
        <button type="submit" class="submit-btn">Send Message</button>
      </div>
    </form>
  </div>
</div>

<style>
.contact-form {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.required {
  color: #e74c3c;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.hidden {
  display: none;
}

.submit-btn {
  background-color: #14b8a6;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-btn:hover {
  background-color: #0d9488;
}
</style>
