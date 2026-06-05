resource "docker_image" "app" {
  name         = var.image
  keep_locally = true
}

resource "docker_volume" "data" {
  name = "${var.vm_name}-data"
}

resource "docker_network" "net" {
  count = var.network_name == "" ? 1 : 0
  name  = "${var.vm_name}-net"
}

locals {
  network_name = var.network_name != "" ? var.network_name : docker_network.net[0].name
}

resource "docker_container" "app" {
  name  = var.vm_name
  image = docker_image.app.image_id

  # RAM hard limit; swap set to -1 (unlimited) so memory can be increased freely
  memory       = var.ram
  memory_swap  = -1
  cpu_shares   = var.cpu * 1024

  must_run = true
  restart  = "unless-stopped"

  networks_advanced {
    name    = local.network_name
    aliases = var.network_aliases
  }

  dynamic "volumes" {
    for_each = var.mounts
    content {
      volume_name    = docker_volume.data.name
      container_path = volumes.value
    }
  }

  dynamic "ports" {
    for_each = var.ports
    content {
      internal = ports.value.internal
      external = ports.value.external
    }
  }

  env = var.env
}
