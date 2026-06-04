output "vm_ip" {
  value       = module.debian.vm_ip
  description = "Container IP on its Docker network"
}

output "vm_name" {
  value       = module.debian.vm_name
  description = "Container name"
}

output "vm_id" {
  value       = module.debian.vm_id
  description = "Container ID"
}

output "ssh_port" {
  value       = var.ssh_port
  description = "Host port for SSH access (ssh <ssh_user>@<host> -p <ssh_port>)"
}

output "ssh_user" {
  value       = var.ssh_user
  description = "SSH username"
}

output "ssh_password" {
  value       = random_password.ssh_password.result
  sensitive   = true
  description = "SSH password — send to ESP-32"
}
