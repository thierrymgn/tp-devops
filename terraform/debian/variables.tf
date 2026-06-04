variable "vm_name" {
  description = "Name of the VM"
  type        = string
}

variable "ram" {
  description = "Memory limit in MB"
  type        = number
  default     = 512
}

variable "cpu" {
  description = "Number of vCPUs"
  type        = number
  default     = 1
}

variable "disk_size" {
  description = "Intended data volume size in GB (not enforced by the Docker driver)"
  type        = number
  default     = 5
}

variable "ssh_port" {
  description = "Host port to expose SSH on"
  type        = number
  default     = 2222
}

variable "ssh_user" {
  description = "SSH username"
  type        = string
  default     = "debian"
}
