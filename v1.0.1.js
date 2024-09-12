import './style.css'

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const sitemapFile = document.getElementById('sitemapFile');
const sitemapContent = document.getElementById('sitemapContent');
const sitemapUrlInput = document.getElementById('sitemapUrl');
const parseButton = document.getElementById('parseButton');
const urlGrid = document.getElementById('urlGrid');
const totalUrlsSpan = document.getElementById('totalUrls');
const checkedUrlsSpan = document.getElementById('checkedUrls');
const loadingFetchUrl = document.getElementById('loadingFetchUrl');
const logContent = document.getElementById('logContent');
const cancelButton = document.getElementById('cancelButton');
const currentYear = document.getElementById('currentYear');

const concurrentRequestsInput = document.getElementById('concurrentRequests');
let MAX_CONCURRENT_REQUESTS = 15; // Default value

const BATCH_SIZE = 50; // Process in batches
let processingQueue = [];


// Add variables for SEO meta options at the top of the file
const googleMetaCheckbox = document.getElementById('googleMeta');
const facebookMetaCheckbox = document.getElementById('facebookMeta');
const twitterMetaCheckbox = document.getElementById('twitterMeta');

// Display copyright year
const numYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = numYear === 2024 ? '2024' : `2024 - ${currentYear}`;

let urls = [];
let isCancelled = false;
let abortController;
let dataTable;

// Add new variable to track the number of requests being processed
let activeRequests = 0;
let requestCompletedAll = false;

// Add new variables
const gridViewBtn = document.getElementById('gridViewBtn');
const tableViewBtn = document.getElementById('tableViewBtn');
const tableContainer = document.getElementById('tableContainer');

// Add new variable
const noRenderUIBtn = document.getElementById('noRenderUIBtn');

// Add events for toggle buttons
gridViewBtn.addEventListener('click', () => setViewMode('grid'));
tableViewBtn.addEventListener('click', () => setViewMode('table'));
noRenderUIBtn.addEventListener('click', () => setViewMode('noRender'));

// Add variable to track current view mode
let currentViewMode = 'grid';

// Function to set view mode
function setViewMode(mode) {
  currentViewMode = mode;
  gridViewBtn.classList.toggle('btn-primary', mode === 'grid');
  gridViewBtn.classList.toggle('btn-secondary', mode !== 'grid');
  tableViewBtn.classList.toggle('btn-primary', mode === 'table');
  tableViewBtn.classList.toggle('btn-secondary', mode !== 'table');
  noRenderUIBtn.classList.toggle('btn-primary', mode === 'noRender');
  noRenderUIBtn.classList.toggle('btn-secondary', mode !== 'noRender');

  updateUIVisibility();
}

// Update updateUIVisibility function
function updateUIVisibility() {
  const isGridHidden = currentViewMode !== 'grid';
  const isTableHidden = currentViewMode !== 'table';
  urlGrid.style.display = isGridHidden ? 'none' : 'flex';
  if (isTableHidden) {
    tableContainer.style.display = 'none'
  } else {
    tableContainer.style.display = 'block'
    renderDataTableWhenReady();
  }

  if (currentViewMode === 'noRender') {
    urlGrid.style.display = 'none';
    tableContainer.style.display = 'none';
  }
}

// Update renderSingleUrl function
function renderSingleUrl(urlObj, index) {
    const card = createUrlCard(urlObj, index);
    urlGrid.appendChild(card)
}

