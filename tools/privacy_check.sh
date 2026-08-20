#!/usr/bin/env bash
# eclipse-radiometric-simulation
# Copyright (C) 2026 Ricardo Heredia Alessandrello
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License, version 3, as published
# by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details. You should have received a copy of it along with this program; if
# not, see <https://www.gnu.org/licenses/>.
#
# SPDX-License-Identifier: AGPL-3.0-only
#
# Fails if anything that must not be published has reached the git index, or
# ever reached it. Run before every push:  bash tools/privacy_check.sh
#
# Three of these checks used to be unenforceable against exactly the files most
# likely to carry the thing they look for. `grep -I` skips binary files
# entirely, so a serial number inside a PDF or an .npz passed silently; the
# image test matched a list of extensions, so a renamed photograph passed; and
# nothing looked at history, although a file committed once and deleted next
# stays retrievable from a public repository forever. All three are fixed here.
# The history sweep is what makes this slower than it was; PRIVACY_SKIP_HISTORY=1
# turns it off for a quick local run, never for a push.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { echo "FAIL: $1"; fail=1; }

# What gets checked is the files git is about to push, not the disk.
tracked=$(git ls-files 2>/dev/null) || { echo "not a git repository"; exit 2; }

# -a, not -I: treat binaries as text and search them too.
GREP="grep -a"

# 1) The camera body's serial number.
serial="04407""0005621"   # split so this file does not contain the literal
if echo "$tracked" | xargs -r $GREP -l "$serial" 2>/dev/null | grep -q .; then
  report "the camera serial number is in a tracked file"
fi

# 2) Absolute paths from a home directory, in the three shapes they take.
home_hits=$(echo "$tracked" | xargs -r $GREP -lE '/ho''me/[a-z]|/Us''ers/[A-Za-z]|C:\\Us''ers' 2>/dev/null)
[ -n "$home_hits" ] && report "absolute home paths in: $home_hits"

# 3) The observer's photographs, RAW or video. By MAGIC BYTES, not by
# extension: a renamed .CR2 is still a CR2. The Leaflet marker icons are the
# only images that belong here, so they are exempted by path.
imgs=""
while IFS= read -r f; do
  case "$f" in web/vendor/images/*) continue ;; esac
  [ -f "$f" ] || continue
  magic=$(head -c 12 "$f" | od -An -tx1 | tr -d ' \n')
  case "$magic" in
    ffd8ff*|89504e470d0a1a0a*|49492a00*|4d4d002a*|*66747970*) imgs="$imgs $f" ;;
  esac
done <<< "$tracked"
[ -n "$imgs" ] && report "tracked image or video files:$imgs"

# 4) The large third-party blobs.
if echo "$tracked" | grep -qE 'de440s\.bsp|finals2000A\.all'; then
  report "a third-party kernel is tracked; it should be downloaded, not versioned"
fi

# 5) Email addresses in the content (the commit's own is a different matter).
# example.com/net/org are reserved by RFC 2606 and are valid placeholders.
#
# The top-level domain must be all one case. Now that binaries are searched
# too, a compressed stream throws up things shaped like addresses -- the first
# run turned up `p@5.mJx` inside data/spectra.npz -- and a mixed-case TLD is
# the one thing those have that a real address never does. The file name is
# printed with the hit so the next false positive can be judged rather than
# guessed at.
found=$(echo "$tracked" | xargs -r $GREP -HoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.([a-z]{2,}|[A-Z]{2,})' 2>/dev/null \
        | grep -vE '@example\.(com|net|org)$' | sort -u)
[ -n "$found" ] && report "real email addresses in the index: $(echo $found)"

# 6) The same questions of every blob that has ever existed. A deleted file is
# still in the history of a public repository, so the index alone proves
# nothing about what has been published.
if [ "${PRIVACY_SKIP_HISTORY:-}" != "1" ]; then
  bad_hist=""
  while read -r o _; do
    [ "$(git cat-file -t "$o" 2>/dev/null)" = blob ] || continue
    if git cat-file blob "$o" 2>/dev/null | grep -aq "$serial"; then
      bad_hist="$bad_hist serial:$o"
    fi
    magic=$(git cat-file blob "$o" 2>/dev/null | head -c 12 | od -An -tx1 | tr -d ' \n')
    case "$magic" in
      ffd8ff*|49492a00*|4d4d002a*|*66747970*) bad_hist="$bad_hist image:$o" ;;
    esac
  done < <(git rev-list --objects --all 2>/dev/null)
  [ -n "$bad_hist" ] && report "history carries objects never meant to be public:$bad_hist"
fi

[ $fail -eq 0 ] && echo "OK: nothing that compromises privacy, in the index or in history"
exit $fail
