const engineSelect = document.getElementById('engine-select');
const bioInput = document.getElementById('bio-input');
const recommendBtn = document.getElementById('recommend-btn');
const treeContainer = document.getElementById('taxonomy-tree');

async function fetchTaxonomy(params = {}) {
    const baseUrl = engineSelect.value;
    const url = new URL(`${baseUrl}/api/v1/taxonomy`);
    
    // Always include bio if present
    const bio = bioInput.value.trim();
    if (bio) {
        url.searchParams.append('bio', bio);
    }

    if (params.universe_id) url.searchParams.append('universe_id', params.universe_id);
    if (params.community_id) url.searchParams.append('community_id', params.community_id);

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIifQ.Ohod_I40pebQeQCWPeO7WT7InVdD5vrtkTResAPuA-Q'
            }
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error("Fetch error:", e);
        return [];
    }
}

function createNodeElement(data, type) {
    const isRecommended = data.is_recommended;
    
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'taxonomy-node';

    if (type === 'club') {
        nodeDiv.className = `club-card ${isRecommended ? 'recommended' : ''}`;
        nodeDiv.innerHTML = `
            <div class="club-title">${data.club_name}</div>
        `;
        return nodeDiv;
    }

    const id = type === 'universe' ? data.universe_id : data.community_id;
    const name = type === 'universe' ? data.universe_name : data.community_name;

    const header = document.createElement('div');
    header.className = `node-header ${isRecommended ? 'node-recommended' : ''}`;
    header.innerHTML = `
        <span class="node-title">${name}</span>
        <span class="badge">${type}</span>
    `;

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'node-children';

    let loaded = false;

    header.addEventListener('click', async () => {
        if (!loaded) {
            header.querySelector('.badge').innerHTML = '<span class="loading"></span>';
            const childParams = type === 'universe' ? { universe_id: id } : { community_id: id };
            const childrenData = await fetchTaxonomy(childParams);
            
            header.querySelector('.badge').textContent = type;
            childrenContainer.innerHTML = '';
            
            if (childrenData.length === 0) {
                childrenContainer.innerHTML = '<p class="placeholder-text">Empty.</p>';
            } else {
                const childType = type === 'universe' ? 'community' : 'club';
                childrenData.forEach(child => {
                    childrenContainer.appendChild(createNodeElement(child, childType));
                });
            }
            loaded = true;
        }
        childrenContainer.classList.toggle('open');
    });

    nodeDiv.appendChild(header);
    nodeDiv.appendChild(childrenContainer);
    return nodeDiv;
}

recommendBtn.addEventListener('click', async () => {
    recommendBtn.innerHTML = '<span class="loading"></span> Recommending...';
    recommendBtn.disabled = true;

    treeContainer.innerHTML = '';
    const universes = await fetchTaxonomy();

    if (universes.length === 0) {
        treeContainer.innerHTML = '<p class="placeholder-text">No data found or backend unreachable.</p>';
    } else {
        universes.forEach(u => {
            treeContainer.appendChild(createNodeElement(u, 'universe'));
        });
    }

    recommendBtn.textContent = 'Recommend';
    recommendBtn.disabled = false;
});
