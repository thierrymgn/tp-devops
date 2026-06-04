resource "random_password" "ssh_password" {
  length  = 16
  special = false
}

# linuxserver/openssh-server: Debian-based image with full SSH daemon,
# password auth, and configurable user — no custom Dockerfile needed.
module "debian" {
  source = "../modules/vm-base"

  vm_name   = var.vm_name
  image     = "linuxserver/openssh-server:latest"
  ram       = var.ram
  cpu       = var.cpu
  disk_size = var.disk_size
  mounts    = ["/config"]
  ports     = [{ internal = 2222, external = var.ssh_port }]

  env = [
    "PUID=1000",
    "PGID=1000",
    "TZ=Europe/Paris",
    "USER_NAME=${var.ssh_user}",
    "USER_PASSWORD=${random_password.ssh_password.result}",
    "PASSWORD_ACCESS=true",
    "SUDO_ACCESS=true",
  ]
}
