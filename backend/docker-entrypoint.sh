#!/bin/sh
set -eu

export DATABASE_URL="$(
    python -c '
import os
from sqlalchemy.engine import make_url

url = make_url(os.environ["DATABASE_URL"])
if url.host in {"localhost", "127.0.0.1"}:
    url = url.set(host="host.docker.internal")
print(url.render_as_string(hide_password=False))
'
)"

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