function initDataTable() {
  if (dataTable) {
    dataTable.destroy();
  }

  const columns = [
    { data: 'url', title: 'URL' },
    { data: 'status', title: 'Status' }
  ];

  if (googleMetaCheckbox.checked) {
    columns.push(
      { data: 'meta.google.title', title: 'Google Title' },
      { data: 'meta.google.description', title: 'Google Description' },
      { data: 'meta.google.keywords', title: 'Google Keywords' },
      { data: 'meta.google.canonical', title: 'Google Canonical' },
      { data: 'meta.google.robots', title: 'Google Robots' },
      { data: 'meta.google.favicon', title: 'Google Favicon' }
    );
  }

  if (facebookMetaCheckbox.checked) {
    columns.push(
      { data: 'meta.facebook.title', title: 'Facebook Title' },
      { data: 'meta.facebook.description', title: 'Facebook Description' },
      { data: 'meta.facebook.image', title: 'Facebook Image' },
      { data: 'meta.facebook.url', title: 'Facebook URL' },
      { data: 'meta.facebook.type', title: 'Facebook Type' },
      { data: 'meta.facebook.siteName', title: 'Facebook Site Name' },
      { data: 'meta.facebook.locale', title: 'Facebook Locale' }
    );
  }

  if (twitterMetaCheckbox.checked) {
    columns.push(
      { data: 'meta.twitter.card', title: 'Twitter Card' },
      { data: 'meta.twitter.title', title: 'Twitter Title' },
      { data: 'meta.twitter.description', title: 'Twitter Description' },
      { data: 'meta.twitter.image', title: 'Twitter Image' },
      { data: 'meta.twitter.site', title: 'Twitter Site' },
      { data: 'meta.twitter.creator', title: 'Twitter Creator' }
    );
  }

  // Create table structure
  const tableHtml = `
    <table id="urlTable" class="table table-striped table-bordered">
      <thead>
        <tr>
          ${columns.map(col => `<th>${col.title}</th>`).join('')}
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  // Insert table structure into container
  tableContainer.innerHTML = tableHtml;

  dataTable = $('#urlTable').DataTable({
    data: urls,
    columns: columns,
    pageLength: 10,
    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
    language: {
      url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/en-GB.json'
    },
    dom: 'Bfrtip',
    buttons: [
      'colvis'
    ]
  });
}

// Add event listeners for SEO meta checkboxes
googleMetaCheckbox.addEventListener('change', updateDataTable);
facebookMetaCheckbox.addEventListener('change', updateDataTable);
twitterMetaCheckbox.addEventListener('change', updateDataTable);

function updateDataTable() {
  if (dataTable) {
    initDataTable();
  }
}

sitemapFile.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
          sitemapContent.value = e.target.result;
      };

      reader.readAsText(file);
  } else {
      sitemapContent.value = ''; // Reset textarea when no file is selected
  }
});

loadingFetchUrl.addEventListener('click', async (event) => {
  event.preventDefault();
 sitemapUrlInput.dispatchEvent(new Event('change'));
});

sitemapUrlInput.addEventListener('change', async (event) => {
  const url = event.target.value;
  sitemapContent.value = ''; // Reset textarea when URL changes
  const iconLoadingFetchUrl = loadingFetchUrl.innerHTML
  if (url) {
      try {
          loadingFetchUrl.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
          loadingFetchUrl.style.display = 'inline-block';

          const response = await fetchWithCORSCheck(url);

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();
          sitemapContent.value = text;
          logMessage(`Fetched sitemap from ${url}`);
      } catch (error) {
          logMessage(`Failed to fetch sitemap: ${error.message}`);
          alert(`Failed to fetch sitemap: ${error.message}`);
      } finally {
          loadingFetchUrl.innerHTML = iconLoadingFetchUrl;
      }
  }
});

function updateUrlCounts() {
  totalUrlsSpan.textContent = urls.length;
  checkedUrlsSpan.textContent = urls.filter(url => url.checked).length;
}

// Function to update button states
function updateButtonStates() {
  console.log(activeRequests)
  if (activeRequests > 1) {
    showButtonProcessing();
  } else {
    showButtonOriginal();
  }
}

function showButtonProcessing() {
  parseButton.disabled = true;
  parseButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${parseButton.dataset.textProcessing}`;
  cancelButton.style.display = 'inline-block';
}

function showButtonOriginal() {
  parseButton.disabled = false;
  parseButton.innerHTML = parseButton.dataset.textDefault;
  cancelButton.style.display = 'none';
}

// Add new function to render DataTable when all requests are completed
function renderDataTableWhenReady() {
  if (requestCompletedAll && tableContainer.style.display !== 'none') {
    if (!dataTable) {
      initDataTable();
    } else {
      dataTable.clear().rows.add(urls).draw();
    }
  }
}

