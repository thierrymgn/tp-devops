# CloudForge API

Backend Express.js qui orchestre la création de conteneurs Docker via Terraform.

## Architecture

```
Front React
    ↓  POST /api/vms { type: "wordpress", ram: 2048, cpu: 2 }
API Express  (ce projet)
    ↓  écrit les variables dans un fichier .tfvars
    ↓  exec("terraform apply -var-file=blog-prod.tfvars -auto-approve")
Terraform  (modules gérés par le coéquipier)
    ↓  lit modules/wordpress/main.tf  →  provider Docker
Docker Engine
    ↓  lance le conteneur wordpress:latest avec les bons paramètres
Conteneur WordPress qui tourne sur le port attribué
```

Les logs terraform sont streamés en temps réel vers le frontend via **Server-Sent Events** (SSE).

---

## Machines du cluster

| Machine | Rôle | IP |
|---------|------|----|
| master  | héberge l'API, Terraform et Docker Engine | 192.168.1.10 |
| worker  | uniquement Docker Engine | 192.168.1.11 |

---

## Prérequis

| Outil | Version |
|-------|---------|
| Node.js | ≥ 20 |
| Terraform | ≥ 1.5 |
| Docker Engine | ≥ 24 |
| npm | ≥ 9 |

---

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier d'environnement
cp .env.example .env

# 3. Éditer .env — au minimum pointer TERRAFORM_BASE_PATH vers les modules du coéquipier
nano .env

# 4. Démarrer en mode développement (nodemon)
npm run dev

# 5. Ou en production
npm start
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3001` | Port HTTP de l'API |
| `TERRAFORM_BASE_PATH` | `../terraform/modules` | Chemin vers les modules terraform du coéquipier |
| `TFVARS_PATH` | `./terraform/envs` | Dossier où les `.tfvars` sont écrits à l'exécution |
| `NODE_ENV` | `development` | Affecte le format des logs et le niveau de détail des erreurs |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisée (dev Vite) |

---

## Structure du projet

```
cloudforge-api/
  src/
    routes/
      vms.js          ← CRUD VMs + endpoint SSE /logs
      nodes.js        ← stats des machines Docker
    services/
      terraform.js    ← toutes les commandes terraform (spawn)
      state.js        ← index JSON des VMs + registre de ports
    middleware/
      errorHandler.js ← gestionnaire d'erreurs central
      logger.js       ← morgan
    utils/
      tfvars.js       ← générateur de fichiers .tfvars
    data/
      vms.json        ← index des VMs (gitignored, auto-créé)
      ports.json      ← registre des ports (gitignored, auto-créé)
  terraform/
    envs/             ← fichiers .tfvars créés à l'exécution (un par VM)
  .env.example
  server.js
  package.json
```

---

## API

Toutes les réponses utilisent cette enveloppe :

```json
// succès
{ "success": true, "data": { ... }, "message": "..." }

// erreur
{ "success": false, "error": "...", "details": "..." }
```

### Objet VM

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "blog-prod",
  "type": "wordpress",
  "status": "running",
  "ip": "172.17.0.2",
  "port": 8081,
  "ram": 2048,
  "cpu": 2,
  "disk": 20,
  "createdAt": "2026-06-04T10:00:00.000Z",
  "containerId": "a3f1b2c4d5...",
  "containerName": "blog-prod"
}
```

**Valeurs de status :** `provisioning` · `running` · `stopped` · `error`

---

### `GET /health`

```bash
curl http://localhost:3001/health
```

---

### `GET /api/nodes`

Retourne les deux machines du cluster avec leurs stats CPU/RAM.

```bash
curl http://localhost:3001/api/nodes
```

---

### `POST /api/vms`

Crée et lance un conteneur Docker via Terraform. Retourne **202** immédiatement,
le `terraform apply` tourne en arrière-plan.

