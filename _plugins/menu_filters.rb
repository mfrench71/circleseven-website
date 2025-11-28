# frozen_string_literal: true

# Menu Filters
# Provides Liquid filters for resolving menu item references to taxonomy data
module Jekyll
  module MenuFilters
    # Resolves a menu item's category_ref to actual category data from taxonomy
    # Returns a hash with resolved label, url, and slug
    #
    # @param menu_item [Hash] The menu item with potential category_ref
    # @param taxonomy [Hash] The site taxonomy data
    # @return [Hash] Menu item with resolved category data
    def resolve_menu_item(menu_item, taxonomy)
      return menu_item unless menu_item.is_a?(Hash)
      return menu_item unless menu_item['type'] == 'category_ref'
      return menu_item unless menu_item['category_ref']

      resolved = menu_item.dup
      category_ref = menu_item['category_ref']

      # Find category in taxonomy by slug
      category = find_category_by_slug(taxonomy['categories'] || [], category_ref)

      if category
        # Resolve label from taxonomy if not provided
        resolved['label'] ||= category['item']
        # Resolve URL from slug
        resolved['url'] = "/category/#{category_ref}/"
        # Store the resolved category data for template use
        resolved['_resolved_category'] = category
      else
        # Category not found - log warning and use fallback
        Jekyll.logger.warn "Menu:", "Category reference '#{category_ref}' not found in taxonomy"
        resolved['label'] ||= category_ref.split('-').map(&:capitalize).join(' ')
        resolved['url'] = "/category/#{category_ref}/"
        resolved['_broken_ref'] = true
      end

      resolved
    end

    # Recursively resolves all category_ref items in a menu structure
    # Processes nested children as well
    #
    # @param menu_items [Array] Array of menu items
    # @param taxonomy [Hash] The site taxonomy data
    # @return [Array] Menu items with resolved references
    def resolve_menu(menu_items, taxonomy)
      return [] unless menu_items.is_a?(Array)
      return [] unless taxonomy.is_a?(Hash)

      menu_items.map do |item|
        resolved_item = resolve_menu_item(item, taxonomy)

        # Recursively resolve children
        if resolved_item['children']&.is_a?(Array) && !resolved_item['children'].empty?
          resolved_item = resolved_item.dup
          resolved_item['children'] = resolve_menu(resolved_item['children'], taxonomy)
        end

        resolved_item
      end
    end

    private

    # Recursively searches for a category by slug in taxonomy tree
    #
    # @param categories [Array] Array of category objects
    # @param slug [String] The slug to search for
    # @return [Hash, nil] The category object or nil if not found
    def find_category_by_slug(categories, slug)
      return nil unless categories.is_a?(Array)

      categories.each do |category|
        return category if category['slug'] == slug

        # Search in children
        if category['children']&.is_a?(Array)
          found = find_category_by_slug(category['children'], slug)
          return found if found
        end
      end

      nil
    end
  end
end

Liquid::Template.register_filter(Jekyll::MenuFilters)
