module Jekyll
  class CategoryPaginationGenerator < Generator
    safe true
    priority :low

    def generate(site)
      posts_per_page = 10

      site.categories.each do |category, posts|
        category_slug = Jekyll::Utils.slugify(category)
        total_posts = posts.size
        total_pages = (total_posts.to_f / posts_per_page).ceil

        # Skip if only one page
        next if total_pages <= 1

        # Create pagination pages (page 2 onwards, page 1 is the main category page)
        (2..total_pages).each do |page_num|
          site.pages << CategoryPaginationPage.new(site, category, category_slug, page_num)
        end
      end
    end
  end

  class CategoryPaginationPage < Page
    def initialize(site, category, category_slug, page_num)
      @site = site
      @base = site.source
      @dir = "category/#{category_slug}/page/#{page_num}"
      @name = 'index.html'

      self.process(@name)
      self.read_yaml(File.join(@base, '_layouts'), 'category.html')
      self.data['category'] = category
      self.data['title'] = category
      self.data['permalink'] = "/category/#{category_slug}/page/#{page_num}/"
    end
  end
end
