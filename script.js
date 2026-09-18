const bioInput = document.getElementById('bio-input');
const recommendBtn = document.getElementById('recommend-btn');
const treeContainer = document.getElementById('taxonomy-tree');

async function fetchTaxonomy(params = {}) {
    const baseUrl = 'https://shekarss-hybrid-search.hf.space';
    // const baseUrl = 'http://localhost:8001';
    const url = new URL(`${baseUrl}/api/v1/taxonomy`);

    const nameInput = document.getElementById('name-input');
    const genderSelect = document.getElementById('gender-select');

    // Always include bio if present
    const bio = bioInput.value.trim();
    const name = nameInput ? nameInput.value.trim() : "";
    const gender = genderSelect ? genderSelect.value : "";

    if (name) {
        url.searchParams.append('name', name);
    } else if (bio) {
        url.searchParams.append('name', 'TestUser');
    }

    if (bio) {
        url.searchParams.append('bio', bio);
    }

    if (gender) {
        url.searchParams.append('gender', gender);
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

        let matchBadgeHtml = '';
        if (data.match_type) {
            const badgeClass = data.match_type === 'direct' ? 'badge-direct' : 'badge-indirect';
            matchBadgeHtml = `<span class="badge ${badgeClass}">${data.match_type.toUpperCase()} MATCH</span>`;
        }

        let reasoningHtml = '';
        if (data.reasoning) {
            reasoningHtml = `<div class="club-reasoning">💡 <strong>AI Reasoning:</strong> ${data.reasoning}</div>`;
        }

        nodeDiv.innerHTML = `
            <div class="club-title">${data.club_name} ${matchBadgeHtml}</div>
            ${reasoningHtml}
            <div class="feedback-buttons" style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="btn-feedback" onclick="submitFeedback('${data.club_id}', '${data.club_name}', ${isRecommended}, 'right', this)" style="background: #2a2a2a; border: 1px solid #444; border-radius: 5px; padding: 5px 10px; cursor: pointer;">👍 Right</button>
                <button class="btn-feedback" onclick="submitFeedback('${data.club_id}', '${data.club_name}', ${isRecommended}, 'wrong', this)" style="background: #2a2a2a; border: 1px solid #444; border-radius: 5px; padding: 5px 10px; cursor: pointer;">👎 Wrong</button>
            </div>
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

// Global variables to grab input for feedback
function getBioInput() {
    return document.getElementById('bio-input').value.trim();
}

async function submitFeedback(clubId, clubName, wasRecommended, feedbackType, btnElement) {
    const bio = getBioInput();
    if (!bio) {
        alert("Bio is missing. Cannot submit feedback without the original bio.");
        return;
    }
    
    // UI update
    const parent = btnElement.parentElement;
    parent.innerHTML = `<span style="color: #4CAF50; font-size: 0.9em;">Thanks for your feedback!</span>`;

    // Send to backend
    try {
        await fetch(`${baseUrl}/api/v1/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bio: bio,
                club_id: clubId,
                club_name: clubName,
                was_recommended: wasRecommended,
                user_feedback: feedbackType
            })
        });
    } catch (e) {
        console.error("Failed to submit feedback", e);
    }
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
