resource "random_password" "ssh_password" {
  length  = 16
  special = false
}

# linuxserver/openssh-server gives us SSH + a writable home directory.
# Node.js is installed at container start via the DOCKER_MODS mechanism,
# which pulls the linuxserver Node.js mod on first boot.
module "node" {
  source = "../modules/vm-base"

  vm_name   = var.vm_name
  image     = "linuxserver/openssh-server:latest"
  ram       = var.ram
  cpu       = var.cpu
  disk_size = var.disk_size
  mounts    = ["/config"]

  ports = [
    { internal = 2222, external = var.ssh_port },
    { internal = 3000, external = var.app_port },
  ]

  env = [
    "PUID=1000",
    "PGID=1000",
    "TZ=Europe/Paris",
    "USER_NAME=${var.ssh_user}",
    "USER_PASSWORD=${random_password.ssh_password.result}",
    "PASSWORD_ACCESS=true",
    "SUDO_ACCESS=true",
    # Installs Node.js LTS via the linuxserver mod system on first boot
    "DOCKER_MODS=linuxserver/mods:openssh-server-nodejs",
  ]
}
