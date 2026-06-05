resource "random_password" "ssh_password" {
  length  = 16
  special = false
}

resource "random_password" "wp_admin_password" {
  length  = 16
  special = false
}

resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "random_password" "db_root_password" {
  length  = 16
  special = false
}

resource "docker_network" "net" {
  name = "${var.vm_name}-net"
}

# --- MariaDB ---

resource "docker_image" "mariadb" {
  name         = "bitnami/mariadb:latest"
  keep_locally = true
}

resource "docker_volume" "db_data" {
  name = "${var.vm_name}-db-data"
}

resource "docker_container" "mariadb" {
  name    = "${var.vm_name}-mariadb"
  image   = docker_image.mariadb.image_id
  restart = "unless-stopped"

  memory     = 256
  cpu_shares = 512

  networks_advanced {
    name    = docker_network.net.name
    aliases = ["mariadb"]
  }

  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/bitnami/mariadb"
  }

  env = [
    "MARIADB_ROOT_PASSWORD=${random_password.db_root_password.result}",
    "MARIADB_DATABASE=wordpress",
    "MARIADB_USER=wp_user",
    "MARIADB_PASSWORD=${random_password.db_password.result}",
  ]
}

# --- WordPress Multisite ---

module "wordpress_multisite" {
  source = "../modules/vm-base"

  vm_name      = var.vm_name
  image        = "bitnami/wordpress:latest"
  ram          = var.ram
  cpu          = var.cpu
  disk_size    = var.disk_size
  network_name = docker_network.net.name
  mounts       = ["/bitnami/wordpress"]
  ports        = [{ internal = 8080, external = var.http_port }]

  env = [
    "WORDPRESS_DATABASE_HOST=mariadb",
    "WORDPRESS_DATABASE_PORT_NUMBER=3306",
    "WORDPRESS_DATABASE_NAME=wordpress",
    "WORDPRESS_DATABASE_USER=wp_user",
    "WORDPRESS_DATABASE_PASSWORD=${random_password.db_password.result}",
    "WORDPRESS_USERNAME=${var.wp_admin_user}",
    "WORDPRESS_PASSWORD=${random_password.wp_admin_password.result}",
    "WORDPRESS_EMAIL=${var.wp_admin_email}",
    "WORDPRESS_BLOG_NAME=${var.vm_name}",
    "WORDPRESS_MULTISITE_ENABLE=yes",
    "WORDPRESS_MULTISITE_HOST=${var.multisite_host}",
    "WORDPRESS_MULTISITE_NETWORK_TYPE=subdirectory",
  ]

  depends_on = [docker_container.mariadb]
}

# --- SSH sidecar ---

resource "docker_image" "ssh" {
  name         = "linuxserver/openssh-server:latest"
  keep_locally = true
}

resource "docker_container" "ssh" {
  name    = "${var.vm_name}-ssh"
  image   = docker_image.ssh.image_id
  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.net.name
  }

  volumes {
    volume_name    = module.wordpress_multisite.data_volume_name
    container_path = "/config/wordpress"
  }

  ports {
    internal = 2222
    external = var.ssh_port
  }

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
