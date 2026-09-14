// ============================================================
// VOQCL SMP backend
//
// This is the one real piece of compute the whole system needs.
// Run it on any Linux machine with Docker installed (a VPS is
// easiest). The dashboard calls this API directly — it's what
// actually starts Minecraft servers, no terminal command for
// the end user.
//
// See ../README.md for the one-time playit.gg tunnel setup this
// depends on, and how to deploy this file.
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

const docker = new Docker(); // talks to /var/run/docker.sock by default

// Service-role client: bypasses Row Level Security, so this file
// must only ever run on your server, never be shipped to the browser.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLOTS_PATH = path.join(__dirname, 'slots.json');
function loadSlots(){
  if(!fs.existsSync(SLOTS_PATH)){
    throw new Error('slots.json not found — copy slots.example.json to slots.json and fill in your playit.gg addresses first.');
  }
  return JSON.parse(fs.readFileSync(SLOTS_PATH, 'utf8'));
}
function saveSlots(slots){
  fs.writeFileSync(SLOTS_PATH, JSON.stringify(slots, null, 2));
}

// ---------------- auth middleware ----------------
// Verifies the Supabase access token the frontend sends, so we know
// which real user is making the request (never trust a client-supplied id).
async function requireUser(req, res, next){
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if(!token) return res.status(401).json({ error: 'Missing auth token.' });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if(error || !data.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  req.user = data.user;
  next();
}

// ---------------- create a server ----------------
app.post('/api/servers', requireUser, async (req, res) => {
  const { name, type, version, ram } = req.body;
  if(!name || !type || !version || !ram){
    return res.status(400).json({ error: 'Missing name, type, version, or ram.' });
  }

  let slots;
  try{ slots = loadSlots(); } catch(e){ return res.status(500).json({ error: e.message }); }

  const slot = slots.find(s => !s.inUse);
  if(!slot){
    return res.status(503).json({ error: 'No free server slots right now. Add more in slots.json, or free one up.' });
  }

  const containerName = `mc-${req.user.id.slice(0,8)}-${name}-${Date.now()}`;

  // Insert a "starting" row immediately so the dashboard has something to show.
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('servers')
    .insert({
      user_id: req.user.id,
      name,
      mc_version: version,
      server_type: type,
      ram_mb: ram,
      status: 'starting',
      container_id: null,
      container_port: slot.port
    })
    .select()
    .single();
  if(insertErr) return res.status(500).json({ error: insertErr.message });

  try{
    await docker.pull('itzg/minecraft-server:latest');

    const container = await docker.createContainer({
      name: containerName,
      Image: 'itzg/minecraft-server:latest',
      Env: [
        'EULA=TRUE',
        `TYPE=${type}`,
        `VERSION=${version}`,
        `MEMORY=${ram}M`
      ],
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        PortBindings: { '25565/tcp': [{ HostPort: String(slot.port) }] },
        Binds: [`${containerName}-data:/data`]
      },
      ExposedPorts: { '25565/tcp': {} }
    });
    await container.start();

    slot.inUse = true;
    saveSlots(slots);

    await supabaseAdmin.from('servers').update({
      status: 'online',
      address: slot.address,
      container_id: container.id
    }).eq('id', row.id);

    return res.json({ id: row.id, address: slot.address, status: 'online' });

  } catch(err){
    await supabaseAdmin.from('servers').update({ status: 'error' }).eq('id', row.id);
    return res.status(500).json({ error: `Docker error: ${err.message}` });
  }
});

// ---------------- delete a server ----------------
app.delete('/api/servers/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('servers').select('*').eq('id', id).single();
  if(fetchErr || !row) return res.status(404).json({ error: 'Server not found.' });
  if(row.user_id !== req.user.id) return res.status(403).json({ error: 'Not your server.' });

  if(row.container_id){
    try{
      const container = docker.getContainer(row.container_id);
      await container.stop().catch(() => {});
      await container.remove({ v: true }).catch(() => {});
    } catch(e){ /* container may already be gone — continue */ }
  }

  if(row.container_port){
    const slots = loadSlots();
    const slot = slots.find(s => s.port === row.container_port);
    if(slot){ slot.inUse = false; saveSlots(slots); }
  }

  await supabaseAdmin.from('servers').delete().eq('id', id);
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`VOQCL SMP backend listening on :${port}`));
