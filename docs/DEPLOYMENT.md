# RMAP Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Provider Guides](#cloud-provider-guides)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Checklist](#security-checklist)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Docker 24.0+ and Docker Compose 2.20+
- Kubernetes 1.28+ (for K8s deployment)
- Terraform 1.5+ (for infrastructure as code)
- Helm 3.12+ (for K8s package management)
- AWS CLI 2.13+ / Azure CLI 2.50+ / gcloud 440.0+

### Required Services
- PostgreSQL 15+
- Redis 7.0+
- S3-compatible object storage
- SMTP service for emails
- Stripe account (for billing)

## Environment Setup

### Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
APP_NAME=RMAP
APP_URL=https://rmap.io
API_URL=https://api.rmap.io

# Database
DATABASE_URL=postgresql://user:password@db.rmap.io:5432/rmap_prod
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50
DATABASE_SSL=true

# Redis
REDIS_URL=redis://redis.rmap.io:6379
REDIS_PASSWORD=secure_redis_password
REDIS_TLS=true

# Authentication
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=30d

# Encryption
ENCRYPTION_KEY=32-byte-encryption-key-for-sensitive-data

# Storage
S3_BUCKET=rmap-assets
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.actual_sendgrid_api_key
EMAIL_FROM=noreply@rmap.io

# Payment
STRIPE_SECRET_KEY=sk_live_actual_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_actual_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_actual_publishable_key

# External APIs
GOOGLE_CLIENT_ID=actual_google_client_id
GOOGLE_CLIENT_SECRET=actual_google_client_secret
META_APP_ID=actual_meta_app_id
META_APP_SECRET=actual_meta_app_secret
LINKEDIN_CLIENT_ID=actual_linkedin_client_id
LINKEDIN_CLIENT_SECRET=actual_linkedin_client_secret

# Monitoring
SENTRY_DSN=https://public@sentry.io/project-id
DATADOG_API_KEY=actual_datadog_api_key
NEW_RELIC_LICENSE_KEY=actual_new_relic_key

# Feature Flags
ENABLE_SSO=true
ENABLE_WEBHOOKS=true
ENABLE_API_V2=true
```

## Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.production.yml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on:
      - frontend
      - api
    networks:
      - rmap-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        NODE_ENV: production
    environment:
      - VITE_API_URL=https://api.rmap.io
      - VITE_STRIPE_PUBLIC_KEY=${STRIPE_PUBLISHABLE_KEY}
    networks:
      - rmap-network

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - rmap-network
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rmap_prod
      POSTGRES_USER: rmap_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - rmap-network
    deploy:
      placement:
        constraints:
          - node.role == manager

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - rmap-network

  worker:
    build:
      context: ./server
      dockerfile: Dockerfile.worker
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - rmap-network
    deploy:
      replicas: 2

volumes:
  postgres_data:
  redis_data:

networks:
  rmap-network:
    driver: overlay
    attachable: true
```

### Dockerfile - Frontend

```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Dockerfile - Backend

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d

# Scale API service
docker-compose -f docker-compose.production.yml up -d --scale api=5

# View logs
docker-compose -f docker-compose.production.yml logs -f api

# Stop services
docker-compose -f docker-compose.production.yml down
```

## Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rmap-production
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rmap-config
  namespace: rmap-production
data:
  APP_NAME: "RMAP"
  NODE_ENV: "production"
  API_URL: "https://api.rmap.io"
  LOG_LEVEL: "info"
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rmap-secrets
  namespace: rmap-production
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/rmap"
  JWT_SECRET: "your-jwt-secret"
  STRIPE_SECRET_KEY: "sk_live_..."
```

```yaml
# k8s/deployment-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rmap-api
  namespace: rmap-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rmap-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: rmap-api
    spec:
      containers:
      - name: api
        image: rmap/api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: rmap-config
        - secretRef:
            name: rmap-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rmap-api
  namespace: rmap-production
spec:
  selector:
    app: rmap-api
  ports:
  - port: 80
    targetPort: 4000
  type: ClusterIP
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rmap-ingress
  namespace: rmap-production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.rmap.io
    - app.rmap.io
    secretName: rmap-tls
  rules:
  - host: api.rmap.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rmap-api
            port:
              number: 80
  - host: app.rmap.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rmap-frontend
            port:
              number: 80
```

### Helm Deployment

```yaml
# helm/values.yaml
global:
  environment: production
  domain: rmap.io

api:
  replicaCount: 3
  image:
    repository: rmap/api
    tag: latest
    pullPolicy: Always
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

frontend:
  replicaCount: 2
  image:
    repository: rmap/frontend
    tag: latest

