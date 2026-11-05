#!/usr/bin/env bash
# Publica a imagem da Estante: testes, build, tag sha-<commit> + latest; push se REGISTRY estiver definido.
# Uso: deploy/publish.sh [versão]    REGISTRY=ghcr.io/walter-dalla deploy/publish.sh
#      deploy/publish.sh --push-only  (repush das tags já construídas, sem rebuild)
set -euo pipefail
cd "$(dirname "$0")/.."

SHA=$(git rev-parse --short HEAD)
NAME=${REGISTRY:+$REGISTRY/}estante
TAGS=("sha-$SHA" latest)
[[ -n "${1:-}" && "$1" != "--push-only" ]] && TAGS+=("$1")

push() {
  [[ -z "${REGISTRY:-}" ]] && { echo "RESULT: sem REGISTRY, imagem só no daemon local"; return; }
  for t in "${TAGS[@]}"; do docker push "$NAME:$t"; echo "RESULT: pushed $NAME:$t"; done
}

if [[ "${1:-}" == "--push-only" ]]; then push; exit 0; fi

if [[ -n "$(git status --porcelain)" ]]; then echo "ERRO: árvore suja; commite antes"; exit 1; fi
npm test
docker build $(printf -- "-t $NAME:%s " "${TAGS[@]}") .
for t in "${TAGS[@]}"; do echo "RESULT: built $NAME:$t"; done
push
