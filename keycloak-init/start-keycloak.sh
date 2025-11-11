#!/bin/bash

# ===========================================
# KEYCLOAK INFRASTRUCTURE STARTUP SCRIPT
# ===========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker first."
    fi
    log "Docker is running"
}

# Check if ports are available
check_ports() {
    local ports=(8080 5432 5433)
    local port_conflicts=()
    
    for port in "${ports[@]}"; do
        if lsof -i:$port > /dev/null 2>&1; then
            port_conflicts+=($port)
        fi
    done
    
    if [ ${#port_conflicts[@]} -gt 0 ]; then
        warn "The following ports are already in use: ${port_conflicts[*]}"
        warn "Please stop services using these ports or modify docker-compose.yml"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborted due to port conflicts"
        fi
    else
        log "All required ports (8080, 5432, 5433) are available"
    fi
}

# Start Keycloak services
start_keycloak() {
    log "Starting Keycloak infrastructure..."
    
    # Pull latest images
    info "Pulling Docker images..."
    docker-compose pull keycloak keycloak-postgres
    
    # Start services
    info "Starting Keycloak and database services..."
    docker-compose up -d keycloak keycloak-postgres
    
    # Wait for services to be healthy
    info "Waiting for services to start..."
    sleep 30
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Check Keycloak PostgreSQL
    if docker-compose ps keycloak-postgres | grep -q "healthy"; then
        log "Keycloak PostgreSQL is healthy"
    else
        warn "Keycloak PostgreSQL health check pending"
    fi
    
    # Check Keycloak
    if curl -f http://localhost:8080/realms/master > /dev/null 2>&1; then
        log "Keycloak is accessible"
    else
        warn "Keycloak is not yet accessible, waiting..."
        sleep 30
    fi
}

# Create realm
create_realm() {
    log "Creating vendorgrid realm..."
    
    # Get admin token
    local admin_token
    admin_token=$(curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password&client_id=admin-cli&username=admin&password=admin123" | \
        jq -r '.access_token' 2>/dev/null)
    
    if [ -z "$admin_token" ] || [ "$admin_token" = "null" ]; then
        warn "Could not obtain admin token, realm may already exist"
        return 0
    fi
    
    # Create realm
    if curl -X POST http://localhost:8080/admin/realms \
        -H "Authorization: Bearer $admin_token" \
        -H "Content-Type: application/json" \
        -d @keycloak-init/realm-export.json > /dev/null 2>&1; then
        log "Realm created successfully"
    else
        warn "Realm creation failed or realm already exists"
    fi
}

# Generate client secrets
generate_secrets() {
    log "Generating client secrets..."
    
    # Get admin token
    local admin_token
    admin_token=$(curl -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password&client_id=admin-cli&username=admin&password=admin123" | \
        jq -r '.access_token' 2>/dev/null)
    
    if [ -z "$admin_token" ] || [ "$admin_token" = "null" ]; then
        error "Could not obtain admin token for secret generation"
    fi
    
    # Generate secret for vendorgrid-app
    local app_secret
    app_secret=$(curl -X POST http://localhost:8080/admin/realms/vendorgrid/clients/vendorgrid-app/client-secret \
        -H "Authorization: Bearer $admin_token" | \
        jq -r '.value' 2>/dev/null)
    
    # Generate secret for vendorgrid-admin  
    local admin_secret
    admin_secret=$(curl -X POST http://localhost:8080/admin/realms/vendorgrid/clients/vendorgrid-admin/client-secret \
        -H "Authorization: Bearer $admin_token" | \
        jq -r '.value' 2>/dev/null)
    
    # Update .env file
    if [ -n "$app_secret" ] && [ "$app_secret" != "null" ]; then
        sed -i.bak "s/KEYCLOAK_CLIENT_SECRET=REPLACE_WITH_GENERATED_CLIENT_SECRET/KEYCLOAK_CLIENT_SECRET=$app_secret/" .env
        log "Updated KEYCLOAK_CLIENT_SECRET in .env"
    fi
    
    if [ -n "$admin_secret" ] && [ "$admin_secret" != "null" ]; then
        sed -i.bak "s/KEYCLOAK_ADMIN_CLIENT_SECRET=REPLACE_WITH_GENERATED_ADMIN_CLIENT_SECRET/KEYCLOAK_ADMIN_CLIENT_SECRET=$admin_secret/" .env
        log "Updated KEYCLOAK_ADMIN_CLIENT_SECRET in .env"
    fi
    
    # Display secrets
    info "Client secrets generated:"
    echo "  vendorgrid-app: $app_secret"
    echo "  vendorgrid-admin: $admin_secret"
    echo "  (Secrets also updated in .env file)"
}

# Test configuration
test_configuration() {
    log "Testing Keycloak configuration..."
    
    # Test master realm
    if curl -f http://localhost:8080/realms/master > /dev/null 2>&1; then
        log "✅ Master realm is accessible"
    else
        error "❌ Master realm is not accessible"
    fi
    
    # Test vendorgrid realm
    if curl -f http://localhost:8080/realms/vendorgrid > /dev/null 2>&1; then
        log "✅ VendorGrid realm is accessible"
    else
        warn "❌ VendorGrid realm is not accessible"
    fi
    
    # Test admin console
    if curl -f http://localhost:8080/admin > /dev/null 2>&1; then
        log "✅ Admin console is accessible"
    else
        warn "❌ Admin console is not accessible"
    fi
    
    # Test OpenID Connect discovery
    if curl -f http://localhost:8080/realms/vendorgrid/.well-known/openid_configuration > /dev/null 2>&1; then
        log "✅ OIDC discovery endpoint is available"
    else
        warn "❌ OIDC discovery endpoint is not available"
    fi
}

# Display access information
show_access_info() {
    echo
    echo "=========================================="
    echo -e "${GREEN}KEYCLOAK INFRASTRUCTURE IS READY!${NC}"
    echo "=========================================="
    echo
    echo "Keycloak Admin Console:"
    echo "  URL: http://localhost:8080/admin"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo
    echo "VendorGrid Realm:"
    echo "  Realm URL: http://localhost:8080/realms/vendorgrid"
    echo "  Account Console: http://localhost:8080/realms/vendorgrid/account"
    echo
    echo "Environment Variables:"
    echo "  KEYCLOAK_CLIENT_ID=vendorgrid-app"
    echo "  KEYCLOAK_REALM=vendorgrid"
    echo "  KEYCLOAK_AUTH_URL=http://localhost:8080/realms/vendorgrid"
    echo "  KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/vendorgrid/protocol/openid-connect/token"
    echo
    echo "Next Steps:"
    echo "  1. Access admin console and verify realm setup"
    echo "  2. Create test users for Phase 3 integration"
    echo "  3. Review client configuration"
    echo "  4. Update AUTH_PROVIDER=keycloak for Phase 3"
    echo
    echo "For detailed setup instructions, see:"
    echo "  docs/keycloak-setup.md"
    echo
}

# Main execution
main() {
    log "Starting Keycloak Infrastructure Setup"
    log "======================================"
    
    check_docker
    check_ports
    start_keycloak
    check_health
    create_realm
    generate_secrets
    test_configuration
    show_access_info
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "status")
        log "Checking Keycloak status..."
        docker-compose ps keycloak keycloak-postgres
        ;;
    "stop")
        log "Stopping Keycloak services..."
        docker-compose down keycloak keycloak-postgres
        ;;
    "restart")
        log "Restarting Keycloak services..."
        docker-compose restart keycloak keycloak-postgres
        ;;
    "logs")
        log "Showing Keycloak logs..."
        docker-compose logs -f keycloak
        ;;
    "test")
        test_configuration
        ;;
    "secrets")
        generate_secrets
        ;;
    "clean")
        log "Cleaning up Keycloak infrastructure..."
        docker-compose down -v keycloak keycloak-postgres
        docker volume prune -f
        ;;
    *)
        echo "Usage: $0 {start|status|stop|restart|logs|test|secrets|clean}"
        echo
        echo "Commands:"
        echo "  start   - Start Keycloak infrastructure (default)"
        echo "  status  - Check service status"
        echo "  stop    - Stop Keycloak services"
        echo "  restart - Restart Keycloak services"
        echo "  logs    - Show Keycloak logs"
        echo "  test    - Test configuration"
        echo "  secrets - Generate client secrets"
        echo "  clean   - Remove all data and restart"
        exit 1
        ;;
esac