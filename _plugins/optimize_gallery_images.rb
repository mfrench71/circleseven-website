module Jekyll
  module OptimizeGalleryImages
    def optimize_gallery_images(content)
      return content if content.nil? || content.empty?

      # Only process content within gallery divs
      content.gsub(/<div class="gallery">(.*?)<\/div>/m) do |gallery_block|
        gallery_content = $1

        # Optimize images within this gallery
        optimized_content = gallery_content.gsub(/<figure>(<a[^>]*>)?<img([^>]*?)(\s*\/)?>/m) do |img_tag|
          figure_start = '<figure>'
          link_tag = $1 || ''
          img_attrs = $2

          # Extract src from img attributes
          if img_attrs =~ /src="([^"]*)"/
            original_src = $1

            # Only optimize Cloudinary images
            if original_src.include?('cloudinary.com') && original_src.include?('/upload/')
              # Replace the transformation to use thumbnail size for gallery display
              # Use c_fill to ensure consistent square thumbnails (360x360 for 2x DPR)
              thumbnail_src = original_src.gsub(
                /\/upload\/[^\/]+\//,
                '/upload/c_fill,w_360,h_360,g_auto,q_auto,f_auto/'
              )

              # Store original src in data attribute for lightbox
              # Update img tag with thumbnail and data-full-src
              new_img_attrs = img_attrs.dup

              # Replace src with thumbnail
              new_img_attrs.gsub!(/src="[^"]*"/, "src=\"#{thumbnail_src}\"")

              # Add data-full-src for lightbox (points to link href or original src)
              if link_tag =~ /href="([^"]*)"/
                full_src = $1
              else
                full_src = original_src
              end
              new_img_attrs << " data-full-src=\"#{full_src}\""

              # Remove srcset for gallery thumbnails (not needed, using fixed size)
              new_img_attrs.gsub!(/ srcset="[^"]*"/, '')

              # Remove sizes attribute (not needed for fixed size)
              new_img_attrs.gsub!(/ sizes="[^"]*"/, '')

              # Ensure width/height are set for 180px display (browser will scale for DPR)
              unless new_img_attrs.include?('width=')
                new_img_attrs << ' width="180" height="180"'
              else
                # Update existing width/height
                new_img_attrs.gsub!(/ width="[^"]*"/, ' width="180"')
                new_img_attrs.gsub!(/ height="[^"]*"/, ' height="180"')
              end

              # Reconstruct the figure tag
              "#{figure_start}#{link_tag}<img#{new_img_attrs}>"
            else
              # Not a Cloudinary image, return as-is
              img_tag
            end
          else
            # No src found, return as-is
            img_tag
          end
        end

        # Return the optimized gallery block
        "<div class=\"gallery\">#{optimized_content}</div>"
      end
    end
  end
end

Liquid::Template.register_filter(Jekyll::OptimizeGalleryImages)
