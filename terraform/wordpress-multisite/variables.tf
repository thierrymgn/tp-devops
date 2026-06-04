variable "vm_name" {
  description = "Name of the VM (used as container name prefix)"
  type        = string
}

variable "ram" {
  description = "Memory limit in MB"
  type        = number
  default     = 1024
}

variable "cpu" {
  description = "Number of vCPUs"
  type        = number
  default     = 2
}

variable "disk_size" {
  description = "Intended data volume size in GB (not enforced by the Docker driver)"
  type        = number
  default     = 10
}

variable "http_port" {
  description = "Host port to expose WordPress Multisite on"
  type        = number
  default     = 8081
}

variable "wp_admin_user" {
  description = "WordPress admin username"
  type        = string
  default     = "admin"
}

variable "wp_admin_email" {
  description = "WordPress admin email"
  type        = string
  default     = "admin@example.com"
}

variable "multisite_host" {
  description = "Hostname used for the WordPress Multisite network (e.g. mysite.local)"
  type        = string
  default     = "localhost"
}

variable "ssh_port" {
  description = "Host port for SSH access to the VM"
  type        = number
  default     = 2222
}

variable "ssh_user" {
  description = "SSH username"
  type        = string
  default     = "debian"
}
