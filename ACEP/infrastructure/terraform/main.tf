terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "me-south-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "acep-cluster"
}

data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

resource "aws_ecr_repository" "acep_services" {
  for_each = toset([
    "api-gateway", "identity-service", "project-engine",
    "cost-engine", "knowledge-service", "llm-service"
  ])
  name                 = "acep/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "acep-redis"
  engine              = "redis"
  node_type           = "cache.t3.medium"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  subnet_group_name   = aws_elasticache_subnet_group.main.name
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "acep-redis-subnet"
  subnet_ids = module.vpc.private_subnets
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "acep-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["me-south-1a", "me-south-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      desired_size = 2
      min_size     = 1
      max_size     = 5

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }

    compute = {
      desired_size = 1
      min_size     = 1
      max_size     = 3

      instance_types = ["c5.large"]
      capacity_type  = "SPOT"
    }
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "acep-postgres"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t3.medium"
  allocated_storage = 100

  db_name  = "acep"
  username = "acep"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  storage_encrypted = true
  deletion_protection = true

  tags = {
    Name        = "acep-postgres"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "acep-db-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "database" {
  name_prefix = "acep-db-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "aws_docdb_cluster" "mongodb" {
  cluster_identifier  = "acep-mongodb"
  engine             = "docdb"
  master_username    = "acep"
  master_password    = random_password.mongo_password.result

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 30
  deletion_protection    = true

  tags = {
    Name        = "acep-mongodb"
    Environment = var.environment
  }
}

resource "random_password" "mongo_password" {
  length  = 24
  special = false
}

resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

output "postgres_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
