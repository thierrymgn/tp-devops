output "vm_ip" {
  value       = [for net in docker_container.app.network_data : net.ip_address if net.network_name == local.network_name][0]
  description = "Container IP address on its Docker network"
}

output "vm_id" {
  value       = docker_container.app.id
  description = "Container ID"
}

output "vm_name" {
  value       = docker_container.app.name
  description = "Container name"
}

output "network_name" {
  value       = local.network_name
  description = "Docker network the container is attached to"
}

output "ports" {
  value       = docker_container.app.ports
  description = "Published port mappings (internal → external)"
}

output "data_volume_name" {
  value       = docker_volume.data.name
  description = "Name of the persistent data volume"
}
