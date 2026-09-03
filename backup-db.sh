#!/bin/bash
# Backup do banco Postgres do wpp-central.
# Uso: ./backup-db.sh
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p backups
FILE="backups/wppcentral_$(date +%Y%m%d_%H%M%S).sql"

docker compose exec -T postgres pg_dump -U wpp wppcentral > "$FILE"
echo "Backup salvo em $FILE"

# mantém só os 10 mais recentes
ls -t backups/*.sql 2>/dev/null | tail -n +11 | xargs -r rm --