// Update checkUrl function
async function checkUrl(index) {
  if (isCancelled) return;
  const urlObj = urls[index];
  const card = document.querySelector(`.card[data-index="${index}"]`);
  const metaContainer = card?.querySelector('.meta-info');

  try {
    activeRequests++;
    updateButtonStates();

    urlObj.status = 'Processing';
    updateUrlCard(index);
    logMessage(`Checking URL: ${urlObj.url}`);

    if (metaContainer) {
      metaContainer.innerHTML = `
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
      `;
    }

    const response = await fetchWithCORSCheck(urlObj.url, abortController);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const metaInfo = extractMetaInfo(html);
    urlObj.meta = metaInfo;
    urlObj.checked = true;
    urlObj.status = 'OK';
    logMessage(`Successfully checked URL: ${urlObj.url}`);
  } catch (error) {
    if (error.message === 'Request was cancelled') {
      urlObj.status = 'Cancelled';
    } else {
      urlObj.checked = true;
      urlObj.status = `Error: ${error.message}`;
      logMessage(`Error checking URL ${urlObj.url}: ${error.message}`);
    }
  } finally {
    activeRequests--;
    if (activeRequests === 0) {
      requestCompletedAll = true;
      renderDataTableWhenReady();
    }
    updateButtonStates();
    urls[index] = urlObj;
    updateUrlCard(index);
    updateStats();

    if (dataTable) {
      dataTable.row(index).data(urlObj).draw(false);
    }
  }
}

// Update parseButton.addEventListener
parseButton.addEventListener('click', async () => {
  if (activeRequests > 0) return;

  // Update MAX_CONCURRENT_REQUESTS
  const userInput = parseInt(concurrentRequestsInput.value);
  MAX_CONCURRENT_REQUESTS = userInput > 0 ? userInput : 15;

  isCancelled = false;
  abortController = new AbortController();

  // Clear old results
  urlGrid.innerHTML = '';
  urls = [];
  updateUrlCounts();
  updateUIVisibility();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(sitemapContent.value, "text/xml");
  let urlElements = xmlDoc.getElementsByTagName("url");

  if (!urlElements.length) {
    urlElements = xmlDoc.getElementsByTagName("sitemap");
  }

  if (!urlElements.length) {
    alert("Unable to detect URL structure in sitemap.");
    return;
  }

  showButtonProcessing();
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    await fetchUrlsRecursively(Array.from(urlElements), parser);
  } catch (error) {
    logMessage(`Error processing sitemap: ${error.message}`);
  } finally {
    logMessage('Successfully processed sitemap');
  }
});

// Update cancelButton.addEventListener
cancelButton.addEventListener('click', () => {
  if (activeRequests === 0) return;

  isCancelled = true;
  if (abortController) {
    abortController.abort();
  }
  logMessage('User cancelled the operation');
});

async function fetchUrlsRecursively(urlElements, parser, depth = 0) {
    if (isCancelled) return;

    const processUrlElement = async (urlElement) => {
        if (isCancelled) return;

        const loc = urlElement.getElementsByTagName("loc")[0].textContent;
        if (urlElement.tagName === 'sitemap') {
            try {
                logMessage(`Accessing child sitemap (depth ${depth}): ${loc}`);
                const response = await fetchWithCORSCheck(loc, abortController);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                logMessage(`Successfully loaded child sitemap: ${loc}`);
                const subXmlDoc = parser.parseFromString(text, "text/xml");
                const subUrlElements = subXmlDoc.getElementsByTagName("sitemap");
                if (subUrlElements.length) {
                    await fetchUrlsRecursively(Array.from(subUrlElements), parser, depth + 1);
                } else {
                    const subUrls = subXmlDoc.getElementsByTagName("url");
                    logMessage(`Found ${subUrls.length} URLs in child sitemap: ${loc}`);
                    Array.from(subUrls).forEach(subUrl => {
                        if (isCancelled) return;
                        const subLoc = subUrl.getElementsByTagName("loc")[0].textContent;
                        addAndRenderUrl(subLoc);
                    });
                }
            } catch (error) {
                logMessage(`Error loading child sitemap ${loc}: ${error.message}`);
                addAndRenderUrl(loc);
            }
        } else {
            addAndRenderUrl(loc);
        }
    };

    for (const urlElement of urlElements) {
        processingQueue.push(() => processUrlElement(urlElement));
    }

    await processQueue();
}

async function processQueue() {
    while (processingQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
        const batch = processingQueue.splice(0, Math.min(BATCH_SIZE, MAX_CONCURRENT_REQUESTS - activeRequests));
        activeRequests += batch.length;
        await Promise.all(batch.map(async (task) => {
            try {
                await task();
            } finally {
                activeRequests--;
            }
        }));
    }

    if (processingQueue.length > 0) {
        setTimeout(processQueue, 100);
    }
}

