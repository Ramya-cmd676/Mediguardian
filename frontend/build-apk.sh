#!/bin/sh
cd /app
export EAS_NO_VCS=1
export EAS_PROJECT_ROOT=/app
eas build --platform android --profile preview --non-interactive
