#!/usr/bin/env bash
# ============================================================
# VOQCL SMP — Minecraft server creator
# Run on any Linux machine you control (your PC, a Raspberry Pi,
# or a VPS). Requires sudo for the Docker install step.
#
# Usage:
#   curl -sSL <raw-url-to-this-file> | bash -s -- \
#     --name "my-server" --version "1.21.1" --type "PAPER" --ram "2048"
# ============================================================
set -e

NAME="mc-server"
VERSION="LATEST"
TYPE="PAPER"
RAM="2048"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --type) TYPE="$2"; shift 2 ;;
    --ram) RAM="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; shift ;;
  esac
done

echo "== VOQCL SMP setup =="
echo "Name: $NAME | Type: $TYPE | Version: $VERSION | RAM: ${RAM}MB"
echo

# --- 1. Docker ---
if ! command -v docker &> /dev/null; then
  echo "-> Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
  echo "   Docker installed. You may need to log out and back in for group changes to apply."
else
  echo "-> Docker already installed, skipping."
fi

# --- 2. Minecraft server container ---
echo "-> Starting Minecraft server container ($NAME)..."
docker rm -f "$NAME" 2>/dev/null || true
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -e EULA=TRUE \
  -e TYPE="$TYPE" \
  -e VERSION="$VERSION" \
  -e MEMORY="${RAM}M" \
  -p 25565:25565 \
  -v "${NAME}-data":/data \
  itzg/minecraft-server

echo "   Container started. It can take a minute or two to finish generating the world"
echo "   — check progress with: docker logs -f $NAME"

# --- 3. playit.gg tunnel (free public address, no port forwarding) ---
echo
echo "-> Setting up your public address via playit.gg..."
if ! command -v playit &> /dev/null; then
  curl -SsL https://playit-cloud.github.io/ppa/key.gpg | sudo apt-key add - 2>/dev/null || true
  sudo curl -SsL -o /etc/apt/sources.list.d/playit-cloud.list https://playit-cloud.github.io/ppa/playit-cloud.list 2>/dev/null || true
  sudo apt update -y && sudo apt install -y playit || {
    echo "   Automatic install didn't work for your distro — grab a binary from https://playit.gg/download";
  }
fi

echo
echo "============================================================"
echo " Almost done."
echo " Run:   playit"
echo " It will print a one-time claim URL — open it in any browser,"
echo " log in (free), and add a Minecraft Java tunnel pointed at"
echo " 127.0.0.1:25565. It will hand you an address like:"
echo "     something.joinmc.link"
echo
echo " Paste that address into your VOQCL SMP dashboard to save it."
echo "============================================================"
echo
echo "Useful commands:"
echo "  docker logs -f $NAME        # watch server startup / console"
echo "  docker exec -i $NAME rcon-cli  # send in-game commands"
echo "  docker stop $NAME           # stop the server"
echo "  docker start $NAME          # start it again after a reboot"
