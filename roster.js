/* ================= the 2.0 roster: the first 50 regular zombies =================
   Zombie City 2.0 rebuilds its zombies from the ground up. This file holds the first 50 regulars: who each one was,
   how it looks (body, clothes, hair, headgear, what it carries, what the infection did to it), how it moves (gait, arms,
   head), what it does besides soaking up bullets (its behaviour and passives) and how it takes a bullet (helmets, armour,
   shields, a body too low or too brittle to hit cleanly). The rig and animation engine (anima.js) draws and animates
   them; the 1,000 old mutations and the bosses are switched off until the rebuild reaches them.
   Fields: t threat 1-10 (sets the wave it can first appear in and its rarity) · blood: the blood engine's strain
   (also what glows) · body: build · hp/spd/dmg/size: against an ordinary zombie · gait, arms, look: how it moves ·
   ab: behaviour · p: passives (as the old strains had them) · T: how bullets treat it · line: its entry in the log. */
const ZR_DEFS = [
  // ---- threat 1: the first wave of the dead, people from an ordinary day
  { key: 'office', name: 'Office Drone', t: 1, blood: 'shambling', body: 'avg', hp: 1, spd: 0.92, dmg: 1, size: 1, skin: '#8e9a85', cloth: '#d8d4c8', cloth2: '#2b2e36', acc: '#7d1f2a', hair: 'balding', hairCol: '#3a3029', eye: '#e9e2b0', top: 'shirt', tie: 1, bottom: 'slacks', head: 'bare', feat: ['tears', 'bite', 'badge'], shoe: 'dress', det: ['buttons', 'lanyard', 'pocket', 'rolled', 'mottled', 'earbitten'], gait: 'shamble', arms: 'reach', look: 'loll', ab: 'none', p: {}, T: {}, line: 'Still wearing the lanyard. Still on its way to the meeting.' },
  { key: 'jogger', name: 'Night Jogger', t: 1, blood: 'shambling', body: 'thin', hp: 0.7, spd: 1.45, dmg: 0.85, size: 0.95, skin: '#9a8b7e', cloth: '#e8554a', cloth2: '#22252b', acc: '#f2f2f2', hair: 'ponytail', hairCol: '#2a1d16', eye: '#ffd9a0', top: 'tank', bottom: 'shorts', head: 'headband', feat: ['earbuds'], shoe: 'sneaker', det: ['wristband', 'socks', 'logo', 'scalpwound', 'mottled'], gait: 'sprint', arms: 'pump', look: 'fwd', ab: 'sprinter', abP: { burst: 1.9, on: 1.4, off: 2.2 }, p: {}, T: {}, line: 'It never stopped running. Now it runs at you, in bursts, until it drops.' },
  { key: 'mail', name: 'Mail Carrier', t: 1, blood: 'shambling', body: 'avg', hp: 1, spd: 1, dmg: 0.9, size: 1, skin: '#8a7f73', cloth: '#7d90a3', cloth2: '#2a3a52', acc: '#1d3557', hair: 'short', hairCol: '#2c241e', eye: '#e8dfa8', top: 'uniform', bottom: 'shorts', head: 'cap', capCol: '#2a3a52', hold: 'bag', holdCol: '#6b4f2e', feat: ['stripe'], shoe: 'boot', det: ['pocket', 'patch', 'socks', 'nametag', 'cracks'], gait: 'march', arms: 'dangle', look: 'scan', ab: 'relentless', p: {}, T: {}, line: 'Neither rain nor snow nor death. It never loses your trail and closes in faster the further you run.' },
  { key: 'retiree', name: 'Retiree', t: 1, blood: 'shambling', body: 'small', hp: 0.75, spd: 0.72, dmg: 0.8, size: 0.92, skin: '#a3a093', cloth: '#8a6d8f', cloth2: '#5c5550', acc: '#d8c9a8', hair: 'bun', hairCol: '#c9c6c0', eye: '#d6e8c0', top: 'cardigan', bottom: 'slacks', head: 'glasses', feat: ['pearls'], shoe: 'slipper', det: ['buttons', 'pocket', 'hairloss', 'mottled', 'ring', 'bracelet'], gait: 'shamble', arms: 'dangle', look: 'low', ab: 'none', p: { feed: true }, T: {}, line: 'Slow, patient, always hungry. Stops to feed on the fallen and gets back up stronger.' },
  { key: 'tourist', name: 'Tourist', t: 1, blood: 'shambling', body: 'heavy', hp: 1.1, spd: 0.84, dmg: 0.9, size: 1.05, skin: '#b38978', cloth: '#2aa1b3', cloth2: '#c9b48a', acc: '#f26b8a', hair: 'short', hairCol: '#6b4a2e', eye: '#f2e2a0', top: 'hawaii', bottom: 'shorts', head: 'bucket', capCol: '#e8dcc0', hold: 'camera', feat: ['sunburn'], shoe: 'sandal', det: ['fannypack', 'buttons', 'blisters', 'socks'], gait: 'waddle', arms: 'reach', look: 'scan', ab: 'none', p: { onHit: 'blind' }, T: {}, line: 'The camera still flashes when it swings. Hits leave you seeing spots.' },
  // ---- threat 2
  { key: 'hardhat', name: 'Hard Hat', t: 2, blood: 'shambling', body: 'stocky', hp: 1.3, spd: 0.85, dmg: 1.15, size: 1.05, skin: '#7f7566', cloth: '#e8e23a', cloth2: '#3b4a63', acc: '#5b6b7a', hair: 'short', hairCol: '#2b2420', eye: '#f0d890', top: 'vest', bottom: 'jeans', head: 'hardhat', capCol: '#f2c418', feat: ['dust'], shoe: 'boot', det: ['pocket', 'gloves', 'holes', 'toolbelt'], gait: 'stomp', arms: 'dangle', look: 'up', ab: 'none', p: { kb: 0.8 }, T: { helmet: 0.45 }, line: 'The hard hat still works: head shots from light rounds often glance off it.' },
  { key: 'nurse', name: 'Night Nurse', t: 2, blood: 'shambling', body: 'avg', hp: 0.9, spd: 1.05, dmg: 0.95, size: 0.98, skin: '#8d9a8f', cloth: '#3f9a96', cloth2: '#3f9a96', acc: '#b9d6e0', hair: 'bun', hairCol: '#1d1714', eye: '#f2f0c8', top: 'scrubs', bottom: 'scrubs', head: 'mask', feat: ['bloodhands'], shoe: 'clog', det: ['stethoscope', 'nametag', 'pocket', 'mottled', 'pens'], gait: 'shamble', arms: 'claw', look: 'tilt', ab: 'none', p: { onHit: 'bleed' }, T: {}, line: 'Fourteen-hour shift, then this. Its scratches leave you bleeding.' },
  { key: 'cook', name: 'Line Cook', t: 2, blood: 'shambling', body: 'heavy', hp: 1.2, spd: 0.88, dmg: 1.35, size: 1.05, skin: '#a08a78', cloth: '#ece8df', cloth2: '#303030', acc: '#c9c2b4', hair: 'short', hairCol: '#1e1612', eye: '#f6e0a0', top: 'chef', bottom: 'check', head: 'chefhat', capCol: '#f4f1ea', hold: 'cleaver', feat: ['apron', 'stains'], shoe: 'clog', det: ['bandage', 'cracks', 'rolled'], gait: 'waddle', arms: 'one', look: 'fwd', ab: 'none', p: { onHit: 'bleed' }, T: {}, line: 'Never put the cleaver down. Hits harder than most and leaves you bleeding.' },
  { key: 'exec', name: 'Executive', t: 2, blood: 'shambling', body: 'avg', hp: 1, spd: 1.08, dmg: 1.05, size: 1, skin: '#7d7468', cloth: '#22252c', cloth2: '#22252c', acc: '#b8a24a', hair: 'slick', hairCol: '#15110e', eye: '#ffe08a', top: 'suit', tie: 1, bottom: 'slacks', head: 'bare', hold: 'briefcase', feat: ['watch'], shoe: 'dress', det: ['buttons', 'cuffs', 'ring', 'pocket', 'scalpwound', 'mottled'], gait: 'march', arms: 'one', look: 'fwd', ab: 'pounce', abP: { wind: 0.28, time: 0.3, mul: 4.2, cd: 2.4, near: 40, far: 210 }, p: {}, T: {}, line: 'Closes the gap the way it closed deals: a sudden lunge from arm\'s reach.' },
  { key: 'farm', name: 'Farmhand', t: 2, blood: 'shambling', body: 'lanky', hp: 1.05, spd: 0.95, dmg: 1.05, size: 1.02, skin: '#a08670', cloth: '#a33a2e', cloth2: '#3e5f8a', acc: '#2a1f1a', hair: 'short', hairCol: '#5a3e22', eye: '#f2e8b0', top: 'plaid', bottom: 'overalls', head: 'straw', capCol: '#d8bf6a', feat: ['dirt'], shoe: 'boot', det: ['rolled', 'earbitten', 'gloves', 'rips'], gait: 'lope', arms: 'dangle', look: 'loll', ab: 'none', p: { reach: 14 }, T: {}, line: 'All arms. Grabs you from further away than you think.' },
  { key: 'janitor', name: 'Janitor', t: 2, blood: 'shambling', body: 'hunch', hp: 1, spd: 0.9, dmg: 0.95, size: 1, skin: '#7a7064', cloth: '#6c7476', cloth2: '#6c7476', acc: '#d8d2a8', hair: 'balding', hairCol: '#8a8580', eye: '#e2e8b8', top: 'coverall', bottom: 'coverall', head: 'bare', hold: 'mop', feat: ['keys'], shoe: 'boot', det: ['nametag', 'mottled', 'hairloss', 'gloves', 'pocket'], gait: 'drag', arms: 'carry', look: 'low', ab: 'oozer', p: {}, T: {}, line: 'Still mopping. The bucket water burns now: it leaves acid puddles behind it.' },
  // ---- threat 3
  { key: 'cop', name: 'Beat Cop', t: 3, blood: 'shambling', body: 'stocky', hp: 1.3, spd: 1, dmg: 1.1, size: 1.04, skin: '#6c6152', cloth: '#1f2a44', cloth2: '#1a2235', acc: '#d8b64a', hair: 'short', hairCol: '#1a1410', eye: '#f2d890', top: 'police', bottom: 'slacks', head: 'cap', capCol: '#18203a', feat: ['vest', 'belt'], shoe: 'boot', det: ['radio', 'holster', 'nametag', 'patch', 'holes'], gait: 'march', arms: 'reach', look: 'up', ab: 'none', p: { kb: 0.7 }, T: { armor: 0.6 }, line: 'The vest under the shirt stops pistol rounds to the chest. Aim higher or bring a rifle.' },
  { key: 'gym', name: 'Gym Bro', t: 3, blood: 'shambling', body: 'buff', hp: 1.4, spd: 1.04, dmg: 1.3, size: 1.1, skin: '#a1846c', cloth: '#1d1d1f', cloth2: '#4b4f57', acc: '#d33a3a', hair: 'short', hairCol: '#241a14', eye: '#ffd070', top: 'tank', bottom: 'shorts', head: 'sweatband', feat: ['veins'], shoe: 'sneaker', det: ['wristband', 'headphones', 'tattooarm', 'gutwound'], gait: 'stomp', arms: 'wide', look: 'up', ab: 'none', p: { onHit: 'knock', kb: 0.5 }, T: { tough: 0.15 }, line: 'Never skipped a day. Shrugs off a body shot now and then, and its hits send you flying.' },
  { key: 'medic', name: 'Paramedic', t: 3, blood: 'shambling', body: 'avg', hp: 1.05, spd: 1, dmg: 1, size: 1, skin: '#6a5a4c', cloth: '#2c3e66', cloth2: '#1f2a44', acc: '#d7e34a', hair: 'short', hairCol: '#120d0a', eye: '#f2f2c0', top: 'medic', bottom: 'slacks', head: 'bare', hold: 'medbag', holdCol: '#c22b2b', feat: ['stripe'], shoe: 'boot', det: ['radio', 'patch', 'gloves', 'pocket'], gait: 'shamble', arms: 'reach', look: 'scan', ab: 'medic', p: {}, T: {}, line: 'Still answering calls. Patches up the zombies around it.' },
  { key: 'inmate', name: 'Inmate', t: 3, blood: 'shambling', body: 'buff', hp: 1.2, spd: 1.15, dmg: 1.15, size: 1.05, skin: '#6e5c4e', cloth: '#e0712c', cloth2: '#e0712c', acc: '#1a1a1a', hair: 'shaved', hairCol: '#1a1410', eye: '#ff9a50', top: 'jumpsuit', bottom: 'jumpsuit', head: 'bare', feat: ['chains', 'tattoo'], shoe: 'slipper', det: ['tattooarm', 'number', 'socks', 'scalpwound', 'holes'], gait: 'lope', arms: 'flail', look: 'jerk', ab: 'berserker', p: {}, T: {}, line: 'Broke out when the walls came down. The more it hurts, the faster and harder it comes.' },
  { key: 'mech', name: 'Mechanic', t: 3, blood: 'shambling', body: 'stocky', hp: 1.15, spd: 0.95, dmg: 1.1, size: 1.04, skin: '#6b5d50', cloth: '#3b5b7a', cloth2: '#3b5b7a', acc: '#1a1a1a', hair: 'short', hairCol: '#2a221c', eye: '#f2e0a0', top: 'coverall', bottom: 'coverall', head: 'cap', capCol: '#c03a2b', capBack: 1, hold: 'wrench', feat: ['grease'], shoe: 'boot', det: ['nametag', 'patch', 'rag', 'cracks'], gait: 'stomp', arms: 'carry', look: 'up', ab: 'thrower', abP: { kind: 'wrench', spd: 300, cd: 3.4, range: 360 }, p: {}, T: {}, line: 'Throws whatever is in its hand. Usually a wrench.' },
  { key: 'punk', name: 'Punk', t: 3, blood: 'shambling', body: 'thin', hp: 0.95, spd: 1.2, dmg: 1.05, size: 0.98, skin: '#a49c8f', cloth: '#1a1a1a', cloth2: '#23262c', acc: '#c62f6b', hair: 'mohawk', hairCol: '#2ad46a', eye: '#ff70a0', top: 'studs', bottom: 'jeans', head: 'bare', feat: ['spikes', 'piercings'], shoe: 'boot', det: ['bracelet', 'earring', 'tattooarm', 'rips', 'mottled'], gait: 'lope', arms: 'flail', look: 'jerk', ab: 'none', p: { pack: true }, T: {}, line: 'Runs with a crowd. Faster when others of the dead are close.' },
  { key: 'lifeguard', name: 'Lifeguard', t: 3, blood: 'shambling', body: 'thin', hp: 0.95, spd: 1.3, dmg: 1, size: 1, skin: '#a07c62', cloth: '#c8102e', cloth2: '#c8102e', acc: '#f2f2f2', hair: 'short', hairCol: '#d8c27a', eye: '#f0e8b0', top: 'tank', bottom: 'shorts', head: 'bare', hold: 'whistle', feat: ['guard'], shoe: 'bare', det: ['cross', 'blisters', 'wristband'], gait: 'sprint', arms: 'pump', look: 'fwd', ab: 'sprinter', abP: { burst: 1.6, on: 2, off: 1.6 }, p: {}, T: {}, line: 'Trained to reach you fast. Sprints in long bursts.' },
  { key: 'crawler', name: 'Crawler', t: 3, blood: 'shambling', body: 'legless', hp: 0.6, spd: 0.75, dmg: 0.9, size: 0.95, skin: '#8b8f7c', cloth: '#5a5248', cloth2: '#5a5248', acc: '#7a1a1a', hair: 'long', hairCol: '#2b241d', eye: '#e6f0a0', top: 'rags', bottom: 'none', head: 'bare', feat: ['entrails'], shoe: 'bare', det: ['mottled', 'maggots', 'scalpwound', 'fingers'], gait: 'crawl', arms: 'claw', look: 'up', ab: 'none', p: {}, T: { low: 1 }, line: 'Lost its legs and kept coming. Low and hard to hit, but a clean shot finds its head easily.' },
  // ---- threat 4
  { key: 'biker', name: 'Biker', t: 4, blood: 'shambling', body: 'stocky', hp: 1.35, spd: 1, dmg: 1.3, size: 1.08, skin: '#8c7a6a', cloth: '#1b1a1c', cloth2: '#2d3646', acc: '#c0c0c0', hair: 'long', hairCol: '#3a2a1e', beard: 1, eye: '#ffb050', top: 'leather', bottom: 'jeans', head: 'bandana', capCol: '#8a1c1c', feat: ['studs'], shoe: 'boot', det: ['patch', 'ring', 'bracelet', 'tattooarm'], gait: 'stomp', arms: 'wide', look: 'fwd', ab: 'charger', p: {}, T: { tough: 0.1 }, line: 'Winds up and charges you down like it is still riding.' },
  { key: 'surgeon', name: 'Surgeon', t: 4, blood: 'shambling', body: 'thin', hp: 0.95, spd: 1.1, dmg: 1.05, size: 0.98, skin: '#8fa092', cloth: '#5b8f6e', cloth2: '#5b8f6e', acc: '#3a6a4c', hair: 'none', hairCol: '#000', eye: '#e8f8d0', top: 'gown', bottom: 'scrubs', head: 'surgcap', capCol: '#5b8f6e', hold: 'scalpel', feat: ['bloodhands', 'gloves', 'mask'], shoe: 'cover', det: ['splatter', 'nametag'], gait: 'glide', arms: 'claw', look: 'tilt', ab: 'none', p: { twin: true }, T: {}, line: 'Precise and quick. Strikes twice as often as the others.' },
  { key: 'clown', name: 'Party Clown', t: 4, blood: 'shambling', body: 'avg', hp: 1, spd: 1.05, dmg: 1, size: 1, skin: '#d9d2c8', cloth: '#6b3fa0', cloth2: '#2f8f4a', acc: '#f2d23a', hair: 'curly', hairCol: '#e2442f', eye: '#ff4a4a', top: 'clown', bottom: 'baggy', head: 'nose', feat: ['bigshoes', 'ruff'], shoe: 'big', det: ['buttons', 'gloves', 'teeth'], gait: 'jerk', arms: 'flail', look: 'tilt', ab: 'none', p: { onHit: 'weaken' }, T: {}, line: 'The party never ended. Its hits leave your hands shaking: your gun does less for a few seconds.' },
  { key: 'hazmat', name: 'Hazmat Tech', t: 4, blood: 'toxic', body: 'avg', hp: 1.1, spd: 0.9, dmg: 1, size: 1.04, skin: '#9aa36a', cloth: '#e5c52a', cloth2: '#e5c52a', acc: '#3a4b45', hair: 'none', hairCol: '#000', eye: '#d4ff3a', top: 'hazmat', bottom: 'hazmat', head: 'hazhood', feat: ['tank', 'tape'], shoe: 'boot', det: ['holes', 'cracks'], gait: 'shamble', arms: 'reach', look: 'fwd', ab: 'none', p: { onHit: 'poison', death: 'sludge' }, T: { armor: 0.15 }, line: 'The suit tore. Its hits poison you and it leaves slowing sludge when it falls.' },
  { key: 'hunter', name: 'Hunter', t: 4, blood: 'shambling', body: 'avg', hp: 1.1, spd: 1.05, dmg: 1.15, size: 1, skin: '#7f7a68', cloth: '#6b5a3a', cloth2: '#5a4c32', acc: '#f26a1b', hair: 'short', hairCol: '#3a2c1c', eye: '#ffd060', top: 'hunter', bottom: 'camo', head: 'cap', capCol: '#f26a1b', feat: ['camo'], shoe: 'boot', det: ['bandolier', 'gloves', 'earbitten'], gait: 'glide', arms: 'reach', look: 'scan', ab: 'none', p: { camo: true }, T: {}, line: 'Still knows how to stay hidden: hard to see from afar, and your sights only lock on up close.' },
  { key: 'diver', name: 'Scuba Diver', t: 4, blood: 'shambling', body: 'avg', hp: 1.1, spd: 0.85, dmg: 1.05, size: 1.02, skin: '#8fa6a8', cloth: '#15181c', cloth2: '#15181c', acc: '#2aa1d6', hair: 'short', hairCol: '#1a1a1a', eye: '#a0f0ff', top: 'wetsuit', bottom: 'wetsuit', head: 'divemask', feat: ['tank', 'flippers'], shoe: 'flipper', det: ['legknife', 'barnacles', 'algae'], gait: 'waddle', arms: 'reach', look: 'fwd', ab: 'swimmer', p: {}, T: {}, line: 'Clumsy on land in its flippers. In the water it is terrifyingly fast.' },
  { key: 'skipatrol', name: 'Ski Patrol', t: 4, blood: 'frostbitten', body: 'avg', hp: 1.1, spd: 1, dmg: 1.05, size: 1.02, skin: '#a9bcc6', cloth: '#c0262c', cloth2: '#1a1f28', acc: '#f2f2f2', hair: 'none', hairCol: '#000', eye: '#e0f6ff', top: 'ski', bottom: 'skipants', head: 'beanie', capCol: '#f2f2f2', feat: ['goggles', 'frost'], shoe: 'boot', det: ['gloves', 'cross', 'radio', 'frostbite'], gait: 'shamble', arms: 'reach', look: 'fwd', ab: 'none', p: { onHit: 'chill' }, T: {}, line: 'Froze on the mountain and thawed out hungry. Its hits chill you to the bone.' },
  { key: 'drowned', name: 'Drowned', t: 4, blood: 'bloated', body: 'heavy', hp: 1.3, spd: 0.8, dmg: 1.05, size: 1.08, skin: '#7d96a0', cloth: '#4b5e6a', cloth2: '#2b3640', acc: '#3e6b3a', hair: 'long', hairCol: '#1e2a2e', eye: '#d0f0f0', top: 'shirt', bottom: 'slacks', head: 'bare', feat: ['seaweed', 'drip'], shoe: 'oneshoe', det: ['algae', 'barnacles', 'mottled'], gait: 'drag', arms: 'dangle', look: 'loll', ab: 'none', p: { death: 'bile' }, T: {}, line: 'Swollen with river water. Bursts in a spray of bile when it dies, so keep your distance.' },
  { key: 'rotter', name: 'Rotter', t: 4, blood: 'rotten', body: 'avg', hp: 0.75, spd: 0.85, dmg: 1.2, size: 1, skin: '#6b6a4e', cloth: '#4b4537', cloth2: '#3e392e', acc: '#c8c0a0', hair: 'patchy', hairCol: '#3a3326', eye: '#e8d26a', top: 'rags', bottom: 'rags', head: 'bare', feat: ['bones', 'noarmL', 'flies'], shoe: 'bare', det: ['maggots', 'mold', 'hairloss', 'teeth', 'eyemissing'], gait: 'drag', arms: 'one', look: 'loll', ab: 'none', p: { death: 'spores' }, T: { brittle: 1 }, line: 'Falling apart: bullets take limbs off easily. Leaves a choking spore cloud when it drops.' },
  // ---- threat 5
  { key: 'soldier', name: 'Soldier', t: 5, blood: 'shambling', body: 'stocky', hp: 1.5, spd: 1, dmg: 1.25, size: 1.05, skin: '#6d6b59', cloth: '#5c6648', cloth2: '#56603f', acc: '#3b3f33', hair: 'shaved', hairCol: '#1a1410', eye: '#f0d880', top: 'camo', bottom: 'camo', head: 'helmet', capCol: '#4d5440', feat: ['plates', 'straps'], shoe: 'boot', det: ['radio', 'patch', 'pouches', 'dogtags', 'holes'], gait: 'march', arms: 'reach', look: 'up', ab: 'none', p: {}, T: { helmet: 0.35, armor: 0.55 }, line: 'Helmet and plate carrier. Only rifle rounds go through cleanly.' },
  { key: 'bride', name: 'Jilted Bride', t: 5, blood: 'shambling', body: 'thin', hp: 0.95, spd: 1.05, dmg: 1.05, size: 1, skin: '#c7c9c4', cloth: '#f1ece3', cloth2: '#f1ece3', acc: '#d8cfc0', hair: 'long', hairCol: '#3a2a20', eye: '#ff6a7a', top: 'dress', bottom: 'skirt', head: 'veil', hold: 'bouquet', holdCol: '#5a3a4a', feat: ['lace'], shoe: 'heel', det: ['ring', 'mascara', 'scalpwound'], gait: 'glide', arms: 'hug', look: 'tilt', ab: 'none', p: { onHit: 'root' }, T: {}, line: 'Till death, and after. When it catches you it holds on and you cannot move for a moment.' },
  { key: 'lab', name: 'Lab Assistant', t: 5, blood: 'toxic', body: 'thin', hp: 1, spd: 1.05, dmg: 1, size: 1, skin: '#9fb07a', cloth: '#e8ebe6', cloth2: '#3a3f47', acc: '#8fd0d8', hair: 'messy', hairCol: '#6b4b2a', eye: '#d4ff3a', top: 'labcoat', bottom: 'slacks', head: 'goggles', feat: ['glowveins', 'stains'], shoe: 'sneaker', det: ['pens', 'nametag', 'gloves', 'mottled', 'blisters'], gait: 'jerk', arms: 'claw', look: 'twitch', ab: 'regrower', p: {}, T: {}, line: 'Tested the serum on itself. Its glowing flesh knits back together fast.' },
  { key: 'burnt', name: 'Burn Victim', t: 5, blood: 'charred', body: 'thin', hp: 1, spd: 1.1, dmg: 1.15, size: 1, skin: '#3a2a24', cloth: '#2a1d18', cloth2: '#2a1d18', acc: '#ff7a2a', hair: 'none', hairCol: '#000', eye: '#ff8a2a', top: 'rags', bottom: 'rags', head: 'bare', feat: ['embers', 'burns'], shoe: 'bare', det: ['blisters', 'cracks', 'hairloss'], gait: 'stagger', arms: 'flail', look: 'jerk', ab: 'none', p: { onHit: 'burn', death: 'fire' }, T: {}, line: 'Still smouldering. Its hits set you alight and it leaves fire where it falls.' },
  { key: 'lineman', name: 'Lineman', t: 5, blood: 'volt', body: 'lanky', hp: 1.05, spd: 1, dmg: 1.1, size: 1.02, skin: '#6d5f52', cloth: '#a3784a', cloth2: '#3b4a63', acc: '#e8d23a', hair: 'short', hairCol: '#1e1612', eye: '#fff36b', top: 'work', bottom: 'jeans', head: 'hardhat', capCol: '#ececec', feat: ['harness', 'sparks', 'burns'], shoe: 'boot', det: ['gloves', 'toolbelt'], gait: 'jerk', arms: 'dangle', look: 'twitch', ab: 'shocker', p: {}, T: { helmet: 0.6 }, line: 'Grabbed the wrong line. Arcs lightning at you from close range.' },
  { key: 'linebacker', name: 'Linebacker', t: 5, blood: 'shambling', body: 'buff', hp: 1.5, spd: 1.12, dmg: 1.3, size: 1.12, skin: '#7d6f62', cloth: '#7a1f2b', cloth2: '#e6dfc8', acc: '#f1ece3', hair: 'none', hairCol: '#1a1410', eye: '#ffb04a', top: 'jersey', bottom: 'football', head: 'football', capCol: '#7a1f2b', feat: ['shoulderpads', 'number', 'stains'], shoe: 'cleat', det: ['eyeblack', 'kneepads', 'socks', 'grass', 'mouthguard', 'wristband'], gait: 'drive', arms: 'tackle', look: 'low', ab: 'blitz', abP: { wind: 0.34, time: 0.72, mul: 3.5, cd: 3.6, near: 70, far: 400, turn: 2.4 }, p: { kb: 0.35, onHit: 'knock' }, T: { helmet: 0.45, armor: 0.25, tough: 0.15 }, line: 'Friday night lights, forever: number 54 never left the field. It sets in a stance, then drives at where you are going to be (not where you are), bowling the dead in its way forward at you; if it connects you go down. The helmet turns light rounds and the pads soak body shots. Aim for the legs.' },
  { key: 'bugman', name: 'Exterminator', t: 5, blood: 'shambling', body: 'avg', hp: 1.05, spd: 0.95, dmg: 1, size: 1, skin: '#7a7a5e', cloth: '#b8c2a0', cloth2: '#b8c2a0', acc: '#3b6b2a', hair: 'none', hairCol: '#000', eye: '#e0f060', top: 'coverall', bottom: 'coverall', head: 'respirator', feat: ['tank', 'flies'], shoe: 'boot', det: ['gloves', 'nametag', 'logo'], gait: 'shamble', arms: 'reach', look: 'fwd', ab: 'hive', p: {}, T: {}, line: 'The bugs won. Shoot it and the swarm inside comes out biting.' },
  { key: 'spitter', name: 'Spitter', t: 5, blood: 'toxic', body: 'hunch', hp: 0.9, spd: 0.95, dmg: 0.95, size: 1, skin: '#8e9a62', cloth: '#3a4a32', cloth2: '#3a4a32', acc: '#b8ec4a', hair: 'none', hairCol: '#000', eye: '#d4ff3a', top: 'rags', bottom: 'rags', head: 'bare', feat: ['throatsac', 'drool'], shoe: 'bare', det: ['blisters', 'mottled', 'teeth'], gait: 'shamble', arms: 'dangle', look: 'fwd', ab: 'spitter', p: {}, T: {}, line: 'Its throat swelled into an acid sac. Hangs back and spits.' },
  // ---- threat 6
  { key: 'riot', name: 'Riot Cop', t: 6, blood: 'shambling', body: 'stocky', hp: 1.5, spd: 0.85, dmg: 1.2, size: 1.08, skin: '#6a6458', cloth: '#1c1e22', cloth2: '#1c1e22', acc: '#3a3d44', hair: 'none', hairCol: '#000', eye: '#a0d0ff', top: 'riot', bottom: 'riot', head: 'riothelm', hold: 'shield', feat: ['pads'], shoe: 'boot', det: ['radio', 'holes'], gait: 'march', arms: 'shield', look: 'up', ab: 'none', p: {}, T: { shield: 1, helmet: 0.4, armor: 0.6 }, line: 'Holds its shield up front: bullets from ahead stop dead. Flank it, or blow it up.' },
  { key: 'screamer', name: 'Screamer', t: 6, blood: 'shambling', body: 'thin', hp: 0.8, spd: 1.05, dmg: 0.9, size: 0.98, skin: '#b3aca0', cloth: '#463d3a', cloth2: '#463d3a', acc: '#2a1a1a', hair: 'patchy', hairCol: '#3a3330', eye: '#ff4040', top: 'rags', bottom: 'rags', head: 'bare', feat: ['bigjaw', 'ribs'], shoe: 'bare', det: ['teeth', 'hairloss', 'mottled', 'eyemissing'], gait: 'jerk', arms: 'dangle', look: 'up', ab: 'screamer', p: {}, T: {}, line: 'Its jaw unhinged for good. Screams to drive the horde around it faster.' },
  { key: 'bloater', name: 'Bloater', t: 6, blood: 'bloated', body: 'bloat', hp: 2.2, spd: 0.6, dmg: 1.1, size: 1.3, skin: '#8a8f6a', cloth: '#5e6a5a', cloth2: '#3a3a33', acc: '#c8c86a', hair: 'patchy', hairCol: '#3a3a2a', eye: '#e8e070', top: 'shirt', bottom: 'slacks', head: 'bare', feat: ['belly', 'boils'], shoe: 'oneshoe', det: ['blisters', 'mottled', 'maggots', 'cracks'], gait: 'waddle', arms: 'dangle', look: 'loll', ab: 'bomber', p: { death: 'bile' }, T: { tough: 0.2 }, line: 'Swollen to bursting. Goes off when it reaches you, or when you pop it.' },
  { key: 'ravager', name: 'Ravager', t: 6, blood: 'shambling', body: 'thin', hp: 0.85, spd: 1.5, dmg: 1.15, size: 0.96, skin: '#8d8478', cloth: '#2d2a26', cloth2: '#2d2a26', acc: '#5a1010', hair: 'long', hairCol: '#1c1815', eye: '#ffde3a', top: 'none', bottom: 'shorts', head: 'bare', feat: ['ribs', 'claws'], shoe: 'bare', det: ['scars', 'mottled', 'teeth'], gait: 'scuttle', arms: 'claw', look: 'low', ab: 'pounce', abP: { wind: 0.22, time: 0.34, mul: 4.6, cd: 2.2, near: 40, far: 240 }, p: { pack: true }, T: { low: 0.4 }, line: 'Runs on all fours, hunts in packs and pounces from low to the ground.' },
  { key: 'leaper', name: 'Leaper', t: 6, blood: 'shambling', body: 'buff', hp: 1, spd: 1.2, dmg: 1.15, size: 1.02, skin: '#7c6e62', cloth: '#4a3c34', cloth2: '#2b2b2b', acc: '#c8b8a0', hair: 'shaved', hairCol: '#1a1410', eye: '#ffb030', top: 'tank', bottom: 'shorts', head: 'bare', feat: ['bonelegs'], shoe: 'bare', det: ['scars', 'mottled', 'teeth'], gait: 'hop', arms: 'claw', look: 'up', ab: 'pounce', abP: { wind: 0.42, time: 0.52, mul: 4.8, cd: 3.2, near: 90, far: 420 }, p: {}, T: {}, line: 'Its legs grew bone springs. Crouches, then clears half a street in one leap.' },
  { key: 'husk', name: 'Husk', t: 6, blood: 'mummified', body: 'thin', hp: 1.1, spd: 0.9, dmg: 1.05, size: 1, skin: '#9b8a6a', cloth: '#c8b994', cloth2: '#c8b994', acc: '#6a5a3a', hair: 'patchy', hairCol: '#5a4a32', eye: '#5fd4ff', top: 'wraps', bottom: 'wraps', head: 'bare', feat: ['dry'], shoe: 'bare', det: ['cracks', 'hairloss', 'eyemissing'], gait: 'stagger', arms: 'reach', look: 'jerk', ab: 'none', p: { revive: true }, T: {}, line: 'Dried out but not done. Gets back up once, unless you take the head.' },
  // ---- threat 7
  { key: 'astro', name: 'Astronaut', t: 7, blood: 'shambling', body: 'stocky', hp: 1.6, spd: 0.8, dmg: 1.2, size: 1.1, skin: '#9c9a8f', cloth: '#e9e7e1', cloth2: '#e9e7e1', acc: '#c23b2e', hair: 'none', hairCol: '#000', eye: '#ffe0a0', top: 'space', bottom: 'space', head: 'spacehelm', feat: ['pack', 'flag'], shoe: 'boot', det: ['patch', 'pouches', 'hoses'], gait: 'hop', arms: 'reach', look: 'up', ab: 'pounce', abP: { wind: 0.5, time: 0.7, mul: 3.2, cd: 3.6, near: 80, far: 380 }, p: { kb: 0.4 }, T: { helmet: 0.25, armor: 0.4 }, line: 'Came back down wrong. The suit and visor stop most rounds, and it bounds at you in slow, high leaps.' },
  { key: 'stalker', name: 'Stalker', t: 7, blood: 'shambling', body: 'lanky', hp: 1.05, spd: 1.25, dmg: 1.2, size: 1.05, skin: '#6f7470', cloth: '#2a2d2b', cloth2: '#1d1f1e', acc: '#4a4f4c', hair: 'none', hairCol: '#000', eye: '#ff2d55', top: 'hood', bottom: 'slacks', head: 'hood', feat: ['longfingers'], shoe: 'sneaker', det: ['scars', 'mottled'], gait: 'glide', arms: 'dangle', look: 'tilt', ab: 'pounce', abP: { wind: 0.35, time: 0.38, mul: 5, cd: 3, near: 60, far: 300 }, p: { camo: true }, T: {}, line: 'Tall, thin and nearly invisible until it is close. Then it strikes from the dark.' },
  { key: 'climber', name: 'Frozen Climber', t: 7, blood: 'frostbitten', body: 'avg', hp: 1.35, spd: 0.85, dmg: 1.2, size: 1.04, skin: '#b8cfd9', cloth: '#3a6ea5', cloth2: '#1f2a3a', acc: '#f2a43a', hair: 'none', hairCol: '#000', eye: '#9ff6ff', top: 'parka', bottom: 'skipants', head: 'climbhelm', capCol: '#e2e2e2', hold: 'iceaxe', feat: ['icicles', 'frost', 'goggles'], shoe: 'crampon', det: ['gloves', 'rope', 'frostbite'], gait: 'stomp', arms: 'carry', look: 'fwd', ab: 'chiller', p: { onHit: 'freeze' }, T: { helmet: 0.6 }, line: 'Brought the summit down with it: a freezing aura slows you, and its hits freeze you solid for a moment.' },
  { key: 'fungal', name: 'Fungal Host', t: 7, blood: 'fungal', body: 'hunch', hp: 1.4, spd: 0.85, dmg: 1.1, size: 1.06, skin: '#7a6e5a', cloth: '#3e3a2e', cloth2: '#3e3a2e', acc: '#c98b4a', hair: 'none', hairCol: '#000', eye: '#fff0c0', top: 'rags', bottom: 'rags', head: 'mushrooms', feat: ['mushrooms', 'spores'], shoe: 'bare', det: ['mold', 'hairloss'], gait: 'shamble', arms: 'dangle', look: 'low', ab: 'none', p: { regen: 0.02, death: 'spores' }, T: { tough: 0.2 }, line: 'More fungus than flesh. Slowly regrows, and bursts into a spore cloud when it dies.' },
  // ---- threat 8 and 9
  { key: 'brute', name: 'Brute', t: 8, blood: 'brutish', body: 'brute', hp: 3, spd: 0.75, dmg: 2, size: 1.45, skin: '#6f6a5c', cloth: '#2c2a28', cloth2: '#2c2a28', acc: '#d8cfb8', hair: 'none', hairCol: '#000', eye: '#ff6b3d', top: 'none', bottom: 'pants', head: 'bare', feat: ['plates', 'spikes'], shoe: 'bare', det: ['scars', 'teeth', 'cracks'], gait: 'stomp', arms: 'wide', look: 'low', ab: 'charger', p: { kb: 0 }, T: { tough: 0.45, armor: 0.3 }, line: 'Bone plates over a wall of muscle. Shrugs off body shots and charges like a truck.' },
  { key: 'glow', name: 'Glow Worker', t: 8, blood: 'irradiated', body: 'avg', hp: 1.3, spd: 1, dmg: 1.2, size: 1.04, skin: '#c8e06a', cloth: '#d9d2b0', cloth2: '#d9d2b0', acc: '#e8c52a', hair: 'none', hairCol: '#000', eye: '#eaff4a', top: 'coverall', bottom: 'coverall', head: 'hardhat', capCol: '#f2f2f2', feat: ['glowveins', 'dosimeter', 'trefoil'], shoe: 'boot', det: ['gloves', 'nametag', 'blisters'], gait: 'march', arms: 'reach', look: 'up', ab: 'none', p: { rad: true }, T: { helmet: 0.6 }, line: 'From the plant on the river. Glows in the dark and burns you with radiation when you stand close.' },
  { key: 'stitched', name: 'Stitched', t: 8, blood: 'stitched', body: 'buff', hp: 1.8, spd: 0.95, dmg: 1.35, size: 1.12, skin: '#9c8a96', cloth: '#2e2a30', cloth2: '#2e2a30', acc: '#c8b8a8', hair: 'patchy', hairCol: '#2a2420', eye: '#7af0ff', top: 'none', bottom: 'pants', head: 'bare', feat: ['stitches', 'patches', 'bigarm'], shoe: 'bare', det: ['scars', 'staples'], gait: 'limp', arms: 'one', look: 'tilt', ab: 'none', p: { surge: true }, T: { tough: 0.25 }, line: 'Sewn together from the parts of others. Surges with strength when it drops below half.' },
  { key: 'carrier', name: 'Carrier', t: 9, blood: 'brood', body: 'bloat', hp: 2.6, spd: 0.7, dmg: 1.4, size: 1.4, skin: '#8b7f74', cloth: '#3a332c', cloth2: '#3a332c', acc: '#c8a080', hair: 'none', hairCol: '#000', eye: '#ffe08a', top: 'none', bottom: 'rags', head: 'bare', feat: ['sacs', 'belly'], shoe: 'bare', det: ['maggots', 'mold', 'blisters'], gait: 'waddle', arms: 'dangle', look: 'low', ab: 'carrier', p: { death: 'carrier' }, T: { tough: 0.3 }, line: 'Its back is a nest. Sheds crawlers as it walks and splits open into more when it dies.' }
];
const ZR_BASE = 1000;   // the new zombies' ids come after the old 1,000 mutations (MUTS[1000] is the first of them)
const ZR = [];          // the new roster, in order (filled once below)
const ZR_BY = new Map();
// a hex colour in the strain format the rest of the game reads (hue, saturation, lightness)
function zrHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
const ZR_AB_DESC = {
  none: 'No special behaviour: it just keeps coming.', sprinter: 'Sprints in sudden bursts.', relentless: 'Never loses your trail; speeds up the further away you are.', pounce: 'Lunges or leaps at you.',
  oozer: 'Leaves burning acid puddles behind it.', berserker: 'Gets faster and stronger as it is hurt.', thrower: 'Throws things at you from range.', medic: 'Heals the zombies around it.',
  charger: 'Winds up and charges in a straight line.', swimmer: 'Very fast in water, slow on land.', regrower: 'Regenerates quickly.', shocker: 'Zaps you with arcing lightning.',
  hive: 'Releases biting flies when shot.', spitter: 'Spits acid from range.', screamer: 'Screams to speed up the horde around it.', bomber: 'Detonates when it reaches you or dies.',
  chiller: 'A freezing aura slows you when close.', carrier: 'Sheds crawlers as it walks.', blitz: 'Sets in a stance, then drives low at where you are going to be, bowling the zombies in its way at you; a hit knocks you down.'
};
// each definition becomes a mutation the rest of the game understands (the blood, glow, codex, co-op and spawn code all
// read the same fields as the old ones), plus its rig, look and animation set from the animation engine
function zrBuild() {
  if (ZR.length) return;
  ZR_DEFS.forEach((d, i) => { const m = zrMake(d, i); MUTS[m.id] = m; ZR.push(m); ZR_BY.set(d.key, m); });
  if (typeof animaBuildAll === 'function') animaBuildAll(ZR);
}
// one definition becomes one zombie (also how CORE rebuilds a broken entry from its definition)
function zrMake(d, i) {
  const base = STRAINS.find(s => s.key === d.blood) || STRAINS[0];
  const S = Object.assign({}, base, { key: d.blood, name: d.name, trait: d.line, p: Object.assign({}, d.p), skin: zrHsl(d.skin), cloth: zrHsl(d.cloth), eye: d.eye, clothed: d.top !== 'none' });
  S.gore = base.gore || '#5a0d0d';
  const A = { key: d.ab, name: d.ab === 'none' ? 'No mutation' : d.ab[0].toUpperCase() + d.ab.slice(1), desc: ZR_AB_DESC[d.ab] || '', threat: 0 };
  const id = ZR_BASE + i;
  const m = { id: id, num: i + 1, s: -1, a: -1, S: S, A: A, name: d.name, threat: d.t, rarity: Z.rarityOf(d.t + 1), wave: zrWave(d.t), hp: d.hp, spd: d.spd, dmg: d.dmg, size: d.size, hue: 0, seed: Z.hash32(id * 31 + 7), v2: true, def: d, T: d.T || {}, idx: i };
  return m;
}
// the first wave a threat level can turn up in (threat 1-2 from the start, the worst from about wave 12)
function zrWave(t) { return t <= 2 ? 1 : t === 3 ? 2 : Math.round(1 + (t - 2) * 1.6); }
// which zombies a wave can bring: everything up to this wave's threat
function zrPool(wave) { const cap = Math.min(9, 2 + Math.floor((wave - 1) * 0.62)); return ZR.filter(m => m.threat <= cap); }
// while 2.0 is built: only the new roster spawns; the old mutations and every boss stay switched off
const ZR_ONLY = true, ZR_BOSSES_OFF = true;

