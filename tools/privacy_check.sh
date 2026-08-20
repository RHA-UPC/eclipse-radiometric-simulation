#!/usr/bin/env bash
# eclipse-radiometric-simulation
# Copyright (C) 2026 Ricardo Heredia Alessandrello
# SPDX-License-Identifier: AGPL-3.0-only
#
# Fails if anything that must not be published has reached the git index.
# Run before every push:  bash tools/privacy_check.sh
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { echo "FAIL: $1"; fail=1; }

# What gets checked is the files git is about to push, not the disk.
tracked=$(git ls-files 2>/dev/null) || { echo "not a git repository"; exit 2; }

# 1) The camera body's serial number.
serial="04407""0005621"   # split so this file does not contain the literal
if echo "$tracked" | xargs -r grep -lI "$serial" 2>/dev/null | grep -q .; then
  report "the camera serial number is in a tracked file"
fi

# 2) Absolute paths from the author's machine.
home="/ho""me/"
hits=$(echo "$tracked" | xargs -r grep -lI "$home" 2>/dev/null)
[ -n "$hits" ] && report "absolute /home paths in: $hits"

# 3) The observer's photographs, RAW or video. Video counts twice over: camera
# metadata like the photographs, plus an audio track with voices on it.
if echo "$tracked" | grep -qiE '\.(cr2|nef|arw|jpe?g|mp4|mov|avi|mkv)$|^fotografias/'; then
  report "images or video are tracked; they carry camera body metadata"
fi

# 4) The large third-party blobs.
if echo "$tracked" | grep -qE 'de440s\.bsp|finals2000A\.all'; then
  report "a third-party kernel is tracked; it should be downloaded, not versioned"
fi

# 5) Email addresses in the content (the commit's own is a different matter).
# example.com/net/org are reserved by RFC 2606 and are valid placeholders.
found=$(echo "$tracked" | xargs -r grep -hoIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' 2>/dev/null \
        | grep -vE '@example\.(com|net|org)$' | sort -u)
[ -n "$found" ] && report "real email addresses in the index: $(echo $found)"

[ $fail -eq 0 ] && echo "OK: nothing that compromises privacy in the index"
exit $fail
