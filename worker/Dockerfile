# ---- builder ----
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- runtime ----
FROM python:3.12-slim AS runtime
WORKDIR /app

# Fixed numeric UID/GID (not just a named user): Kubernetes' runAsNonRoot
# check can only verify a container runs as non-root by UID number — a
# named user like "appuser" with no explicit UID cannot be verified without
# actually starting the container, which the kubelet refuses to do.
RUN groupadd -g 10001 -r appuser && useradd -u 10001 -r -g appuser appuser

COPY --from=builder /install /usr/local
COPY app ./app

USER 10001:10001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import redis, os; redis.from_url(os.environ.get('REDIS_URL','redis://localhost:6379')).ping()" || exit 1

CMD ["python", "-m", "app.main"]