/* ---------- what the new zombies do (behaviours that are theirs alone) ---------- */
// bursts of speed: running flat out, then a few seconds of the shambling it does in between
ABIL.sprinter = function (z, dt, dx, dy, d, c) {
  if (typeof hordeOn === 'function' && hordeOn(z)) return;   // (1.9.998: with World War Z on, the frenzy is its burst)
  const s = z.st, P = z.m.def.abP || {}; s.sb = (s.sb === undefined ? rand(0, P.off || 2) : s.sb) - dt;
  if (s.sb <= 0) { s.sr = !s.sr; s.sb = s.sr ? (P.on || 1.5) : (P.off || 2) * rand(0.7, 1.3); }
  if (s.sr) { z.mulB = (z.mulB || 1) * (P.burst || 1.8); s.surgeT = Math.max(s.surgeT || 0, 0.1); c.move = Math.max(c.move, 1); }
  else c.move = Math.min(c.move, 0.75);
};
// never loses you: the further away you are the faster it walks
ABIL.relentless = function (z, dt, dx, dy, d) { if (d > 260) z.mulB = (z.mulB || 1) * Math.min(1.6, 1 + (d - 260) / 700); z.noLosT = 0; };
// a lunge or a leap, tuned per zombie: a wind-up (crouched, its tell), then the jump
ABIL.pounce = function (z, dt, dx, dy, d, c) {
  const s = z.st, P = z.m.def.abP || {};
  if (s.lt > 0) { s.lt -= dt; c.ov = true; c.vx = s.lx * z.speed * (P.mul || 4.2); c.vy = s.ly * z.speed * (P.mul || 4.2); c.face = Math.atan2(s.ly, s.lx); z.leapK = 1; return; }
  z.leapK = 0;
  if (s.lw > 0) { s.lw -= dt; c.move = 0.05; z.warn = s.lw; z.windK = 1; if (s.lw <= 0) { s.lt = P.time || 0.32; s.lx = dx / d; s.ly = dy / d; z.windK = 0; } return; }
  z.windK = 0;
  s.cd = (s.cd === undefined ? rand(1, 2.5) : s.cd) - dt;
  if (s.cd <= 0 && d < (P.far || 210) && d > (P.near || 40)) { s.lw = P.wind || 0.3; s.cd = P.cd || 2.6; }
};
// the ones with no special mutation still have a move: a brace and a lurch at you from just out of reach
ABIL.none = function (z, dt, dx, dy, d, c) {
  if (!z.m.v2) return;
  if (z.legK >= 2 || z.stun > 0) { z.leapK = 0; z.windK = 0; z.st.nl = z.st.nw = 0; return; }
  const s = z.st;
  if (s.nl > 0) { s.nl -= dt; z.leapK = 1; z.abMul = (z.abMul || 1) * 1.9; if (s.nl <= 0) z.leapK = 0; return; }
  if (s.nw > 0) { s.nw -= dt; z.windK = 1; c.move = Math.min(c.move, 0.25); if (s.nw <= 0) { z.windK = 0; s.nl = 0.32; } return; }
  s.ncd = (s.ncd === undefined ? rand(2, 6) : s.ncd) - dt;
  const reach = z.r + (G.p ? G.p.r : 10) + z.reach;
  if (s.ncd <= 0 && d > reach + 18 && d < reach + 95) { s.ncd = rand(4, 8); s.nw = 0.34; }
};
// far faster in the water, clumsier out of it
ABIL.swimmer = function (z) { z.mulB = (z.mulB || 1) * (z.inW ? 2.4 : 0.92); };
// throws what it holds (a wrench, a brick), then picks up another
ABIL.thrower = function (z, dt, dx, dy, d, c) {
  const s = z.st, P = z.m.def.abP || {}; if (d < 120) c.move = Math.min(c.move, 0.6);
  s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
  if (s.cd <= 0 && d < (P.range || 360) && d > 70) { s.cd = (P.cd || 3.4) * rand(0.85, 1.15); s.castT = G.time; const a = Math.atan2(dy, dx); shoot(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, a, P.spd || 300, z.dmg * 1.1, 5, P.kind || 'wrench'); }
};
// sheds crawlers from the sacs on its back as it walks
ABIL.carrier = function (z, dt, dx, dy, d) {
  const s = z.st; s.cd = (s.cd === undefined ? rand(3, 5) : s.cd) - dt;
  const cw = ZR_BY.get('crawler');
  if (s.cd <= 0 && d < 620 && G.zs.length < (typeof swarmCapLive === 'function' ? swarmCapLive() : 140) && cw) {
    s.cd = rand(5.5, 7); s.castT = G.time;
    for (let i = 0; i < 2; i++) { const a = z.ang + Math.PI + rand(-0.8, 0.8), q = spawnZombie(cw, z.x + Math.cos(a) * z.r * 1.3, z.y + Math.sin(a) * z.r * 1.3, { minion: true }); if (q) { q.emT = G.time; } }
    burst(z.x, z.y, 10, '#8a6a5a', 120, 4, 0.5);
  }
};
// 1.9.998: the Linebacker's blitz. A stance (its tell), then a low drive at where you are going to be: it leads you by
// the time it takes to get there and steers as it goes, but only as fast as a body that heavy can turn (so a sidestep
// at the last moment beats it, and a wall stops it cold). The dead in its way are bowled forward, at you; if it reaches
// you it takes you down (thrown back, rooted and unable to fire for a moment)
ABIL.blitz = function (z, dt, dx, dy, d, c) {
  const s = z.st, P = z.m.def.abP || {}, p = G.p;
  if (s.charge > 0) {
    s.charge -= dt; c.ov = true;
    const sp = z.speed * (P.mul || 3.5), lead = Math.min(1.1, d / Math.max(60, sp));
    const want = Math.atan2(p.y + (p.ivy || 0) * lead - z.y, p.x + (p.ivx || 0) * lead - z.x);
    let a = Math.atan2(s.cy, s.cx); const da = ((want - a + Math.PI) % TAU + TAU) % TAU - Math.PI, mx = (P.turn || 2.4) * dt; a += clamp(da, -mx, mx);
    s.cx = Math.cos(a); s.cy = Math.sin(a); c.vx = s.cx * sp; c.vy = s.cy * sp; c.face = a; z.leapK = 1;
    near(z.x, z.y, z.r * 2.4, o => {
      if (o === z || o.dead || o.boss || o.fly) return;
      const ex = o.x - z.x, ey = o.y - z.y, e = Math.hypot(ex, ey) || 1; if ((ex * s.cx + ey * s.cy) / e < 0.2) return;
      const side = (-ex * s.cy + ey * s.cx) / e; o.kvx += s.cx * 430 - s.cy * side * 260; o.kvy += s.cy * 430 + s.cx * side * 260; o.bowlT = G.time; o.bowlA = a;
    });
    if (G.mode === 'play' && d < z.r + p.r + 6) {
      s.charge = 0; z.stun = 0.55; z.leapK = 0;
      if (hurtPlayer(z.dmg * 1.5)) { p.kvx += s.cx * 640; p.kvy += s.cy * 640; p.rootT = Math.max(p.rootT, 0.55); p.jamT = Math.max(p.jamT, 0.45); shakeIt(7); burst(p.x, p.y, 10, '#c8bfa8', 160, 4, 0.4); }
    }
    if (Math.random() < 0.5) burst(z.x - s.cx * z.r, z.y - s.cy * z.r, 1, 'rgba(120,110,90,0.7)', 40, 4, 0.4);
    return;
  }
  z.leapK = 0;
  if (s.wind > 0) { s.wind -= dt; c.move = 0; z.warn = s.wind; z.windK = 1; c.face = Math.atan2(dy, dx); if (s.wind <= 0) { s.charge = P.time || 0.72; s.cx = dx / d; s.cy = dy / d; z.windK = 0; } return; }
  z.windK = 0;
  s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
  if (s.cd <= 0 && d < (P.far || 400) && d > (P.near || 70) && !(z.legK >= 2)) { s.cd = (P.cd || 3.6) * rand(0.85, 1.15); s.wind = P.wind || 0.34; }
};
/* CORE v3: MUTAGEN checks the roster (every zombie whole: its numbers, its place in the lists, its rig) and rebuilds a
   broken entry from its definition; it learns which zombies this device meets most, so the loading screen warms their
   animation frames first. What a zombie is and does never changes with what is learned. */
