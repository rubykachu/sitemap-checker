import './style.css'
// import javascriptLogo from './javascript.svg'
// import viteLogo from '/vite.svg'
// import { setupCounter } from './counter.js'

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const sitemapFile = document.getElementById('sitemapFile');
const sitemapContent = document.getElementById('sitemapContent');
const parseButton = document.getElementById('parseButton');
const urlGrid = document.getElementById('urlGrid');
const searchInput = document.getElementById('searchInput');
const openAllButton = document.getElementById('openAllButton');
const totalUrlsSpan = document.getElementById('totalUrls');
const checkedUrlsSpan = document.getElementById('checkedUrls');

let urls = [];

sitemapFile.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
          sitemapContent.value = e.target.result;
      };

      reader.readAsText(file);
  }
});

function updateUrlCounts() {
  totalUrlsSpan.textContent = urls.length;
  checkedUrlsSpan.textContent = urls.filter(url => url.checked).length;
}

parseButton.addEventListener('click', () => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sitemapContent.value, "text/xml");
    let urlElements = xmlDoc.getElementsByTagName("url");

    if (!urlElements.length) {
        urlElements = xmlDoc.getElementsByTagName("sitemap");
    }

    if (!urlElements.length) {
        alert("The structure of the URL could not be detected in the sitemap.");
        location.reload();
        return
    }

    urls = Array.from(urlElements).map(urlElement => {
        const loc = urlElement.getElementsByTagName("loc")[0].textContent;
        return { url: loc, checked: false };
    });

    totalUrlsSpan.textContent = urls.length;
    checkedUrlsSpan.textContent = "0";

    updateUrlCounts
    renderUrlGrid();
});

function renderUrlGrid() {
    urlGrid.innerHTML = '';
    urls.forEach((urlObj, index) => {
        const card = createUrlCard(urlObj, index);
        urlGrid.appendChild(card);
    });
}

function createUrlCard(urlObj, index) {
  const card = document.createElement('div');
  card.className = 'col';
  card.innerHTML = `
      <div class="card h-100" data-index="${index}">
          <div class="card-body">
              <h5 class="card-title"><a href="${urlObj.url}" target="_blank">${urlObj.url}</a></h5>
              <div class="card-header mb-3">
                  <span class="status ${getStatusClass(urlObj.status)}">
                      Status: ${urlObj.checked ? urlObj.status : 'Not checked'}
                  </span>
                  <button class="btn btn-outline-info btn-sm check-url" data-index="${index}">Refresh Meta</button>
              </div>
              <!--
              <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="" id="checkbox${index}">
                  <label class="form-check-label" for="checkbox${index}">
                      Select
                  </label>
              </div>
              -->
              <div class="meta-info mt-3">
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
              </div>
          </div>
      </div>
  `;

  const checkButton = card.querySelector('.check-url');
  checkButton.addEventListener('click', () => checkUrl(index));

  // Automatically check URL when card is created
  setTimeout(() => checkUrl(index), 100 * index);

  return card;
}

async function fetchWithCORSCheck(url) {
  try {
      const response = await fetch(url);
      return response;
  } catch (error) {
      if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('CORS')) ) {
        console.log(CORS_PROXY + url)
        return fetch(CORS_PROXY + url);
      }
      // throw error;
  }
}

function getStatusClass(status) {
  if (!status || status === 'Not checked' || status === 'Processing') return 'status-processing';
  if (status === 'OK') return 'status-success';
  return 'status-error';
}

async function checkUrl(index) {
  const urlObj = urls[index];
  try {
      urlObj.status = 'Processing';
      updateUrlCard(index);

      const response = await fetchWithCORSCheck(urlObj.url);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const metaInfo = extractMetaInfo(html);
      urlObj.meta = metaInfo;
      urlObj.checked = true;
      urlObj.status = 'OK';
  } catch (error) {
      urlObj.checked = true;
      urlObj.status = `Error: ${error.message}`;
  }

  urls[index] = urlObj;
  updateUrlCard(index);
  updateStats();
}

