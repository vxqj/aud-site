const API_BASE = "/api"; // Your backend endpoint

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

document.getElementById('lookupDiscord').onclick = async () => {
    const id = document.getElementById('discordId').value.trim();
    if (!id) return;
    showLoader('discordResult');
    const data = await fetchAPI(`/discord/${id}`);
    renderDiscord(data, 'discordResult');
};

document.getElementById('checkBreach').onclick = async () => {
    const email = document.getElementById('breachEmail').value.trim();
    if (!email) return;
    showLoader('breachResult');
    const data = await fetchAPI(`/breach/${email}`);
    renderBreach(data, 'breachResult');
};

document.getElementById('scanEmail').onclick = async () => {
    const email = document.getElementById('osintEmail').value.trim();
    if (!email) return;
    showLoader('emailResult');
    const data = await fetchAPI(`/email-osint/${email}`);
    renderEmailOSINT(data, 'emailResult');
};

document.getElementById('scanUsername').onclick = async () => {
    const user = document.getElementById('usernameInput').value.trim();
    if (!user) return;
    showLoader('usernameResult');
    const data = await fetchAPI(`/username/${user}`);
    renderUsername(data, 'usernameResult');
};

document.getElementById('lookupIP').onclick = async () => {
    const ip = document.getElementById('ipInput').value.trim();
    if (!ip) return;
    showLoader('ipResult');
    const data = await fetchAPI(`/ip/${ip}`);
    renderIP(data, 'ipResult');
};

async function fetchAPI(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        return await res.json();
    } catch(e) {
        return { error: "API offline or rate limited" };
    }
}

function showLoader(elementId) {
    document.getElementById(elementId).innerHTML = '<div class="loader"></div> Loading...';
}

function renderDiscord(data, elementId) {
    const div = document.getElementById(elementId);
    if (data.error) { div.innerHTML = `<span style="color:#f66">❌ ${data.error}</span>`; return; }
    div.innerHTML = `
        <div style="display:flex; gap:15px; align-items:center;">
            ${data.avatar ? `<img src="${data.avatar}" style="width:64px; border-radius:50%;">` : ''}
            <div><strong>${data.username || 'Unknown'}</strong>#${data.discriminator || '0000'}<br>
            <span style="color:#0ff">ID: ${data.id}</span><br>
            Created: ${data.created_at || 'N/A'}<br>
            Banner: ${data.banner || 'None'}<br>
            Mutual Servers: ${data.mutual_guilds?.length || 0}</div>
        </div>
        ${data.bio ? `<p>📝 Bio: ${data.bio}</p>` : ''}
        ${data.public_flags ? `<p>🚩 Flags: ${data.public_flags}</p>` : ''}
    `;
}

function renderBreach(data, elementId) {
    const div = document.getElementById(elementId);
    if (data.error) { div.innerHTML = `<span style="color:#f66">❌ ${data.error}</span>`; return; }
    if (!data.breaches || data.breaches.length === 0) {
        div.innerHTML = '✅ No known breaches (good!)';
        return;
    }
    div.innerHTML = `<span style="color:#f66">💀 ${data.breaches.length} breaches found:</span><br><br>` +
        data.breaches.map(b => `📛 <strong>${b.Name}</strong> - ${b.BreachDate}<br>📧 ${b.DataClasses?.join(', ')}<br><br>`).join('');
}

function renderEmailOSINT(data, elementId) {
    const div = document.getElementById(elementId);
    if (data.error) { div.innerHTML = `<span style="color:#f66">❌ ${data.error}</span>`; return; }
    div.innerHTML = `
        <p>📬 Email: ${data.email}</p>
        <p>🧑‍💻 Social accounts found: ${data.socials?.length || 0}</p>
        <ul>${data.socials?.map(s => `<li><a href="${s.url}" target="_blank">${s.platform}</a></li>`).join('') || 'None'}</ul>
        <p>📜 Breach count: ${data.breach_count || 0}</p>
    `;
}

function renderUsername(data, elementId) {
    const div = document.getElementById(elementId);
    if (data.error) { div.innerHTML = `<span style="color:#f66">❌ ${data.error}</span>`; return; }
    const found = data.profiles?.filter(p => p.exists) || [];
    div.innerHTML = `<p>🔍 Found on ${found.length}/${data.total} platforms</p><div style="display:flex;flex-wrap:wrap;gap:10px;">` +
        found.map(p => `<a href="${p.url}" target="_blank" style="background:#1a1a2e;padding:8px 15px;border-radius:20px;">${p.name}</a>`).join('') +
        `</div>`;
}

function renderIP(data, elementId) {
    const div = document.getElementById(elementId);
    if (data.error) { div.innerHTML = `<span style="color:#f66">❌ ${data.error}</span>`; return; }
    div.innerHTML = `
        <p>🌍 IP: ${data.ip}</p>
        <p>📍 Location: ${data.city}, ${data.region}, ${data.country_name}</p>
        <p>📡 ISP: ${data.org}</p>
        <p>🗺️ Coordinates: ${data.latitude}, ${data.longitude}</p>
        <p>⏰ Timezone: ${data.timezone}</p>
    `;
}