function zrWhole(m, i) {
  return !!m && m.id === ZR_BASE + i && MUTS[m.id] === m && ZR_BY.get(m.def.key) === m && [m.hp, m.spd, m.dmg, m.size].every(v => v > 0 && v < 20) && !!m.S && !!m.A && (typeof animaBuildAll !== 'function' || !!m.an);
}
function mutaSeen(m) {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.MUTAGEN) return;
  const o = learnOwn('MUTAGEN'), s = o.seen || (o.seen = {}), k = m.def.key; s[k] = (s[k] | 0) + 1; if (((o.n = (o.n | 0) + 1) % 40) === 0) learnDirty();
}
// the zombies the loading screen warms: the first waves' pool, the ones met most on this device first
function mutaWarmList(wave) {
  const pool = zrPool(wave), o = typeof LEARN !== 'undefined' && LEARN.ready && CORE.by.MUTAGEN ? learnOwn('MUTAGEN') : {}, s = o.seen || {};
  const extra = ZR.filter(m => !pool.includes(m) && (s[m.def.key] | 0) > 20).sort((a, b) => (s[b.def.key] | 0) - (s[a.def.key] | 0)).slice(0, 4);
  return pool.concat(extra).sort((a, b) => (s[b.def.key] | 0) - (s[a.def.key] | 0)).slice(0, 18);
}
coreMeta('MUTAGEN', { ver: 2, provides: ['roster'],
  check: () => { if (ZR.length !== ZR_DEFS.length) return 'the roster is missing ' + (ZR_DEFS.length - ZR.length) + ' zombies'; for (let i = 0; i < ZR.length; i++) if (!zrWhole(ZR[i], i)) return ZR[i] && ZR[i].name ? ZR[i].name + ' is broken' : 'an entry is broken'; return ''; },
  repair: () => {
    for (let i = 0; i < ZR_DEFS.length; i++) {
      if (zrWhole(ZR[i], i)) continue;
      const m = zrMake(ZR_DEFS[i], i); ZR[i] = m; MUTS[m.id] = m; ZR_BY.set(m.def.key, m);
      if (typeof animaBuildAll === 'function') animaBuildAll([m]);
      coreLog('MUTAGEN rebuilt ' + m.name + ' from its definition');
    }
  },
  selfTest: () => { let pass = 0; for (let i = 0; i < ZR.length; i++) if (zrWhole(ZR[i], i)) pass++; return { ok: ZR.length === ZR_DEFS.length && pass === ZR.length, n: ZR_DEFS.length, pass: pass, why: pass === ZR.length ? (ZR.length === ZR_DEFS.length ? '' : 'zombies are missing') : (ZR_DEFS.length - pass) + ' zombies are broken' }; },
  learned: () => { const s = learnOwn('MUTAGEN').seen; if (!s) return []; const top = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => (ZR_BY.get(k) || { name: k }).name + ' (' + n + ')'); return ['Met most on this device: ' + top.join(', ') + '; the loading screen warms these first.']; } });