postgres:
  enabled: true
  auth:
    database: rmap
    username: rmap_user
  persistence:
    size: 100Gi
    storageClass: fast-ssd
  metrics:
    enabled: true

redis:
  enabled: true
  auth:
    enabled: true
  persistence:
    size: 10Gi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.rmap.io
      paths:
        - path: /
    - host: app.rmap.io
      paths:
        - path: /
  tls:
    - secretName: rmap-tls
      hosts:
        - api.rmap.io
        - app.rmap.io
```

Deploy with Helm:

```bash
# Install Helm chart
helm install rmap ./helm -n rmap-production --create-namespace

# Upgrade deployment
helm upgrade rmap ./helm -n rmap-production

# Rollback if needed
helm rollback rmap -n rmap-production
```

## Cloud Provider Guides

### AWS Deployment

#### Infrastructure with Terraform

```hcl
# terraform/aws/main.tf
provider "aws" {
  region = var.region
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "rmap-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "rmap-cluster"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3
      
      instance_types = ["t3.medium"]
      
      k8s_labels = {
        Environment = "production"
        Application = "rmap"
      }
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "rmap-postgres"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.large"
  
  allocated_storage     = 100
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name  = "rmap"
  username = "rmap_admin"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.postgres.id]
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "rmap-redis"
  replication_group_description = "RMAP Redis cluster"
  
  engine               = "redis"
  node_type           = "cache.t3.medium"
  number_cache_clusters = 2
  port                = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
}

# S3 Buckets
resource "aws_s3_bucket" "assets" {
  bucket = "rmap-assets"
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-assets"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.assets.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

Deploy to AWS:

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=production.tfvars

# Apply configuration
terraform apply -var-file=production.tfvars

# Get EKS credentials
aws eks update-kubeconfig --name rmap-cluster --region us-east-1

# Deploy application to EKS
kubectl apply -f k8s/
```

### Azure Deployment

```bash
# Create resource group
az group create --name rmap-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group rmap-rg \
  --name rmap-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group rmap-rg --name rmap-cluster

# Create Azure Database for PostgreSQL
az postgres server create \
  --resource-group rmap-rg \
  --name rmap-postgres \
  --sku-name GP_Gen5_2 \
  --admin-user rmapadmin \
  --admin-password SecurePassword123! \
  --version 15

# Create Redis Cache
az redis create \
  --resource-group rmap-rg \
  --name rmap-redis \
  --sku Premium \
  --vm-size P1
```

### Google Cloud Deployment

```bash
# Set project
gcloud config set project rmap-production

# Create GKE cluster
gcloud container clusters create rmap-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials rmap-cluster --zone us-central1-a

# Create Cloud SQL instance
gcloud sql instances create rmap-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=us-central1

# Create Memorystore Redis
gcloud redis instances create rmap-redis \
  --size=5 \
  --region=us-central1 \
  --redis-version=redis_7_0
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd server && npm ci
      
      - name: Run tests
        run: |
          npm test
          cd server && npm test
      
      - name: Run security audit
        run: |
          npm audit --audit-level=high
          cd server && npm audit --audit-level=high

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}
      
      - name: Build and push Frontend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.frontend
          push: true
          tags: |
            rmap/frontend:latest
            rmap/frontend:${{ github.sha }}
          cache-from: type=registry,ref=rmap/frontend:buildcache
          cache-to: type=registry,ref=rmap/frontend:buildcache,mode=max
      
      - name: Build and push API
        uses: docker/build-push-action@v4
        with:
          context: ./server
          push: true
          tags: |
            rmap/api:latest
            rmap/api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name rmap-cluster --region us-east-1
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/rmap-api api=rmap/api:${{ github.sha }} -n rmap-production
          kubectl set image deployment/rmap-frontend frontend=rmap/frontend:${{ github.sha }} -n rmap-production
          kubectl rollout status deployment/rmap-api -n rmap-production
          kubectl rollout status deployment/rmap-frontend -n rmap-production
      
      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh https://api.rmap.io

  notify:
    needs: deploy
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy
  - notify

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test
    - npm run lint
    - npm audit --audit-level=high
  artifacts:
    reports:
      junit: test-results.xml
      coverage: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -f Dockerfile.frontend .
    - docker build -t $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA -f server/Dockerfile ./server
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context production
    - kubectl set image deployment/rmap-api api=$CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA -n rmap-production
    - kubectl set image deployment/rmap-frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -n rmap-production
    - kubectl rollout status deployment/rmap-api -n rmap-production
    - kubectl rollout status deployment/rmap-frontend -n rmap-production
  only:
    - main
