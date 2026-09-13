#!/usr/bin/env bash
# Detiene todos los procesos de DieselP2P que hayan quedado sueltos.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/_common.sh"

if detener_proyecto; then
  verde "DieselP2P detenido."
else
  gris "No había procesos de DieselP2P en ejecución."
fi
