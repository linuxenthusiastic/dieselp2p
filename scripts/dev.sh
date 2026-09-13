#!/usr/bin/env bash
# Levanta DieselP2P completo: API (4000) y frontend (5173).
#   ./scripts/dev.sh          solo en esta máquina
#   ./scripts/dev.sh --host   accesible desde la red local (celular, otro portátil)
# Ctrl+C detiene ambos procesos.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="${PORT:-4000}"
WEB_PORT=5173
HOST_MODE=0
[[ "${1:-}" == "--host" ]] && HOST_MODE=1

source "$ROOT/scripts/_common.sh"

detener() {
  trap '' INT TERM
  echo
  gris "Deteniendo DieselP2P…"
  # No basta con matar a los hijos directos: npm lanza a su vez tsx y vite,
  # que quedarían huérfanos reteniendo los puertos.
  detener_proyecto >/dev/null
  pkill -P $$ 2>/dev/null
  wait 2>/dev/null
  gris "Detenido."
  exit 0
}
trap detener INT TERM

# Dependencias
if [[ ! -d backend/node_modules || ! -d frontend/node_modules ]]; then
  verde "Instalando dependencias (solo la primera vez)…"
  npm run install:all || { rojo "Falló la instalación"; exit 1; }
fi

verificar_puerto_ajeno "$API_PORT"
verificar_puerto_ajeno "$WEB_PORT"
if [[ -n "$(pid_en_puerto "$API_PORT")" || -n "$(pid_en_puerto "$WEB_PORT")" ]]; then
  gris "  Hay una instancia previa en marcha, deteniéndola…"
  detener_proyecto
fi

verde "Iniciando API…"
npm --prefix backend run dev 2>&1 | sed 's/^/[api] /' &

# Espera a que la API responda antes de abrir el frontend
listo=0
for _ in {1..60}; do
  if curl -sf "http://localhost:$API_PORT/api/health" >/dev/null 2>&1; then listo=1; break; fi
  sleep 0.5
done
if [[ $listo -eq 0 ]]; then
  rojo "La API no respondió en 30 s. Revisa los mensajes [api] de arriba."
  detener
fi

verde "Iniciando frontend…"
if [[ $HOST_MODE -eq 1 ]]; then
  npm --prefix frontend run dev:host 2>&1 | sed 's/^/[web] /' &
else
  npm --prefix frontend run dev 2>&1 | sed 's/^/[web] /' &
fi

sleep 3
IP="$(ip -4 addr show scope global 2>/dev/null | grep -oP 'inet \K[\d.]+' | head -1)"
echo
verde "──────────────────────────────────────────────"
verde " DieselP2P en marcha"
echo  "   App        http://localhost:$WEB_PORT"
echo  "   API        http://localhost:$API_PORT/api/health"
[[ $HOST_MODE -eq 1 && -n "$IP" ]] && echo "   En la red  http://$IP:$WEB_PORT"
[[ $HOST_MODE -eq 0 ]] && gris "   (usa --host para abrirlo desde el celular)"
gris "   Ctrl+C detiene ambos procesos"
verde "──────────────────────────────────────────────"
echo

wait
