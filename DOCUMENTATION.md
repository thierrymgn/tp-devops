# CloudForge — Documentation

> Panneau de contrôle cloud auto-hébergé — Projet DevOps 5A

---

## Prérequis

- Node.js ≥ 20
- Terraform CLI installé et dans le `$PATH`
- Docker Desktop **lancé**
- npm

---

## Installation

```bash
# Backend
cd cloudforge-api
npm install
cp .env.example .env

# Frontend
cd ../cloudforge
npm install
cp .env.example .env
```

---

## Variables d'environnement

**`cloudforge-api/.env`**
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
TERRAFORM_BASE_PATH=../terraform
TFVARS_PATH=./terraform/envs
```

**`cloudforge/.env`**
```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3001/api
```

---

## Lancement

```bash
# Terminal 1 — API
cd cloudforge-api
npm run dev

# Terminal 2 — Frontend
cd cloudforge
npm run dev
```

Ouvrir : **http://localhost:5173**

---

## Utilisation

### Créer une VM
1. Cliquer **New VM**
2. Renseigner : nom (minuscules/tirets), type, RAM, CPU, disk
3. Cliquer **Provision** → les logs Terraform s'affichent en temps réel
4. Quand le statut passe à **Running**, la VM est prête

### Accéder à une VM
```bash
# SSH
ssh debian@localhost -p <sshPort>

# Web (WordPress / Node)
open http://localhost:<httpPort>
```

> ⚠️ Toujours `localhost`, jamais l'IP Docker (`172.x.x.x`) — non accessible depuis macOS.

### Supprimer une VM
Bouton **Delete** → confirmation → `terraform destroy` + suppression du conteneur Docker.

### Envoyer les credentials à l'ESP32
- **Automatique** : déclenché à la fin de chaque `terraform apply` réussi
- **Manuel** : bouton **Send ESP32** sur la page de détail de la VM

---

## Architecture

```
Browser → React (5173) → Express API (3001) → Terraform CLI → Docker Engine
                                             ↘ ESP32 (192.168.190.152)
```

### Types de VM

| Type | Accès |
|------|-------|
| `debian` | SSH uniquement |
| `node` | SSH + port applicatif |
| `wordpress` | SSH + HTTP |
| `wordpress-multisite` | SSH + HTTP |

### API — endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/vms` | Créer et provisionner une VM |
| `GET` | `/api/vms` | Lister les VMs |
| `GET` | `/api/vms/:id/logs` | Stream SSE des logs Terraform |
| `GET` | `/api/vms/:id/stats` | CPU/RAM du conteneur en temps réel |
| `DELETE` | `/api/vms/:id` | Détruire la VM (`?force=true` pour forcer) |
| `POST` | `/api/vms/:id/send-to-esp32` | Renvoyer les credentials à l'ESP32 |

---

## ESP32

Les credentials SSH (et WordPress) sont chiffrés en **AES-128-CBC** avant envoi.

| Paramètre | Valeur |
|-----------|--------|
| Algorithme | AES-128-CBC |
| KEY | `1234567890abcdef` |
| IV | `abcdef1234567890` |
| IP ESP32 | `192.168.190.152` → à modifier dans `cloudforge-api/src/services/esp32.js` ligne 3 |

Le message affiché sur l'écran OLED :
```
[nom-vm]
SSH: debian
PW: <mot-de-passe>
WP: admin          ← wordpress uniquement
WP-PW: <mdp-wp>   ← wordpress uniquement
```

---

## Structure des fichiers clés

```
cloudforge-api/
├── server.js                  # Point d'entrée Express
├── src/routes/vms.js          # Toute la logique VM
├── src/services/terraform.js  # spawn() terraform apply/destroy/output
├── src/services/esp32.js      # Chiffrement + envoi HTTP vers l'ESP32
├── src/services/state.js      # Persistance JSON (vms.json, ports.json)
└── src/utils/tfvars.js        # Génération des fichiers .tfvars

cloudforge/
├── src/pages/Dashboard.jsx    # Liste des VMs
├── src/pages/CreateVM.jsx     # Formulaire + streaming logs
├── src/pages/VMDetail.jsx     # Stats · SSH · Logs · ESP32
└── src/api/client.js          # Couche HTTP vers l'API

terraform/
├── modules/vm-base/           # Module Docker partagé
├── debian/                    # OpenSSH server
├── node/                      # Node.js
├── wordpress/                 # WordPress + MariaDB
└── wordpress-multisite/       # WordPress Multisite
```

---

*CloudForge — 2025*
