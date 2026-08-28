#!/bin/sh
act --container-architecture linux/amd64 --secret GITHUB_TOKEN=$(gh auth token) --env GITHUB_TOKEN=$(gh auth token)
