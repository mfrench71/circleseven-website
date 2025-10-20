// Add copy buttons to code blocks

(function() {
  'use strict';

  // Wait for Highlight.js to finish
  document.addEventListener('DOMContentLoaded', function() {
    // Find all code blocks
    const codeBlocks = document.querySelectorAll('pre code');

    codeBlocks.forEach(function(codeBlock) {
      const pre = codeBlock.parentElement;

      // Skip if already wrapped
      if (pre.parentElement.classList.contains('code-block-wrapper')) {
        return;
      }

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      // Wrap the pre element
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code-button';
      copyButton.textContent = 'Copy';
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');

      // Add click handler
      copyButton.addEventListener('click', function() {
        const code = codeBlock.textContent;

        // Copy to clipboard
        navigator.clipboard.writeText(code).then(function() {
          // Success feedback
          copyButton.textContent = 'Copied!';
          copyButton.classList.add('copied');

          setTimeout(function() {
            copyButton.textContent = 'Copy';
            copyButton.classList.remove('copied');
          }, 2000);
        }).catch(function(err) {
          copyButton.textContent = 'Error';

          setTimeout(function() {
            copyButton.textContent = 'Copy';
          }, 2000);
        });
      });

      wrapper.appendChild(copyButton);
    });
  });
})();
