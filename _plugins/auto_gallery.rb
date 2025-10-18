module Jekyll
  module AutoGallery
    def auto_gallery(content)
      return content if content.nil? || content.empty?

      # Fix image URLs: Replace {{ site.baseurl }}/wp-content with full circleseven.co.uk URL
      content = content.gsub(
        /{{ site\.baseurl }}\/wp-content\/uploads/,
        'https://www.circleseven.co.uk/wp-content/uploads'
      )

      # Also handle already-rendered paths
      content = content.gsub(
        /\/circleseven-website\/wp-content\/uploads/,
        'https://www.circleseven.co.uk/wp-content/uploads'
      )

      # Wrap consecutive figures in a gallery div
      # Match 2 or more consecutive figure elements
      content = content.gsub(
        /((?:<figure>.*?<\/figure>\s*){2,})/m
      ) do |match|
        "<div class=\"gallery\">\n#{match}</div>\n"
      end

      content
    end
  end
end

Liquid::Template.register_filter(Jekyll::AutoGallery)
