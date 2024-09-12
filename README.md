# Sitemap Checker

Sitemap Checker is a web-based tool designed to analyze and validate website sitemaps. It allows users to upload or input a sitemap URL, then extracts and checks meta SEO information from the URLs within the sitemap.

## Live Demo

You can access the live production version of this tool at:
[https://sitemapchecker.netlify.app/](https://sitemapchecker.netlify.app/)

## Key Features

- Upload XML sitemap file or input sitemap URL directly
- Parse sitemap and extract list of URLs
- Check meta SEO information for each URL, including:
  - Google meta tags
  - Facebook Open Graph tags
  - Twitter Card tags
- Display results in grid or table view
- Export results to CSV file
- Support for nested sitemaps
- Process logging

## How to Use

1. Open the Sitemap Checker website
2. Upload an XML sitemap file or enter a sitemap URL
3. Select the meta SEO options to check
4. Click the "Check URLs" button to start the analysis
5. View the results displayed on the page
6. Optionally export results to a CSV file

## Local Setup and Development

1. Clone the repository:
   ```
   git clone https://github.com/your-username/sitemap-checker.git
   ```

2. Navigate to the project directory:
   ```
   cd sitemap-checker
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173`

## Built With

- HTML, CSS, JavaScript
- [Bootstrap](https://getbootstrap.com/) - CSS Framework
- [DataTables](https://datatables.net/) - jQuery plugin for interactive tables
- [Vite](https://vitejs.dev/) - Build tool and development server

## Author

- Author: Tăng Quốc Minh
- Email: vhquocminhit@gmail.com

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
