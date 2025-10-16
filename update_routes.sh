#!/bin/bash
# -------------------------------------------------------------
# CARL System DÁP Integráció - Frissítő script
# -------------------------------------------------------------
# Ez a script felülírja a meglévő carl_backend_routes.ts fájlt
# az új DÁP-integrációs verzióval, biztonsági mentést készít,
# majd automatikusan commitolja a változást.
#
# Használat:
#   chmod +x update_routes.sh
#   ./update_routes.sh
# -------------------------------------------------------------

set -e

PROJECT_ROOT="$(pwd)"
SRC_NEW="src/dap_integration/carl_backend_routes.ts"
SRC_OLD="src/carl_backend_routes.ts"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

echo ">>> CARL System DÁP Integrációs Frissítés indul..."

# Ellenőrzés, hogy a script a projekt gyökeréből fut-e
if [ ! -f "$SRC_NEW" ]; then
  echo "HIBA: Az új DÁP verzió nem található itt: $SRC_NEW"
  echo "Futtasd a scriptet a projekt gyökeréből, ahol a 'src/' mappa van."
  exit 1
fi

# Biztonsági mentés
echo ">>> Biztonsági mentés készítése a régi fájlról..."
mkdir -p "$BACKUP_DIR"
if [ -f "$SRC_OLD" ]; then
  cp "$SRC_OLD" "$BACKUP_DIR/carl_backend_routes.ts.bak"
  echo "Mentés elkészült: $BACKUP_DIR/carl_backend_routes.ts.bak"
else
  echo "Figyelem: Nem találtam meglévő carl_backend_routes.ts fájlt."
fi

# Frissítés
echo ">>> Új DÁP-verzió másolása..."
cp "$SRC_NEW" "$SRC_OLD"

# Git műveletek
if [ -d ".git" ]; then
  echo ">>> Git staging és commit..."
  git add "$SRC_OLD"
  if [ -f "commit_message.txt" ]; then
    git commit -F commit_message.txt || true
  else
    git commit -m "Frissítés: carl_backend_routes.ts (DÁP integráció)" || true
  fi
  echo ">>> Változások commitolva."
else
  echo "Figyelem: Git repo nem található, commit kihagyva."
fi

echo ">>> Frissítés sikeresen befejezve."
echo ">>> Új carl_backend_routes.ts aktív a DÁP integrációval."
