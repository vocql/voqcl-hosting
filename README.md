# VOQCL SMP

A branded site for generating real, self-hosted Minecraft servers, with
accounts and saved server info via Supabase.

**Important:** this site does not run Minecraft servers itself — nothing
hosted on GitHub can. It generates a one-line command that someone runs on
a machine they control (their PC or a cheap VPS), which stands up a real
server in Docker and tunnels it through the free [playit.gg](https://playit.gg)
service to get a real, joinable address with no port forwarding.

## What's in this repo

```
index.html              Landing page
dashboard.html           Login/signup + server creator + saved servers
assets/style.css          Shared brand styling
assets/supabase-client.js Your Supabase keys go here
assets/app.js             Dashboard logic (auth, generator, saved servers)
scripts/create-server.sh  The real install script people run on their machine
supabase-schema.sql        Database setup (run once in Supabase)
```

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, paste in and run `supabase-schema.sql`.
3. Under **Authentication → Providers**, make sure "Email" is enabled
   (it is by default). Turn off "Confirm email" under
   **Authentication → Settings** if you want signups to work instantly
   without an email confirmation step.
4. Under **Project Settings → API**, copy your **Project URL** and
   **anon public** key.

## 2. Wire up the keys

Open `assets/supabase-client.js` and replace the two placeholder values
with your Project URL and anon key.

## 3. Point the generator at your repo

Once you've pushed this repo to GitHub, open `assets/app.js` and set
`INSTALL_SCRIPT_URL` to the raw URL of `scripts/create-server.sh`, e.g.:

```
https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/scripts/create-server.sh
```

## 4. Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. In the repo, go to **Settings → Pages**, set the source to your main
   branch (root), and save.
3. Your site will be live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

## 5. Try it end to end

1. Visit your live site, sign up on the dashboard, and log in.
2. Fill in the server creator and hit **Generate setup command**, then
   **Save this server**.
3. Run the printed command on a Linux machine (a spare PC, a Raspberry
   Pi, or any small VPS — Oracle Cloud and a few others have free tiers).
4. When `playit` prints its claim link, open it once in a browser to
   activate your free address.
5. Paste that address into the saved server card on your dashboard.

From there, the server is a normal Docker container — `docker stop
mc-server` / `docker start mc-server` on the machine it's running on,
any time.

## Customizing

- Swap the brand name/colors in `assets/style.css` (`:root` variables
  at the top) to match the rest of your site.
- The generator currently supports Vanilla, Paper, and Forge via the
  [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)
  image, which has many more options (plugins, mods, backups, whitelist)
  documented in its README if you want to extend `create-server.sh`.
