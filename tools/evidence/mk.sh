#!/bin/sh
# builds dev.html: the film engines with the evidence renders (open it through ev.py / dump.py)
D=$(cd "$(dirname "$0")" && pwd); Z=$(cd "$D/../.." && pwd)
{ echo '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#111}canvas{display:block}</style></head><body><script>'; cat $D/stubs.js $Z/legend.js $Z/legmodel.js $Z/leggun.js $Z/leggun2.js $Z/legfire.js $Z/leghand.js $Z/leganim.js $Z/legloco.js $Z/legperf.js $Z/legrun.js $Z/physics.js $Z/vfxray.js $Z/mimatic.js $Z/legidle.js $Z/curric.js $Z/leganat.js $Z/legobj.js $Z/legmove.js $Z/legqual.js $Z/cur_legend.js $Z/mimcam.js $Z/mimcine.js $Z/mimdir.js $Z/cur_mimatic.js $Z/vfxlens.js $Z/vfxsim.js $Z/cur_vfxray.js $Z/choreo.js $Z/cur_choreo.js $Z/board.js $Z/cur_board.js $Z/mimshoot.js; cat $D/driver.js $D/evid.js $D/audit13.js; echo '</script></body></html>'; } > $D/dev.html
echo built $D/dev.html
