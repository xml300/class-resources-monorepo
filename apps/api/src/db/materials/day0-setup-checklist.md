# Day 0 Setup Checklist: 10-Day Node.js & TypeScript Bootcamp

Complete this checklist **before 9:00 AM on Day 1** so we can spend class time coding instead of troubleshooting installations.

---

## 1. Core Runtime & Package Manager
- [ ] **Node.js (v22+ LTS or v24 LTS)**
  - Download from [nodejs.org](https://nodejs.org/) (choose the **LTS** release) or install via `nvm` / `fnm`.
  - Verify in your terminal:
    ```bash
    node -v   # Should print v22.x.x or v24.x.x
    npm -v    # Should print 10.x.x or 11.x.x
    ```

---

## 2. Code Editor (VS Code)
- [ ] **Visual Studio Code** installed ([code.visualstudio.com](https://code.visualstudio.com/)).
- [ ] **Recommended Extensions:**
  - **ESLint** (`dbaeumer.vscode-eslint`)
  - **Prettier - Code formatter** (`esbenp.prettier-vscode`)
  - **Error Lens** (`usernamehw.errorlens`) — *optional, great for seeing TypeScript errors inline*
  - **REST Client** (`humao.rest-client`) *or* **Thunder Client** (`rangav.vscode-thunder-client`)
  - **Docker** (`ms-azuretools.vscode-docker`) — *needed starting Day 5*

---

## 3. Git & GitHub (Required for FlowBoard on Days 5–8)
- [ ] **Git** installed (`git --version`).
- [ ] **GitHub account** created at [github.com](https://github.com/).
- [ ] **Git identity configured:**
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```
- [ ] **GitHub authentication working** (SSH key or GitHub CLI `gh auth login` / HTTPS credential manager). Test by cloning any public repo or running:
  ```bash
  ssh -T git@github.com   # If using SSH
  ```

---

## 4. Docker & PostgreSQL (Required Starting Day 5)
We run PostgreSQL in Docker so everyone has an identical database environment without local installation headaches.
- [ ] **Docker Desktop** (macOS / Windows) or **Docker Engine + Compose** (Linux) installed and running.
- [ ] Verify in terminal:
  ```bash
  docker --version
  docker compose version
  ```
- [ ] **Pre-pull the Postgres image** before class (saves classroom Wi-Fi bandwidth on Day 5):
  ```bash
  docker pull postgres:16-alpine
  ```
- *(Windows users)*: Ensure **WSL 2** is enabled and Docker Desktop is configured to use the WSL 2 backend.

---

## 5. API Testing Tool
Pick **one** of the following to test HTTP endpoints from Day 2 onward:
- [ ] **Bruno** (lightweight, offline-friendly) or **Postman** / **Insomnia**
- [ ] *Or* **VS Code REST Client / Thunder Client** extension
- [ ] Verify `curl` works in your terminal (`curl --version`).

---

## 6. Cloud Accounts (Required for Day 10 Deployment)
Create free-tier accounts ahead of time so you aren't blocked by email/phone verification during Day 10:
- [ ] **Neon** ([neon.tech](https://neon.tech/)) — Serverless PostgreSQL (free tier, no credit card required).
- [ ] **Railway** ([railway.app](https://railway.app/)) — App hosting & log/metrics observability (sign in with GitHub).

---

## 7. Quick Pre-Flight Verification Script
Run this command block in your terminal. Every line should succeed without errors:

```bash
echo "Node:" && node -v && \
echo "npm:" && npm -v && \
echo "Git:" && git --version && \
echo "Git User:" && git config user.name && git config user.email && \
echo "Docker:" && docker --version && docker compose version && \
echo "All core tools ready!"
```

---

## Troubleshooting Quick Fixes
- **`node` not found after installing (Windows/macOS):** Close and reopen your terminal (or restart VS Code) so `PATH` refreshes.
- **`docker` permission denied (Linux):** Run `sudo usermod -aG docker $USER` and log out/in.
- **`docker compose` command not found:** Update Docker Desktop or install the `docker-compose-plugin` package.
