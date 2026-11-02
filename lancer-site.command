#!/bin/zsh
set -e
cd "$(dirname "$0")"
PUZZLES_NODE=""
if command -v node >/dev/null 2>&1; then
  PUZZLES_CANDIDATE="$(command -v node)"
  if "$PUZZLES_CANDIDATE" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
    PUZZLES_NODE="$PUZZLES_CANDIDATE"
  fi
fi
if [ -z "$PUZZLES_NODE" ] && [ -x "/Users/amandinehourewitz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  PUZZLES_NODE="/Users/amandinehourewitz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ -z "$PUZZLES_NODE" ]; then
  print "Installez Node.js 22.13 ou plus récent depuis nodejs.org, puis relancez ce fichier."
  read "?Appuyez sur Entrée pour fermer."
  exit 1
fi
export PATH="$(dirname "$PUZZLES_NODE"):$PATH"
"$PUZZLES_NODE" scripts/start-local.mjs "$@"
