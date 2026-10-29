#!/usr/bin/env bash
# PROTOTYPE, throwaway. Runs on the VM: installs Node, LiveKit and Caddy, then starts LiveKit, the turn API and the worker.
set -euo pipefail
IP=$1 HOST="${1//./-}.sslip.io" DIR=$HOME/p/voice-livekit
command -v node >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -; sudo apt-get install -y nodejs; }
command -v pnpm >/dev/null || sudo npm i -g pnpm@12
command -v livekit-server >/dev/null || curl -sSL https://get.livekit.io | bash
command -v caddy >/dev/null || sudo apt-get install -y caddy
cd $DIR && pnpm install && pnpm worker:download

[ -f $DIR/.env ] || printf 'LIVEKIT_API_KEY=proto%s\nLIVEKIT_API_SECRET=%s\n' "$(openssl rand -hex 4)" "$(openssl rand -hex 24)" > $DIR/.env
. $DIR/.env
cat > $DIR/livekit.yaml <<EOF
port: 7880
rtc: { tcp_port: 7881, port_range_start: 50000, port_range_end: 60000, use_external_ip: true }
keys: { $LIVEKIT_API_KEY: $LIVEKIT_API_SECRET }
logging: { level: warn }
EOF
cat >> $DIR/.env <<EOF
LIVEKIT_URL=wss://$HOST
GOOGLE_CLOUD_PROJECT=look-together
TURN_URL=http://localhost:8080/turn
EOF
sort -u -t= -k1,1 -o $DIR/.env $DIR/.env

echo "$HOST {
  reverse_proxy /token* localhost:8080
  reverse_proxy localhost:7880
}" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl reload caddy

unit() { # name, command
  sudo tee /etc/systemd/system/proto-$1.service >/dev/null <<EOF
[Service]
User=$USER
WorkingDirectory=$DIR
EnvironmentFile=$DIR/.env
Environment=LIVEKIT_URL_INTERNAL=ws://localhost:7880
ExecStart=$2
Restart=always
[Install]
WantedBy=multi-user.target
EOF
}
unit livekit "/usr/local/bin/livekit-server --config $DIR/livekit.yaml"
unit turn "/usr/bin/node server/turn.mjs"
unit worker "/usr/bin/env LIVEKIT_URL=ws://localhost:7880 /usr/bin/node worker/agent.mjs start"
sudo systemctl daemon-reload
sudo systemctl enable --now proto-livekit proto-turn proto-worker
sudo systemctl restart proto-livekit proto-turn proto-worker
echo "PROTOTYPE running at https://$HOST"