function extractMetaInfo(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  return {
      google: {
          title: doc.querySelector('title')?.textContent || '',
          description: doc.querySelector('meta[name="description"]')?.content || '',
          canonical: doc.querySelector('link[rel="canonical"]')?.href || '',
          robots: doc.querySelector('meta[name="robots"]')?.content || '',
      },
      facebook: {
          title: doc.querySelector('meta[property="og:title"]')?.content || '',
          description: doc.querySelector('meta[property="og:description"]')?.content || '',
          image: doc.querySelector('meta[property="og:image"]')?.content || '',
          url: doc.querySelector('meta[property="og:url"]')?.content || '',
          type: doc.querySelector('meta[property="og:type"]')?.content || '',
      },
      twitter: {
          card: doc.querySelector('meta[name="twitter:card"]')?.content || '',
          title: doc.querySelector('meta[name="twitter:title"]')?.content || '',
          description: doc.querySelector('meta[name="twitter:description"]')?.content || '',
          image: doc.querySelector('meta[name="twitter:image"]')?.content || '',
      },
  };
}

function updateUrlCard(index) {
  const urlObj = urls[index];
  const card = document.querySelector(`.card[data-index="${index}"]`);
  if (!card) return;

  const statusElement = card.querySelector('.status');
  statusElement.textContent = `Status: ${urlObj.status}`;
  statusElement.className = `status ${getStatusClass(urlObj.status)}`;
  statusElement.textContent = `Status: ${urlObj.status}`;

  const metaContainer = card.querySelector('.meta-info');
  if (urlObj.meta) {
      metaContainer.innerHTML = `
          <h6>Google Meta:</h6>
          <p>Title: ${urlObj.meta.google.title}</p>
          <p>Description: ${urlObj.meta.google.description}</p>
          <p>Canonical: ${urlObj.meta.google.canonical}</p>
          <p>Robots: ${urlObj.meta.google.robots}</p>

          <h6>Facebook Meta:</h6>
          <p>Title: ${urlObj.meta.facebook.title}</p>
          <p>Description: ${urlObj.meta.facebook.description}</p>
          <p>URL: ${urlObj.meta.facebook.url}</p>
          <p>Type: ${urlObj.meta.facebook.type}</p>
          ${urlObj.meta.facebook.image ? `<img src="${urlObj.meta.facebook.image}" alt="OG Image" style="max-width: 100%; height: auto;">` : ''}

          <h6>Twitter Meta:</h6>
          <p>Card: ${urlObj.meta.twitter.card}</p>
          <p>Title: ${urlObj.meta.twitter.title}</p>
          <p>Description: ${urlObj.meta.twitter.description}</p>
          ${urlObj.meta.twitter.image ? `<img src="${urlObj.meta.twitter.image}" alt="Twitter Image" style="max-width: 100%; height: auto;">` : ''}
      `;
  }
}

function updateStats() {
  const checkedUrls = urls.filter(url => url.checked).length;
  checkedUrlsSpan.textContent = checkedUrls;
}

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUrls = urls.filter(urlObj => urlObj.url.toLowerCase().includes(searchTerm));
    renderFilteredUrls(filteredUrls);
});

function renderFilteredUrls(filteredUrls) {
    urlGrid.innerHTML = '';
    filteredUrls.forEach((urlObj, index) => {
        const card = createUrlCard(urlObj, index);
        urlGrid.appendChild(card);
    });
}

// openAllButton.addEventListener('click', () => {
//     urls.forEach((urlObj, index) => {
//         const checkbox = document.getElementById(`checkbox${index}`);
//         if (checkbox && checkbox.checked) {
//             window.open(urlObj.url, '_blank');
//         }
//     });
// });

// Export CSV

const exportButton = document.getElementById('exportButton');

exportButton.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "URL,Status,Google Title,Google Description,Google Canonical,Google Robots,";
    csvContent += "Facebook Title,Facebook Description,Facebook Image,Facebook URL,Facebook Type,";
    csvContent += "Twitter Card,Twitter Title,Twitter Description,Twitter Image\n";

    urls.forEach(urlObj => {
        let row = [
            urlObj.url,
            urlObj.status || '',
            urlObj.meta?.google.title || '',
            urlObj.meta?.google.description || '',
            urlObj.meta?.google.canonical || '',
            urlObj.meta?.google.robots || '',
            urlObj.meta?.facebook.title || '',
            urlObj.meta?.facebook.description || '',
            urlObj.meta?.facebook.image || '',
            urlObj.meta?.facebook.url || '',
            urlObj.meta?.facebook.type || '',
            urlObj.meta?.twitter.card || '',
            urlObj.meta?.twitter.title || '',
            urlObj.meta?.twitter.description || '',
            urlObj.meta?.twitter.image || ''
        ];
        csvContent += row.map(value => `"${value.replace(/"/g, '""')}"`).join(',') + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sitemap_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
