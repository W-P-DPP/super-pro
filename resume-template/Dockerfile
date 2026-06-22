# syntax=docker/dockerfile:1.7

# Frontend projects are built into the generated nginx gateway image.
# This project-level Dockerfile is deployment metadata for auto-discovery.
FROM scratch

LABEL super-pro.deploy="true" \
      super-pro.service="resume-template" \
      super-pro.kind="frontend" \
      super-pro.port="80" \
      super-pro.routes="/resume/"