function addAndRenderUrl(url) {
    const urlObj = { url, checked: false };
    urls.push(urlObj);
    renderSingleUrl(urlObj, urls.length - 1);
    updateUrlCounts();
    processingQueue.push(() => checkUrl(urls.length - 1));
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        processQueue();
    }
}

// Update createUrlCard function to remove SEO meta options
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
              <div class="meta-info mt-3">
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
              </div>
              <div class="schema-info mt-3">
                  <details>
                      <summary class="schema-summary">Loading schema...</summary>
                      <pre class="schema-content mt-2"><div class="skeleton skeleton-text"></div></pre>
                  </details>
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

async function fetchWithCORSCheck(url, controller = null) {
  try {
      const options = controller ? { signal: controller.signal } : {};
      const response = await fetch(url, options);
      return response;
  } catch (error) {
      if (error.name === 'AbortError') {
          throw new Error('Request was cancelled');
      }
      if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('CORS'))) {
        console.log(CORS_PROXY + url)
        return fetch(CORS_PROXY + url, controller ? { signal: controller.signal } : {});
      }
      throw error;
  }
}

function getStatusClass(status) {
  if (!status || status === 'Not checked' || status === 'Processing') return 'status-processing';
  if (status === 'OK') return 'status-success';
  return 'status-error';
}

function extractMetaInfo(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  return {
    google: {
      title: doc.querySelector('title')?.textContent || '',
      description: doc.querySelector('meta[name="description"]')?.content || '',
      keywords: doc.querySelector('meta[name="keywords"]')?.content || '',
      canonical: doc.querySelector('link[rel="canonical"]')?.href || '',
      robots: doc.querySelector('meta[name="robots"]')?.content || '',
      favicon: doc.querySelector('link[rel="icon"]')?.href || '',
    },
    facebook: {
      title: doc.querySelector('meta[property="og:title"]')?.content || '',
      description: doc.querySelector('meta[property="og:description"]')?.content || '',
      image: doc.querySelector('meta[property="og:image"]')?.content || '',
      url: doc.querySelector('meta[property="og:url"]')?.content || '',
      type: doc.querySelector('meta[property="og:type"]')?.content || '',
      siteName: doc.querySelector('meta[property="og:site_name"]')?.content || '',
      locale: doc.querySelector('meta[property="og:locale"]')?.content || '',
    },
    twitter: {
      card: doc.querySelector('meta[name="twitter:card"]')?.content || '',
      title: doc.querySelector('meta[name="twitter:title"]')?.content || '',
      description: doc.querySelector('meta[name="twitter:description"]')?.content || '',
      image: doc.querySelector('meta[name="twitter:image"]')?.content || '',
      site: doc.querySelector('meta[name="twitter:site"]')?.content || '',
      creator: doc.querySelector('meta[name="twitter:creator"]')?.content || '',
    },
    schema: doc.querySelector('script[type="application/ld+json"]')?.textContent || '',
  };
}

