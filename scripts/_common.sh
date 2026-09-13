#!/usr/bin/env bash
# Funciones compartidas por dev.sh y stop.sh.
# ROOT debe estar definido por quien haga el source.

verde() { printf '\033[32m%s\033[0m\n' "$1"; }
rojo()  { printf '\033[31m%s\033[0m\n' "$1"; }
gris()  { printf '\033[90m%s\033[0m\n' "$1"; }

# PID que escucha en un puerto (vacío si está libre).
pid_en_puerto() {
  ss -tlnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1
}

cmdline_de() { tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null; }

# ¿El proceso pertenece a este proyecto?
es_del_proyecto() {
  local cmd; cmd="$(cmdline_de "$1")" || return 1
  [[ "$cmd" == *"$ROOT"* ]]
}

# Cadena de ancestros del proceso actual: nunca deben morir.
_ancestros() {
  local p=$$
  while [[ -n "$p" && "$p" != "1" ]]; do
    echo "$p"
    p="$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ')"
  done
}

# Detiene TODO el árbol de procesos del proyecto (servidores y sus vigilantes).
# Mata primero con TERM, y fuerza con KILL lo que siga vivo.
detener_proyecto() {
  local protegidos pids pid restantes
  protegidos=" $(_ancestros | tr '\n' ' ') "
  pids=()
  for pid in $(pgrep -f "node|npm|tsx|vite" 2>/dev/null); do
    [[ "$protegidos" == *" $pid "* ]] && continue
    es_del_proyecto "$pid" && pids+=("$pid")
  done
  [[ ${#pids[@]} -eq 0 ]] && return 1

  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null; done
  for _ in {1..24}; do
    restantes=0
    for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null && restantes=1; done
    [[ $restantes -eq 0 ]] && return 0
    sleep 0.25
  done
  for pid in "${pids[@]}"; do kill -9 "$pid" 2>/dev/null; done
  sleep 0.5
  return 0
}

# Aborta si un programa ajeno al proyecto ocupa el puerto.
verificar_puerto_ajeno() {
  local puerto=$1 pid; pid="$(pid_en_puerto "$puerto")"
  [[ -z "$pid" ]] && return 0
  es_del_proyecto "$pid" && return 0
  rojo "  El puerto $puerto lo usa otro programa (pid $pid: $(ps -o comm= -p "$pid" 2>/dev/null))."
  rojo "  Ciérralo y vuelve a intentarlo."
  exit 1
}
