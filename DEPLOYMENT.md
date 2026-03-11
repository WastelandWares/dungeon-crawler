# Deployment Guide

Turtles uses GitHub Actions to automatically build and deploy on push. There are two environments:

| Environment | Branch | URL | Server Path |
|-------------|--------|-----|-------------|
| Development | `_dev` | https://dev.turtles.wastelandwares.com | `/var/www/turtles-dev/` |
| Production | `main` | https://turtles.wastelandwares.com | `/var/www/turtles/` |

## How It Works

1. Push to `_dev` or `main` triggers the corresponding workflow
2. GitHub Actions checks out the code, installs deps (`npm ci`), and builds (`npx vite build`)
3. The built `dist/` directory is deployed via `rsync` over SSH to the target server
4. The `--delete` flag ensures removed files are cleaned up on the server

## Setting Up GitHub Secrets

Three repository secrets must be configured in **Settings → Secrets and variables → Actions**:

### `DEPLOY_SSH_KEY`

A private SSH key that grants access to the deployment server.

```bash
# Generate a dedicated deploy key (on your local machine)
ssh-keygen -t ed25519 -C "github-deploy@turtles" -f ~/.ssh/turtles_deploy -N ""

# Copy the public key to the server
ssh-copy-id -i ~/.ssh/turtles_deploy.pub <user>@<host>
```

Paste the contents of `~/.ssh/turtles_deploy` (the **private** key) into the GitHub secret.

### `DEPLOY_SSH_HOST`

The hostname or IP address of the deployment server (e.g., `turtles.wastelandwares.com`).

### `DEPLOY_SSH_USER`

The SSH username on the server that owns the web root directories.

## Server Prerequisites

On the deployment server, ensure:

1. **Web root directories exist** with correct ownership:
   ```bash
   sudo mkdir -p /var/www/turtles /var/www/turtles-dev
   sudo chown <deploy-user>:<deploy-user> /var/www/turtles /var/www/turtles-dev
   ```

2. **Web server** (nginx, Apache, etc.) is configured to serve both directories
3. **SSH access** is enabled for the deploy user with key-based authentication
4. **rsync** is installed on the server

## Manual Deployment

If you need to deploy manually (bypassing CI):

```bash
npm ci
npx vite build
rsync -avz --delete dist/ <user>@<host>:/var/www/turtles/
```

## Troubleshooting

- **Workflow fails at rsync:** Check that all three secrets are set and the SSH key is authorized on the server
- **Permission denied:** Ensure the deploy user owns `/var/www/turtles*` directories
- **Build fails:** Run `npm ci && npx vite build` locally to reproduce
- **Site not updating:** Check the GitHub Actions run log; confirm the correct branch triggered the correct workflow
