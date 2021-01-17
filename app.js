// harvard key = be2c397a-8147-4d70-af64-be2bd722fef2

const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = 'apikey=be2c397a-8147-4d70-af64-be2bd722fef2'; // USE YOUR KEY HERE


let onFetchStart = () => $('#loading').addClass('active');

let onFetchEnd = () => $('#loading').removeClass('active');

async function fetchObjects() {
    const url = `${BASE_URL}/object?${KEY}`;
    try {
        const response = await fetch(url);
        const { info, records } = await response.json();
        return { info, records };

    } catch (error) {
        console.error(error);
    }
}


async function fetchAllCenturies() {
    const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

    if (localStorage.getItem('centuries')) {
        return JSON.parse(localStorage.getItem('centuries'));
    }

    try {
        const response = await fetch(url);
        const { info, records } = await response.json();

        localStorage.setItem('centuries', JSON.stringify(records));
        return records;
    } catch (error) {
        console.error(error);
    }
}

async function fetchAllClassifications() {
    const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

    if (localStorage.getItem('classifications')) {
        return JSON.parse(localStorage.getItem('classifications'));
    }

    try {
        const response = await fetch(url);
        const { info, records } = await response.json();

        localStorage.setItem('classifications', JSON.stringify(records));
        return records;
    } catch (error) {
        console.error(error);
    }
}

async function prefetchCategoryLists() {
    try {
        const [
            classifications, centuries
        ] = await Promise.all([
            fetchAllClassifications(),
            fetchAllCenturies()
        ]);

        $('.classification-count').text(`(${classifications.length})`);

        classifications.forEach(classification => {
            $('#select-classification').append($(`<option value="${classification.name}">
            ${classification.name}</option>`));
        });

        $('.century-count').text(`(${centuries.length})`);

        centuries.forEach(century => {
            $('#select-century').append($(`<option value="${century.name}">
            ${century.name}</option>`));
        });
    } catch (error) {
        console.error(error);
    }
}



let buildSearchString = () => {
    const classification = $('#select-classification').val();
    const century = $('#select-century').val();
    const keywords = $('#keywords').val();

    const reassembledURL = `${BASE_URL}/object?${KEY}&classification=${classification}&century=${century}&keyword=${keywords}`

    return reassembledURL;
}

$('#search').on('submit', async function (event) {
    event.preventDefault();
    onFetchStart();

    try {
        const url = await fetch(buildSearchString());
        const { info, records } = await url.json();
        updatePreview(records, info);
    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});

let renderPreview = (record) => {
    const {
        description, primaryimageurl, title
    } = record;

    const searchResult = $(`
    <div class="object-preview">
      <a href="#">
      ${primaryimageurl ? `<img src="${primaryimageurl}" />` : ''
        }
      ${title ? `<h3>${title}</h3>` : ''
        }
       ${description ? `<h3>${description}</h3>` : ''
        }
      </a>
    </div>
    `).data('record', record);

    return searchResult;
}


let updatePreview = (records, info) => {
    const root = $('#preview');

    if (info.next) {
        $('.next').data('url', info.next).attr('disabled', false);

    } else {
        $('.next').data('url', null).attr('disabled', true);
    };

    if (info.prev) {
        $('.previous').data('url', info.next).attr('disabled', false);

    } else {
        $('.previous').data('url', null).attr('disabled', true);
    };

    const resultsElm = root.find('.results');
    resultsElm.empty();

    records.forEach(record => resultsElm.append(renderPreview(record)));

}

function renderFeature(
    {
        title,
        dated,
        description,
        culture,
        style,
        technique,
        medium,
        dimensions,
        people,
        department,
        division,
        contact,
        creditline,
        images,
        primaryimageurl,
    }
) {


    return $(`<div class="object-feature">
    <header>
    <h3>${title}</h3>
    <h4>${dated}</h4>
  </header>
  <section class="facts">
    ${factHTML('Description', description)}
    ${factHTML('Culture', culture, 'culture')}
    ${factHTML('Style', style)}
    ${factHTML('Technique', technique, 'technique')}
    ${factHTML('Medium', medium, 'medium')}
    ${factHTML('Dimensions', dimensions)}
    ${people
            ? people.map(function (person) {
                return factHTML('Person', person.displayname, 'person');
            }).join('')
            : ''
        }
    ${factHTML('Department', department)}
    ${factHTML('Division', division)}
    ${factHTML('Contact', `<a target="_blank" href="mailto:${contact}">${contact}</a>`)}
    ${factHTML('Credit', creditline)}
  </section>
  <section class="photos">
    ${photosHTML(images, primaryimageurl)}
  </section>
    </div>`);
}

let searchURL = (searchType, searchString) => `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;

let factHTML = (title, content, searchTerm = null) => {
    if (!content) {
        return ''
    }

    return `<span class="title">${title}</span>
      <span class="content">
      ${searchTerm && content ?
            `<a href='${searchURL(searchTerm, content)}'>${content}</a>` : content} 
      </span>`
}

let photosHTML = (images, primaryimageurl) => {
    if (images && images.length > 0) {
        return images.map(image => `<img src='${image.baseimageurl}'/>`).join('');
    } else if (primaryimageurl) {
        return `<img src='${primaryimageurl}'/>`;
    } else {
        return ''
    }
}

$('#preview .next, #preview .previous').on('click', async function () {
    onFetchStart()

    try {
        const url = $(this).data('url');
        const fetchUrl = await fetch(url);
        const { records, info } = await fetchUrl.json();
        updatePreview(records, info)

    } catch {
        console.error(error);
    } finally {
        onFetchEnd();
    }
});


$('#preview').on('click', '.object-preview', function (event) {
    event.preventDefault();
    const closestObj = $(this).closest('.object-preview').data('record');
    $('#feature').html(renderFeature(closestObj));

});

$('#feature').on('click', 'a', async function (event) {
    const href = $(this).attr('href');

    if (href.startsWith('mailto')) { return; }

    event.preventDefault();

    onFetchStart();
    try {
        let fetchHref = await fetch(href);
        let { records, info } = await fetchHref.json();
        updatePreview(records, info);
    } catch (error) {
        console.error(error);
    } finally {
        onFetchEnd();
    }

});

prefetchCategoryLists();

