// Table of Contents Generator
// Automatically builds TOC from h2 and h3 headings in post content

(function() {
  'use strict';

  const tocContainer = document.getElementById('toc-list');
  if (!tocContainer) return;

  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // Get all h2 and h3 headings
  const headings = postContent.querySelectorAll('h2, h3');

  if (headings.length < 3) {
    // Hide TOC if fewer than 3 headings
    const tocElement = document.getElementById('toc');
    if (tocElement) tocElement.style.display = 'none';
    return;
  }

  // Generate unique IDs for headings that don't have one
  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = 'heading-' + index;
    }
  });

  // Build the TOC
  let currentLevel = 2;
  let tocHTML = '';

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent;
    const id = heading.id;

    if (level === 2) {
      if (currentLevel === 3) {
        tocHTML += '</ol></li>';
      }
      tocHTML += `<li><a href="#${id}">${text}</a>`;
      currentLevel = 2;
    } else if (level === 3) {
      if (currentLevel === 2) {
        tocHTML += '<ol class="toc-sublist">';
      }
      tocHTML += `<li><a href="#${id}">${text}</a></li>`;
      currentLevel = 3;
    }

    // Close the last item
    if (index === headings.length - 1) {
      if (currentLevel === 3) {
        tocHTML += '</ol>';
      }
      tocHTML += '</li>';
    } else {
      const nextLevel = parseInt(headings[index + 1].tagName.substring(1));
      if (level === 2 && nextLevel === 2) {
        tocHTML += '</li>';
      }
    }
  });

  tocContainer.innerHTML = tocHTML;

  // Smooth scroll for TOC links
  const tocLinks = tocContainer.querySelectorAll('a');
  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL without jumping
        history.pushState(null, null, '#' + targetId);
      }
    });
  });

  // Highlight current section on scroll
  let observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const tocLink = tocContainer.querySelector(`a[href="#${id}"]`);
      if (tocLink) {
        if (entry.isIntersecting) {
          tocLinks.forEach(link => link.classList.remove('active'));
          tocLink.classList.add('active');
        }
      }
    });
  }, {
    rootMargin: '-20% 0% -35% 0%'
  });

  headings.forEach(heading => {
    observer.observe(heading);
  });
})();
