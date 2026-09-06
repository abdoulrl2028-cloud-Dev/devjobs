#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"

echo "[DevJobs] Porta: $PORT"

if [ ! -d .next ]; then
  echo "[DevJobs] Nenhum build encontrado. Compilando o app..."
  npm run build
fi

if fuser -n tcp "$PORT" >/dev/null 2>&1; then
  echo "[DevJobs] Parando servidor antigo na porta $PORT..."
  fuser -k -n tcp "$PORT" 2>/dev/null || true
  sleep 1
fi

setsid bash -c "exec npx next start -p $PORT >/tmp/devjobs-server.log 2>&1 </dev/null" </dev/null >/dev/null 2>&1 &

for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT"; then
    break
  fi
  sleep 1
done

if curl -s -o /dev/null "http://localhost:$PORT"; then
  echo "[DevJobs] App rodando em http://localhost:$PORT"
  echo "[DevJobs] Log: /tmp/devjobs-server.log"
else
  echo "[DevJobs] Falha ao iniciar. Veja /tmp/devjobs-server.log"
  exit 1
fi