```bash
curl -X POST http://localhost:3001/api/vms \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "blog-prod",
    "type": "wordpress",
    "ram": 2048,
    "cpu": 2,
    "disk": 20
  }'
```

**Types valides :** `wordpress-multisite` · `nodejs` · `wordpress` · `debian-vps`

---

### `GET /api/vms`

```bash
curl http://localhost:3001/api/vms
```

---

### `GET /api/vms/:id`

```bash
curl http://localhost:3001/api/vms/550e8400-...
```

---

### `PATCH /api/vms/:id`

Modifie les ressources du conteneur. Réécrit le `.tfvars` et relance `terraform apply`.
Docker recrée le conteneur si les paramètres ont changé.

```bash
curl -X PATCH http://localhost:3001/api/vms/550e8400-... \
  -H 'Content-Type: application/json' \
  -d '{ "ram": 4096, "cpu": 4 }'
```

---

### `DELETE /api/vms/:id`

Lance `terraform destroy` → Docker arrête et supprime le conteneur.

```bash
curl -X DELETE http://localhost:3001/api/vms/550e8400-...
```

---

### `GET /api/vms/:id/logs` — SSE

Stream temps réel du `terraform apply`. Chaque frame `data:` est un objet JSON :

```json
{ "line": "docker_container.vm: Creation complete after 2s", "stream": "stdout", "ts": "..." }
```

Un événement `done` final signale la fin du stream.

**JavaScript :**
```js
const es = new EventSource(`http://localhost:3001/api/vms/${id}/logs`)
es.onmessage = (e) => {
  const { line, stream } = JSON.parse(e.data)
  console.log(`[${stream}]`, line)
}
es.addEventListener('done', () => es.close())
```

**curl :**
```bash
curl -N http://localhost:3001/api/vms/550e8400-.../logs
```

---

## Intégration Terraform

### Fichier .tfvars généré par l'API (un par VM)

```hcl
vm_name = "blog-prod"
ram     = 2048
cpu     = 2
disk    = 20
port    = 8081
```

### Structure attendue des modules (côté coéquipier)

```
../terraform/modules/
  wordpress/
    main.tf        ← ressource docker_container, utilise var.vm_name / var.ram / etc.
    variables.tf   ← déclare vm_name, ram, cpu, disk, port
    outputs.tf     ← doit exposer : container_id, container_ip, container_port, container_name
  wordpress-multisite/
  nodejs/
  debian-vps/
```

### Exemple de outputs.tf attendu

```hcl
output "container_id"   { value = docker_container.vm.id }
output "container_ip"   { value = docker_container.vm.network_data[0].ip_address }
output "container_port" { value = var.port }
output "container_name" { value = docker_container.vm.name }
```

### Commandes exécutées par l'API

```bash
# création du conteneur
terraform -chdir=../terraform/modules/wordpress \
  apply \
  -var-file=/abs/path/to/blog-prod.tfvars \
  -auto-approve

# suppression du conteneur
terraform -chdir=../terraform/modules/wordpress \
  destroy \
  -var-file=/abs/path/to/blog-prod.tfvars \
  -auto-approve

# lecture des outputs après apply
terraform -chdir=../terraform/modules/wordpress output -json
```

---

## Codes d'erreur

| Code | Cause |
|------|-------|
| 400 | type de VM invalide, nom manquant ou module introuvable |
| 404 | VM inconnue |
| 409 | doublon de nom, ou VM encore en cours de provisionnement |
| 500 | `terraform apply/destroy` a échoué — le champ `details` contient le stderr |
| 503 | binaire `terraform` introuvable dans le PATH |

---

## Commandes utiles

```bash
# démarrer en mode watch
npm run dev

# suivre les logs SSE depuis le terminal
curl -N http://localhost:3001/api/vms/<id>/logs

# remettre l'état à zéro (supprime toutes les VMs de l'index)
echo '[]' > src/data/vms.json && echo '{"nextPort":8081}' > src/data/ports.json
```
