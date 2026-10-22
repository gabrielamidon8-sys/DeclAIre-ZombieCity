/* ================= LEGEND fire (1.9.997): how each gun works and kicks when it is fired =================
   The guns' moving parts are bones (legend.js: slide, hammer, cyl on a handgun; cbolt, ccharge, cpump on a long gun) and
   each gun says how far its own parts travel (leggun.js, LG_GUN_DEF[key].act). This file is the timing and the force:
   - The action's cycle: the slide or the bolt runs back in a third of the cycle and comes forward on its spring in the
     rest (a 1911's slide is at the rear in 9–13 ms and back in battery at 45–59 ms on a 1,000 fps camera; an M4's
     carrier cycles in ≈ 75 ms at 800 rounds a minute). A hammer gun's slide cocks the hammer on its way back; a
     double-action pull (the M9's first shot, every shot of the revolver) raises the hammer and turns the cylinder a
     chamber before the shot, and the hammer falls as it breaks.
   - The recoil: its shape is a near-instant rise (the peak 25 ms after the shot, while the action is moving) and an
     under-damped return with one small overshoot, settled by the gun's recovery time; its size is the round's
     impulse into the gun (the gun's mass by its free-recoil velocity: a 9 mm pistol ≈ 3.7 N·s, a .45 ≈ 4.7, an M4
     ≈ 7, a 7.62 battle rifle ≈ 13.5, 12 gauge ≈ 14). A long gun drives straight back into the shoulder pocket and the
     muzzle rises because the bore sits above it (2° for 5.56, 4–5° for 7.62, 8° for 12 gauge); a pistol flips in the
     wrists first (7–10°) and the elbows give; the body soaks the rest up: the chest pitches and the right shoulder
     goes back and up, the head rides with it.
   Sources: Shooting Times 1,000 fps 1911 cycle; Wikipedia free-recoil tables; Lucky Gunner high-speed muzzle
   rotation; the slice's research notes (SP/research14_guns.md, part C). */
const LGF = { on: true };
// the recoil's shape at d seconds after a shot (0..1, a little under 0 on the overshoot)
function lgfRec(d, rec) {
  if (d < 0) return 0; const tp = 0.025;
  if (d < tp) { const u = d / tp; return u * (2 - u); }
  const x = (d - tp) / Math.max(0.08, rec || 0.2); if (x > 1.7) return 0;
  return Math.exp(-x * 3.2) * Math.cos(x * 4.2);
}
// the action's stroke at d seconds after a shot (0..1): back fast, a dwell, forward on the spring
function lgfStroke(d, cyc) {
  if (d < 0 || d >= cyc) return 0; const tb = cyc * 0.33;
  if (d < tb) return Math.sin(d / tb * Math.PI / 2);
  const u = (d - tb) / (cyc - tb); return 1 - u * u * (3 - 2 * u);
}
const LGF_DEF = { p: { slide: 0.032, cyc: 0.05, imp: 3.7, rise: 7.5, rec: 0.2 }, c: { bolt: 0.1, cyc: 0.08, imp: 7, rise: 2, rec: 0.15 } };
function lgfAct(key, fam) { const D = typeof LG_GUN_DEF !== 'undefined' ? LG_GUN_DEF[key] : null; return D && D.act ? D.act : LGF_DEF[fam || (D ? D.fam : 'p')] || LGF_DEF.p; }
/* the pose's response to shots: the action cycling, the gun driven back along the bore and the muzzle up, the body
   soaking it up. P: the pose; v: the gun's posture in the chest's space [x, y, z, yaw, pitch, cant] (changed in place);
   key: the gun (or null for the generic one of its family); shots: their times; t: now; o.fam: 'p' or 'c' when there
   is no key; o.hold: the slide or bolt locked back (empty); o.body: how much the body gives (1); o.da: the first shot
   is a double-action pull (the hammer rises before it breaks). Returns the recoil. */
function lgfShots(P, v, key, shots, t, o) {
  o = o || {}; const D = typeof LG_GUN_DEF !== 'undefined' && key ? LG_GUN_DEF[key] : null, fam = D ? D.fam : (o.fam || 'p'), A = lgfAct(key, fam);
  const cyc = A.cyc || (fam === 'p' ? 0.05 : 0.08), imp = A.imp || 4, rise = (A.rise || 5) * Math.PI / 180, body = o.body == null ? 1 : o.body;
  let r = 0, sk = 0, dLast = Infinity, next = Infinity;
  for (const s of shots) { const d = t - s; if (d >= 0) { r += lgfRec(d, A.rec); const st = lgfStroke(d, cyc); if (st > sk) sk = st; if (d < dLast) dLast = d; } else if (-d < next) next = -d; }
  // the gun in the hands: back along the bore (a shouldered gun presses into the shoulder pocket, a pistol comes back
  // through the elbows), the muzzle up, a touch of drift to the right for a right-handed shooter
  const back = fam === 'c' ? imp * 0.0022 : imp * 0.004;
  if (v) { v[0] -= r * back; v[2] += r * back * (fam === 'c' ? 0.15 : 0.5); v[4] -= r * rise; v[3] -= r * rise * (fam === 'c' ? 0.12 : 0.08); }
  // the parts
  if (fam === 'p') {
    if (A.slide != null && !A.cyl) P.pistol.slide = o.hold ? 1 : sk;
    if (A.hammer) {
      // a hammer gun: cocked by the slide on its way back, so it stays cocked after a shot; a double-action pull before
      // the shot raises it (and turns a revolver's cylinder one chamber); it falls as the shot breaks
      const da = A.da && (A.cyl || (o.da && dLast === Infinity));   // (a pistol's double-action first shot only when the clip asks: in a fight it is cocked)
      let hm = da ? 0 : (A.hrest == null ? 1 : A.hrest);
      if (dLast < Infinity) hm = A.cyl ? (dLast < 0.008 ? 1 - dLast / 0.008 : 0) : (dLast < cyc * 0.12 ? 0 : Math.min(1, (dLast - cyc * 0.12) / (cyc * 0.2)));
      if (da && next < A.da) { const u = 1 - next / A.da; hm = Math.max(hm, u * u); if (A.cyl) { const w = Math.min(1, u / 0.75); P.pistol.cyl = (P.pistol.cyl || 0) + w * w * (3 - 2 * w) * (Math.PI * 2 / (A.chambers || 6)); } }
      P.pistol.hammer = hm;
    }
  } else {
    P.carbine.bolt = o.hold ? 1 : sk;
  }
  // the body: the chest pitches back and twists (the right shoulder goes back and up), the spine under it a little, the
  // head rides the shoulders; a long gun puts it all into the shoulder, a pistol's arms take most of it first
  const k = r * body * imp * (fam === 'c' ? 1 : 0.45);
  lgJadd(P, 'chest', 0, -k * 0.0035, -k * 0.0035); lgJadd(P, 'spine', 0, -k * 0.0015, -k * 0.001);
  lgJadd(P, 'clavR', -k * 0.004, 0, k * 0.006); lgJadd(P, 'neck', 0, k * 0.002, 0); lgJadd(P, 'head', 0, -k * 0.0035, 0);
  return r;
}
// the clips' events: the shots in a clip (so a cinematic's shots read the same table)
function lgfShotTimes(ev, name) { const out = []; for (const e of ev || []) if (e[1] === (name || 'shot') || e[1] === 'rshot') out.push(e[0]); return out; }
