output "vm_ip" {
  value       = module.wordpress_multisite.vm_ip
  description = "Container IP on its Docker network"
}

output "vm_name" {
  value       = module.wordpress_multisite.vm_name
  description = "Container name"
}

output "vm_id" {
  value       = module.wordpress_multisite.vm_id
  description = "Container ID"
}

output "http_port" {
  value       = var.http_port
  description = "Host port where WordPress Multisite is reachable"
}

output "wp_admin_user" {
  value       = var.wp_admin_user
  description = "WordPress admin username"
}

output "wp_admin_password" {
  value       = random_password.wp_admin_password.result
  sensitive   = true
  description = "WordPress admin password — send to ESP-32"
}

output "ssh_port" {
  value       = var.ssh_port
  description = "Host port for SSH access"
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
