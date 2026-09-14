// ============================================================
// Set this to the raw GitHub URL of scripts/create-server.sh
// once you've pushed this repo, e.g.:
// "https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/scripts/create-server.sh"
// ============================================================
const INSTALL_SCRIPT_URL = "https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/scripts/create-server.sh";

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

// ---------------- GENERATOR ----------------
let lastConfig = null;

document.getElementById('generateBtn').addEventListener('click', () => {
  const name = document.getElementById('srvName').value.trim() || 'mc-server';
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const type = document.getElementById('srvType').value;
  const version = document.getElementById('srvVersion').value.trim() || 'LATEST';
  const ram = document.getElementById('srvRam').value;

  lastConfig = { name: safeName, type, version, ram };

  const cmd = `curl -sSL ${INSTALL_SCRIPT_URL} | bash -s -- `
    + `--name "${safeName}" --version "${version}" --type "${type}" --ram "${ram}"`;

  document.getElementById('genCmd').textContent = cmd;
  document.getElementById('genOutput').style.display = 'block';
});

document.getElementById('copyCmdBtn').addEventListener('click', (e) => {
  const text = document.getElementById('genCmd').textContent;
  navigator.clipboard?.writeText(text);
  const btn = e.currentTarget;
  const original = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => btn.textContent = original, 1200);
});

// Save the generated config as a new "pending" server row.
// A second button appears once generated, letting the user save it,
// then paste in the real address once they've claimed their tunnel.
const generateBtn = document.getElementById('generateBtn');
generateBtn.insertAdjacentHTML('afterend',
  '<button class="btn sm solid" id="saveConfigBtn" style="margin-left:10px; display:none;">Save this server</button>');
const saveConfigBtn = document.getElementById('saveConfigBtn');

document.getElementById('generateBtn').addEventListener('click', () => {
  saveConfigBtn.style.display = 'inline-flex';
});

saveConfigBtn.addEventListener('click', async () => {
  if(!lastConfig) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  if(!user) return;
  const { error } = await supabaseClient.from('servers').insert({
    user_id: user.id,
    name: lastConfig.name,
    mc_version: lastConfig.version,
    server_type: lastConfig.type,
    ram_mb: parseInt(lastConfig.ram, 10),
    status: 'pending'
  });
  const createMsg = document.getElementById('createMsg');
  if(error){ showMsg(createMsg, error.message, false); return; }
  showMsg(createMsg, 'Saved. Run the command above, then paste your address into the server card below.', true);
  loadServers();
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
          <input type="text" class="addr-input" placeholder="paste your playit.gg address here"
                 value="${srv.address || ''}">
          <button class="btn sm save-addr">Save address</button>
          <button class="btn sm danger delete-srv">Delete</button>
        </div>
      </div>
      <span class="pill-status ${srv.address ? 'online' : 'pending'}">${srv.address ? 'online' : 'pending'}</span>
    </div>
  `).join('');

  listEl.querySelectorAll('.server-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.save-addr').addEventListener('click', async () => {
      const address = card.querySelector('.addr-input').value.trim();
      await supabaseClient.from('servers').update({ address, status: address ? 'online' : 'pending' }).eq('id', id);
      loadServers();
    });
    card.querySelector('.delete-srv').addEventListener('click', async () => {
      if(!confirm('Delete this saved server? This does not stop the actual server, just removes it from your dashboard.')) return;
      await supabaseClient.from('servers').delete().eq('id', id);
      loadServers();
    });
  });
}
