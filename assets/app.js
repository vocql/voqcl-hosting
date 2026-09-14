// ============================================================
// Point this at your backend once it's deployed (see /backend).
// e.g. "https://api.yourdomain.com" or "http://YOUR_VPS_IP:3000"
// ============================================================
const BACKEND_URL = "https://YOUR-BACKEND-DOMAIN-OR-IP";

const authView = document.getElementById('authView');
const dashView = document.getElementById('dashView');
const authMsg = document.getElementById('authMsg');
const logoutBtn = document.getElementById('logoutBtn');

function showMsg(el, text, ok){
  el.textContent = text;
  el.className = 'msg show ' + (ok ? 'ok' : 'err');
}

// ---------------- AUTH ----------------
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error){ showMsg(authMsg, error.message, false); return; }
  await refreshSession();
});

document.getElementById('signupBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if(password.length < 6){ showMsg(authMsg, 'Password needs at least 6 characters.', false); return; }
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if(error){ showMsg(authMsg, error.message, false); return; }
  showMsg(authMsg, 'Account created. Check your email to confirm, then log in.', true);
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  await refreshSession();
});

async function refreshSession(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session){
    authView.style.display = 'none';
    dashView.style.display = 'block';
    logoutBtn.style.display = 'inline-flex';
    loadServers();
  } else {
    authView.style.display = 'block';
    dashView.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}
refreshSession();

// ---------------- VERSION FIELD ----------------
const versionSelect = document.getElementById('srvVersion');
const versionCustom = document.getElementById('srvVersionCustom');
versionSelect.addEventListener('change', () => {
  versionCustom.style.display = versionSelect.value === 'CUSTOM' ? 'block' : 'none';
});

// ---------------- CREATE SERVER (calls your backend directly) ----------------
const createBtn = document.getElementById('createBtn');
const createMsg = document.getElementById('createMsg');

createBtn.addEventListener('click', async () => {
  const name = (document.getElementById('srvName').value.trim() || 'mc-server')
    .toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const type = document.getElementById('srvType').value;
  const ram = document.getElementById('srvRam').value;
  let version = versionSelect.value;
  if(version === 'CUSTOM'){
    version = versionCustom.value.trim() || 'LATEST';
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session){ showMsg(createMsg, 'Please log in first.', false); return; }

  createBtn.disabled = true;
  createBtn.innerHTML = '<span class="spinner"></span>Creating…';
  showMsg(createMsg, 'Starting your server — this usually takes 30–90 seconds.', true);

  try{
    const res = await fetch(`${BACKEND_URL}/api/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name, type, version, ram: parseInt(ram, 10) })
    });
    const data = await res.json();
    if(!res.ok){ throw new Error(data.error || 'Failed to create server.'); }
    showMsg(createMsg, `Server created! Address: ${data.address}`, true);
    loadServers();
  } catch(err){
    showMsg(createMsg, err.message || 'Something went wrong reaching the backend.', false);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Create server';
  }
});

// ---------------- SERVER LIST ----------------
async function loadServers(){
  const listEl = document.getElementById('serverList');
  const emptyEl = document.getElementById('emptyState');
  const { data, error } = await supabaseClient
    .from('servers')
    .select('*')
    .order('created_at', { ascending: false });

  if(error){ listEl.innerHTML = ''; return; }

  if(!data || data.length === 0){
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  listEl.innerHTML = data.map(srv => `
    <div class="server-card" data-id="${srv.id}">
      <div style="flex:1; min-width:220px;">
        <h4>${srv.name}</h4>
        <div class="meta">${srv.server_type} · ${srv.mc_version} · ${srv.ram_mb}MB</div>
        <div class="addr-row">
          <span class="addr-text">${srv.address || 'starting…'}</span>
          <button class="btn sm danger delete-srv">Stop &amp; delete</button>
        </div>
      </div>
      <span class="pill-status ${srv.status === 'online' ? 'online' : 'pending'}">${srv.status || 'pending'}</span>
    </div>
  `).join('');

  listEl.querySelectorAll('.server-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.delete-srv').addEventListener('click', async () => {
      if(!confirm('Stop and delete this server? This actually stops the container on the backend.')) return;
      const { data: { session } } = await supabaseClient.auth.getSession();
      try{
        const res = await fetch(`${BACKEND_URL}/api/servers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if(!res.ok){ const d = await res.json(); throw new Error(d.error || 'Failed to delete.'); }
      } catch(err){
        alert(err.message);
      }
      loadServers();
    });
  });
}

// Refresh the list periodically so "starting…" flips to a real address
// once the backend finishes provisioning, without needing a manual reload.
setInterval(() => {
  if(dashView.style.display !== 'none') loadServers();
}, 8000);
