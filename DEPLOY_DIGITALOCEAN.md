# Deploy to a DigitalOcean Droplet

This app is deployed as three Docker Compose services:

- `web`: Next.js 16 app
- `realtime`: Colyseus websocket server
- `caddy`: HTTPS reverse proxy

## DNS

Point these records to your Droplet public IPv4:

```
A  @   <DROPLET_IPV4>
A  www <DROPLET_IPV4>      # optional
A  ws  <DROPLET_IPV4>
```

Use `ws.ansemland.xyz` for Colyseus.

## Droplet Setup

SSH into the droplet, then install Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

Open HTTP/HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## Deploy

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_FOLDER>/myapp
cp .env.production.example .env.production
nano .env.production
docker compose up -d --build
```

Check logs:

```bash
docker compose logs -f
```

Health check for Colyseus:

```
https://ws.ansemland.xyz/health
```

## Updating

```bash
git pull
docker compose up -d --build
docker image prune -f
```
