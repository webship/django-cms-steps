# Python for the django CMS site. A stale third-party repository key in the
# base image must not stop the build, so the index refresh may fail softly.
RUN (apt-get update || true) \
    && apt-get install -y --no-install-recommends python3-venv python3-pip python3-dev build-essential \
    && rm -rf /var/lib/apt/lists/*
