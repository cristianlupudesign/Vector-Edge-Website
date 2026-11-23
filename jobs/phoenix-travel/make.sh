#!/bin/bash
# Rebuild the Phoenix Travel proof: job.json -> proof HTML (5 picked designs + RISING PHOENIX original).
# SK = the van-quote skill folder (scripts/make_all.py). On the PC point it at your copy of the skill.
set -e
cd "$(dirname "$0")"
SK=${SK:-/root/.claude/skills/synced/02170e20-1569-44b3-93d0-8d074e1f2383_de99b507-56b1-441d-ba23-f28b4813fa44/van-quote}
python3 build_job.py
python3 "$SK/scripts/make_all.py" job.json phoenix-travel-proof.html --pick 2,6,8,9,21 --logo logo-standin.png --knockout
# no email / socials for this customer (don't show made-up ones); honest footer about stand-ins
python3 - <<'PY'
import json
j = json.load(open('phoenix-travel-proof-job.json'))
j['business']['email'] = ''; j['business']['social'] = ''
j['service'] = '6 DESIGNS · CUT VINYL'
j['footer'] = 'Logo and services are stand-ins until we get yours · Reply 1 to 6, or tell us what to change.'
json.dump(j, open('phoenix-travel-proof-job.json', 'w'), indent=2, ensure_ascii=False)
PY
python3 "$SK/scripts/make_proof.py" phoenix-travel-proof-job.json phoenix-travel-proof.html --logo logo-standin.png --knockout