// Update updateUrlCard function
function updateUrlCard(index) {
  const urlObj = urls[index];
  const card = document.querySelector(`.card[data-index="${index}"]`);
  if (!card) return;

  const statusElement = card.querySelector('.status');
  statusElement.textContent = `Status: ${urlObj.status}`;
  statusElement.className = `status ${getStatusClass(urlObj.status)}`;

  const metaContainer = card.querySelector('.meta-info');
  const schemaDetails = card.querySelector('.schema-info details');
  const schemaSummary = card.querySelector('.schema-summary');
  const schemaContent = card.querySelector('.schema-content');

  if (urlObj.meta) {
    let metaHtml = '';

    if (googleMetaCheckbox.checked) {
      metaHtml += `
        <h6>Google Meta:</h6>
        <p>Title: ${urlObj.meta.google.title}</p>
        <p>Description: ${urlObj.meta.google.description}</p>
        <p>Keywords: ${urlObj.meta.google.keywords}</p>
        <p>Canonical: ${urlObj.meta.google.canonical}</p>
        <p>Robots: ${urlObj.meta.google.robots}</p>
        ${urlObj.meta.google.favicon ? `<p>Favicon: <img src="${urlObj.meta.google.favicon}" alt="Favicon" style="width: 16px; height: 16px;"></p>` : ''}
      `;
    }

    if (facebookMetaCheckbox.checked) {
      metaHtml += `
        <h6>Facebook Meta:</h6>
        <p>Title: ${urlObj.meta.facebook.title}</p>
        <p>Description: ${urlObj.meta.facebook.description}</p>
        <p>URL: ${urlObj.meta.facebook.url}</p>
        <p>Type: ${urlObj.meta.facebook.type}</p>
        <p>Site Name: ${urlObj.meta.facebook.siteName}</p>
        <p>Locale: ${urlObj.meta.facebook.locale}</p>
        ${urlObj.meta.facebook.image ? `<p>Image: <img src="${urlObj.meta.facebook.image}" alt="OG Image" style="width: 100px; height: 100px; object-fit: contain"></p>` : ''}
      `;
    }

    if (twitterMetaCheckbox.checked) {
      metaHtml += `
        <h6>Twitter Meta:</h6>
        <p>Card: ${urlObj.meta.twitter.card}</p>
        <p>Title: ${urlObj.meta.twitter.title}</p>
        <p>Description: ${urlObj.meta.twitter.description}</p>
        <p>Site: ${urlObj.meta.twitter.site}</p>
        <p>Creator: ${urlObj.meta.twitter.creator}</p>
        ${urlObj.meta.twitter.image ? `<p>Image: <img src="${urlObj.meta.twitter.image}" alt="Twitter Image" style="max-width: 100%; height: auto;"></p>` : ''}
      `;
    }

    metaContainer.innerHTML = metaHtml;

    if (urlObj.meta.schema) {
      schemaSummary.textContent = 'Show schema';
      schemaContent.textContent = JSON.stringify(JSON.parse(urlObj.meta.schema), null, 2);
      schemaDetails.style.display = 'block';
    } else {
      schemaSummary.textContent = 'No content';
      schemaContent.textContent = '';
      schemaDetails.style.display = 'none';
    }
  }
}

function updateStats() {
  const checkedUrls = urls.filter(url => url.checked).length;
  checkedUrlsSpan.textContent = checkedUrls;
}

// Export CSV

const exportButton = document.getElementById('exportButton');

exportButton.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let headers = ["URL", "Status"];

    if (googleMetaCheckbox.checked) {
        headers = headers.concat(["Google Title", "Google Description", "Google Keywords", "Google Canonical", "Google Robots", "Google Favicon"]);
    }
    if (facebookMetaCheckbox.checked) {
        headers = headers.concat(["Facebook Title", "Facebook Description", "Facebook Image", "Facebook URL", "Facebook Type", "Facebook Site Name", "Facebook Locale"]);
    }
    if (twitterMetaCheckbox.checked) {
        headers = headers.concat(["Twitter Card", "Twitter Title", "Twitter Description", "Twitter Image", "Twitter Site", "Twitter Creator"]);
    }

    // Add Schema column to headers
    headers.push("Schema");

    csvContent += headers.join(',') + "\n";

    urls.forEach(urlObj => {
        let row = [
            urlObj.url,
            urlObj.status || ''
        ];

        if (googleMetaCheckbox.checked) {
            row = row.concat([
                urlObj.meta?.google.title || '',
                urlObj.meta?.google.description || '',
                urlObj.meta?.google.keywords || '',
                urlObj.meta?.google.canonical || '',
                urlObj.meta?.google.robots || '',
                urlObj.meta?.google.favicon || ''
            ]);
        }

        if (facebookMetaCheckbox.checked) {
            row = row.concat([
                urlObj.meta?.facebook.title || '',
                urlObj.meta?.facebook.description || '',
                urlObj.meta?.facebook.image || '',
                urlObj.meta?.facebook.url || '',
                urlObj.meta?.facebook.type || '',
                urlObj.meta?.facebook.siteName || '',
                urlObj.meta?.facebook.locale || ''
            ]);
        }

        if (twitterMetaCheckbox.checked) {
            row = row.concat([
                urlObj.meta?.twitter.card || '',
                urlObj.meta?.twitter.title || '',
                urlObj.meta?.twitter.description || '',
                urlObj.meta?.twitter.image || '',
                urlObj.meta?.twitter.site || '',
                urlObj.meta?.twitter.creator || ''
            ]);
        }

        // Add Schema content to row
        row.push(urlObj.meta?.schema || '');

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

function logMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    logContent.value += `[${timestamp}] ${message}\n`;
    logContent.scrollTop = logContent.scrollHeight;
}