```

## Monitoring & Logging

### Prometheus Configuration

```yaml
# prometheus/values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    additionalScrapeConfigs:
      - job_name: 'rmap-api'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - rmap-production
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: rmap-api
            action: keep
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "RMAP Production Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket{job=\"rmap-api\"})"
          }
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"rmap-api\"}[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"rmap-api\",status=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

### ELK Stack Setup

```yaml
# elasticsearch/values.yaml
elasticsearch:
  replicas: 3
  resources:
    requests:
      memory: "2Gi"
      cpu: "1000m"
  volumeClaimTemplate:
    resources:
      requests:
        storage: 100Gi

logstash:
  pipelines:
    - pipeline.id: rmap-logs
      config.string: |
        input {
          beats {
            port => 5044
          }
        }
        filter {
          json {
            source => "message"
          }
          mutate {
            add_field => { "tenant" => "%{[tenantId]}" }
          }
        }
        output {
          elasticsearch {
            hosts => ["elasticsearch:9200"]
            index => "rmap-logs-%{+YYYY.MM.dd}"
          }
        }

kibana:
  elasticsearchHosts: "http://elasticsearch:9200"
```

## Security Checklist

### Pre-Deployment

- [ ] All secrets stored in secure vault (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] SSL/TLS certificates configured and valid
- [ ] Database connections use SSL
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers implemented (CSP, HSTS, etc.)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CSRF tokens configured

### Network Security

- [ ] Private subnets for databases
- [ ] Security groups properly configured
- [ ] Network policies in Kubernetes
- [ ] WAF rules configured
- [ ] DDoS protection enabled

### Access Control

- [ ] MFA enabled for all admin accounts
- [ ] Role-based access control (RBAC) configured
- [ ] Service accounts with minimal permissions
- [ ] API keys rotated regularly
- [ ] Audit logging enabled

### Data Protection

- [ ] Encryption at rest enabled
- [ ] Encryption in transit enforced
- [ ] Backup encryption configured
- [ ] PII data masked in logs
- [ ] GDPR compliance verified

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql $DATABASE_URL

# Check credentials
kubectl get secret rmap-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Check network policies
kubectl get networkpolicies -n rmap-production
```

#### High Memory Usage

```bash
# Check pod memory usage
kubectl top pods -n rmap-production

# Check for memory leaks
kubectl logs <pod-name> -n rmap-production | grep "JavaScript heap out of memory"

# Increase memory limits
kubectl set resources deployment rmap-api -c api --limits=memory=1Gi -n rmap-production
```

#### Slow API Response

```bash
# Check API metrics
curl https://api.rmap.io/metrics

# Database slow queries
kubectl exec -it postgres-0 -- psql -U rmap -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Redis latency
kubectl exec -it redis-0 -- redis-cli --latency
```

### Rollback Procedure

```bash
# Kubernetes rollback
kubectl rollout undo deployment/rmap-api -n rmap-production
kubectl rollout undo deployment/rmap-frontend -n rmap-production

# Helm rollback
helm rollback rmap -n rmap-production

# Database rollback (if migrations failed)
kubectl exec -it postgres-0 -- psql -U rmap -f /backup/rollback.sql
```

### Emergency Procedures

#### Complete System Failure

1. Switch to disaster recovery site
2. Restore from latest backup
3. Verify data integrity
4. Test critical functions
5. Notify customers

#### Data Breach

1. Isolate affected systems
2. Preserve evidence
3. Reset all credentials
4. Audit access logs
5. Notify security team and legal

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_events_timestamp ON events(created_at DESC);

-- Vacuum and analyze
VACUUM ANALYZE;

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
```

### Application Optimization

```javascript
// Enable clustering
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numWorkers = os.cpus().length;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
} else {
  startServer();
}
```

### CDN Configuration

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Compress responses
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## Maintenance

### Regular Tasks

- **Daily**: Check error logs, monitor alerts
- **Weekly**: Review performance metrics, security updates
- **Monthly**: Backup verification, certificate renewal check
- **Quarterly**: Disaster recovery drill, dependency updates

### Backup Schedule

```bash
# Automated backup script
#!/bin/bash

# Database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://rmap-backups/postgres/

# Redis backup
redis-cli --rdb /tmp/redis-backup.rdb
aws s3 cp /tmp/redis-backup.rdb s3://rmap-backups/redis/backup_$(date +%Y%m%d).rdb

# Application state
kubectl get all -n rmap-production -o yaml > k8s-state-$(date +%Y%m%d).yaml
aws s3 cp k8s-state-$(date +%Y%m%d).yaml s3://rmap-backups/k8s/
```

## Support

For deployment assistance:
- Documentation: https://docs.rmap.io/deployment
- DevOps Support: devops@rmap.io
- Emergency Hotline: +1-555-RMAP-911

---

Last Updated: 2025-08-28
Version: 1.0.0