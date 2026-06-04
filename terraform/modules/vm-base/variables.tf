variable "vm_name" {
  description = "Container name"
  type        = string
}

variable "image" {
  description = "Docker image (e.g. 'bitnami/wordpress:latest')"
  type        = string
}

variable "ram" {
  description = "Memory limit in MB"
  type        = number
  default     = 512
}

variable "cpu" {
  description = "Number of vCPUs (translated to Docker cpu_shares: cpu * 1024)"
  type        = number
  default     = 1
}

variable "disk_size" {
  # Docker volumes do not enforce size limits natively — value is stored
  # in state for informational/planning use only.
  description = "Intended data volume size in GB (not enforced by the Docker driver)"
  type        = number
  default     = 5
}

variable "env" {
  description = "Environment variables to inject into the container"
  type        = list(string)
  default     = []
}

variable "ports" {
  description = "Port mappings. Set external = 0 to let Docker assign a random host port."
  type = list(object({
    internal = number
    external = number
  }))
  default = []
}

variable "mounts" {
  description = "Container paths where the data volume is mounted"
  type        = list(string)
  default     = []
}

variable "network_name" {
  description = "Existing Docker network to attach to. Leave empty to create a dedicated network."
  type        = string
  default     = ""
}

variable "network_aliases" {
  description = "DNS aliases for this container on the network"
  type        = list(string)
  default     = []
}
