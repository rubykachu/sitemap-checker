import './style.css'

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const sitemapFile = document.getElementById('sitemapFile');
const sitemapContent = document.getElementById('sitemapContent');
const sitemapUrlInput = document.getElementById('sitemapUrl');
const parseButton = document.getElementById('parseButton');
const urlGrid = document.getElementById('urlGrid');
const searchInput = document.getElementById('searchInput');
const openAllButton = document.getElementById('openAllButton');
const totalUrlsSpan = document.getElementById('totalUrls');
const checkedUrlsSpan = document.getElementById('checkedUrls');
const loadingFetchUrl = document.getElementById('loadingFetchUrl');
const logContent = document.getElementById('logContent');
const cancelButton = document.getElementById('cancelButton');
const currentYear = document.getElementById('currentYear');

// Display copyright year
const numYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = numYear === 2024 ? '2024' : `2024 - ${currentYear}`;

let urls = [];
let isCancelled = false;
let abortController;

sitemapFile.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
          sitemapContent.value = e.target.result;
      };

      reader.readAsText(file);
  } else {
      sitemapContent.value = ''; // Reset textarea khi không có file được chọn
  }
});

loadingFetchUrl.addEventListener('click', async (event) => {
  event.preventDefault();
 sitemapUrlInput.dispatchEvent(new Event('change'));
});

sitemapUrlInput.addEventListener('change', async (event) => {
  const url = event.target.value;
  sitemapContent.value = ''; // Reset textarea khi URL thay đổi
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

parseButton.addEventListener('click', async () => {
    parseButton.disabled = true;
    parseButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    cancelButton.style.display = 'inline-block';
    isCancelled = false;
    abortController = new AbortController(); // Tạo AbortController mới

    // Xóa nội dung kết quả cũ
    urlGrid.innerHTML = '';
    urls = [];
    updateUrlCounts();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sitemapContent.value, "text/xml");
    let urlElements = xmlDoc.getElementsByTagName("url");

    if (!urlElements.length) {
        urlElements = xmlDoc.getElementsByTagName("sitemap");
    }

    if (!urlElements.length) {
        alert("The structure of the URL could not be detected in the sitemap.");
        location.reload();
        return;
    }

    try {
        await fetchUrlsRecursively(Array.from(urlElements), parser);
    } catch (error) {
        logMessage(`Error processing sitemap: ${error.message}`);
    } finally {
        parseButton.disabled = false;
        parseButton.innerHTML = 'Checking URL';
    }
});

cancelButton.addEventListener('click', () => {
    isCancelled = true;
    if (abortController) {
        abortController.abort(); // Hủy tất cả các request đang thực thi
    }
    parseButton.disabled = false;
    parseButton.innerHTML = 'Check URL';
    cancelButton.style.display = 'none';
    logMessage('Operation cancelled by user');
});

async function fetchUrlsRecursively(urlElements, parser, depth = 0) {
    const fetchPromises = urlElements.map(async (urlElement) => {
        const loc = urlElement.getElementsByTagName("loc")[0].textContent;
        if (urlElement.tagName === 'sitemap') {
            try {
                logMessage(`Đang truy cập sitemap con (độ sâu ${depth}): ${loc}`);
                const response = await fetchWithCORSCheck(loc, abortController);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                logMessage(`Đã tải thành công sitemap con: ${loc}`);
                const subXmlDoc = parser.parseFromString(text, "text/xml");
                const subUrlElements = subXmlDoc.getElementsByTagName("sitemap");
                if (subUrlElements.length) {
                    await fetchUrlsRecursively(Array.from(subUrlElements), parser, depth + 1);
                } else {
                    const subUrls = subXmlDoc.getElementsByTagName("url");
                    logMessage(`Tìm thấy ${subUrls.length} URL trong sitemap con: ${loc}`);
                    Array.from(subUrls).forEach(subUrl => {
                        const subLoc = subUrl.getElementsByTagName("loc")[0].textContent;
                        addAndRenderUrl(subLoc);
                    });
                }
            } catch (error) {
                logMessage(`Lỗi khi tải sitemap con ${loc}: ${error.message}`);
                addAndRenderUrl(loc);
            }
        } else {
            addAndRenderUrl(loc);
        }
    });

    await Promise.all(fetchPromises);
}

function addAndRenderUrl(url) {
    const urlObj = { url, checked: false };
    urls.push(urlObj);
    renderSingleUrl(urlObj, urls.length - 1);
    updateUrlCounts();
}

function renderSingleUrl(urlObj, index) {
    const card = createUrlCard(urlObj, index);
    urlGrid.appendChild(card);
}

// Thêm các biến cho tùy chọn meta SEO ở đầu file
const googleMetaCheckbox = document.getElementById('googleMeta');
const facebookMetaCheckbox = document.getElementById('facebookMeta');
const twitterMetaCheckbox = document.getElementById('twitterMeta');

// Cập nhật hàm createUrlCard để loại bỏ các tùy chọn meta SEO
function createUrlCard(urlObj, index) {
  const card = document.createElement('div');
  card.className = 'col';
  card.innerHTML = `
      <div class="card h-100" data-index="${index}">
          <div class="card-body">
              <h5 class="card-title"><a href="${urlObj.url}" target="_blank">${urlObj.url}</a></h5>
              <div class="card-header mb-3">
                  <span class="status ${getStatusClass(urlObj.status)}">
                      Trạng thái: ${urlObj.checked ? urlObj.status : 'Chưa kiểm tra'}
                  </span>
                  <button class="btn btn-outline-info btn-sm check-url" data-index="${index}">Làm mới Meta</button>
              </div>
              <div class="meta-info mt-3">
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
                  <div class="skeleton skeleton-text"></div>
              </div>
              <div class="schema-info mt-3">
                  <details>
                      <summary class="schema-summary">Đang tải schema...</summary>
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
  if (!status || status === 'Chưa kiểm tra' || status === 'Đang xử lý') return 'status-processing';
  if (status === 'OK') return 'status-success';
  return 'status-error';
}

async function checkUrl(index) {
  if (isCancelled) return;
  const urlObj = urls[index];
  const card = document.querySelector(`.card[data-index="${index}"]`);
  const metaContainer = card.querySelector('.meta-info');

  try {
      urlObj.status = 'Đang xử lý';
      updateUrlCard(index);
      logMessage(`Checking URL: ${urlObj.url}`);

      // Hiển thị skeleton loading
      metaContainer.innerHTML = `
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
      `;

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
          urlObj.status = 'Đã hủy';
      } else {
          urlObj.checked = true;
          urlObj.status = `Lỗi: ${error.message}`;
          logMessage(`Error checking URL ${urlObj.url}: ${error.message}`);
      }
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

// Cập nhật hàm updateUrlCard để sử dụng các tùy chọn meta SEO toàn cục
function updateUrlCard(index) {
  const urlObj = urls[index];
  const card = document.querySelector(`.card[data-index="${index}"]`);
  if (!card) return;

  const statusElement = card.querySelector('.status');
  statusElement.textContent = `Trạng thái: ${urlObj.status}`;
  statusElement.className = `status ${getStatusClass(urlObj.status)}`;

  const metaContainer = card.querySelector('.meta-info');
  const schemaDetails = card.querySelector('.schema-info details');
  const schemaSummary = card.querySelector('.schema-summary');
  const schemaContent = card.querySelector('.schema-content');

  if (urlObj.meta) {
    let metaHtml = '';

    if (googleMetaCheckbox.checked) {
      metaHtml += `
        <h6>Meta Google:</h6>
        <p>Tiêu đề: ${urlObj.meta.google.title}</p>
        <p>Mô tả: ${urlObj.meta.google.description}</p>
        <p>Từ khóa: ${urlObj.meta.google.keywords}</p>
        <p>Canonical: ${urlObj.meta.google.canonical}</p>
        <p>Robots: ${urlObj.meta.google.robots}</p>
        ${urlObj.meta.google.favicon ? `<p>Favicon: <img src="${urlObj.meta.google.favicon}" alt="Favicon" style="width: 16px; height: 16px;"></p>` : ''}
      `;
    }

    if (facebookMetaCheckbox.checked) {
      metaHtml += `
        <h6>Meta Facebook:</h6>
        <p>Tiêu đề: ${urlObj.meta.facebook.title}</p>
        <p>Mô tả: ${urlObj.meta.facebook.description}</p>
        <p>URL: ${urlObj.meta.facebook.url}</p>
        <p>Loại: ${urlObj.meta.facebook.type}</p>
        <p>Tên trang: ${urlObj.meta.facebook.siteName}</p>
        <p>Ngôn ngữ: ${urlObj.meta.facebook.locale}</p>
        ${urlObj.meta.facebook.image ? `<p>Hình ảnh: <img src="${urlObj.meta.facebook.image}" alt="OG Image" style="width: 100px; height: 100px; object-fit: contain"></p>` : ''}
      `;
    }

    if (twitterMetaCheckbox.checked) {
      metaHtml += `
        <h6>Meta Twitter:</h6>
        <p>Card: ${urlObj.meta.twitter.card}</p>
        <p>Tiêu đề: ${urlObj.meta.twitter.title}</p>
        <p>Mô tả: ${urlObj.meta.twitter.description}</p>
        <p>Site: ${urlObj.meta.twitter.site}</p>
        <p>Người tạo: ${urlObj.meta.twitter.creator}</p>
        ${urlObj.meta.twitter.image ? `<p>Hình ảnh: <img src="${urlObj.meta.twitter.image}" alt="Twitter Image" style="max-width: 100%; height: auto;"></p>` : ''}
      `;
    }

    metaContainer.innerHTML = metaHtml;

    if (urlObj.meta.schema) {
      schemaSummary.textContent = 'Hiển thị schema';
      schemaContent.textContent = JSON.stringify(JSON.parse(urlObj.meta.schema), null, 2);
      schemaDetails.style.display = 'block';
    } else {
      schemaSummary.textContent = 'Không có nội dung';
      schemaContent.textContent = '';
      schemaDetails.style.display = 'none';
    }
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
    let headers = ["URL", "Trạng thái"];

    if (googleMetaCheckbox.checked) {
        headers = headers.concat(["Google Tiêu đề", "Google Mô tả", "Google Từ khóa", "Google Canonical", "Google Robots", "Google Favicon"]);
    }
    if (facebookMetaCheckbox.checked) {
        headers = headers.concat(["Facebook Tiêu đề", "Facebook Mô tả", "Facebook Hình ảnh", "Facebook URL", "Facebook Loại", "Facebook Tên trang", "Facebook Ngôn ngữ"]);
    }
    if (twitterMetaCheckbox.checked) {
        headers = headers.concat(["Twitter Card", "Twitter Tiêu đề", "Twitter Mô tả", "Twitter Hình ảnh", "Twitter Site", "Twitter Người tạo"]);
    }

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
