# 27 engines

Zombie City runs on 27 engines. Each one does one job (light, sound, the crowd, the city, co-op...) and none of them works alone: they meet in CORE, the hub, which gives them one shared frame, one time budget, a message bus, a capability registry and a watchdog.

## How the ecosystem works (CORE v3)

- Adapts: an engine steps itself up and down with the frame and the device. When the frame runs late, CORE steps down the engine whose step down saves the most on this device; when there is room it climbs engines back, if what it learned says the next level fits. When a horde sets off it steps the crowd engines down before the crowd arrives.
- Repairs itself: every engine checks itself, and CORE checks every engine every two seconds (errors, the engine's own check, a heartbeat, a self-test). For each problem CORE tries the fixes that have worked best for that kind of problem on this device (the engine's own repair, help from the others, a step down, a fresh start), then rests the engine while the others cover for it.
- Learns: on each device, what every engine costs at each level and load, the levels it could not hold, which fix clears which problem and how much to trust each engine; and some engines learn something of their own (the co-op link, how fast the radio renders, when a phone runs hot, how long a city block takes to draw). Learning never changes the rules of a run (damage, hits, the waves): only how the work is done and drawn, so co-op screens can never fall out of step.
- Compatible: each engine says what it needs from the device and what it provides to the others, so it can tell you if it runs here fully, partly or not at all, and engines ask for a capability ("light", "crowd", "paths") instead of for each other.
- Heartbeat and self-test: an engine that should be working and goes quiet is restarted; engines that can test themselves do so at start (the name filter, the bullet maths, the roster, the encryption, the rigs, the city's seed).

All of it shows live in the engine room (Settings > Accessibility > Ultra advanced): every engine's cost, its traits, what it has learned on this device, its trust, its self-test, and the two controls (how hard it runs, CPU or GPU).

## Adding an engine

A new engine is one file added to the module list in build.js and one coreDefine({...}) call inside it, with its name, what it does, what it provides and needs, its levels and load, its checks, repairs and self-test, what it learns, its engine room spec and its entry for this document. The hub, the engine room, the contract test, the "how intricate is it" score and this document all pick it up from there.

## The engines

### CORE: The Conductor

*The calm one in the middle. It never draws a pixel: it listens to every engine every second, keeps the books on the frame, and decides who steps back when time runs short. Since v3 it remembers what works on each device, what has failed there, and which engines it can trust.*

- **What it does:** The hub every engine plugs into: one shared frame (the view, the camera, the sun, the brightest lights), one time budget, a message bus for events (a new run, a kill, a horde, memory running short), a capability registry so engines ask for "light" or "crowd" instead of for each other by name, and the watchdog that keeps them all sound. It also runs the engine room's tuning and locks.
- **Adapts:** Runs the time budget. When the frame runs late it steps down the engine whose step down saves the most on this device (Eco engines first, Hard engines last, Max never on its own). It climbs engines back up when the frame has room and what it learned says the next level fits. When a horde sets off or a wave starts it looks at what the engines cost with that many zombies and steps them down before the crowd arrives, not after the frame stutters.
- **Repairs itself:** Every two seconds it looks at every engine: a run of errors, the engine's own check, a heartbeat gone quiet, a self-test that fails. For each problem it tries the fixes that have worked best for that kind of problem on this device (the engine's own repair, help from the other engines, a step down, a fresh start; at most three), then rests the engine for a minute (longer each time) while the others cover for it, and tells everyone who leans on it so they can adapt. It checks itself too: its cost readings and its log.
- **Learns:** On each device: what every engine costs at each of its levels under each load, the levels an engine could not hold (so it stops bouncing between two), which fix clears which kind of problem, and how much to trust each engine (an engine with recent trouble starts a run one step lighter and earns the step back). It also remembers each engine's settled level across launches. All of it stays on the device, is relearned after an engine is updated, and can be wiped with Forget in the engine room.
- **Works with:** With every engine. It keeps the links: who needs whom, who covers for whom, who helps repair whom.
- **Runs on:** The processor. It costs almost nothing.
- **In the engine room:** Nothing: it is the one doing the locking, so it always runs in full.

### PERF: The Governor

*The pragmatist. It cares about one number, the frame rate, and will trade sharpness for it without blinking, but it remembers what each device can really do and starts there next time.*

- **What it does:** Profiles the device at start (processor cores, memory, graphics chip, screen, browser features, a short benchmark), picks a quality tier and a resolution, caps the frame rate, watches battery and heat, and keeps the caches the game builds up (sprites, city blocks, menu pictures) inside a budget.
- **Adapts:** One ladder of eleven rungs from Ultra at full resolution down to Low at half. Once a second it compares real frame times with the target and moves a rung at a time; before dropping a rung it trims the weather or the plants if they are eating the frame, and asks CORE to step down the engine that would save the most. A rung that had to be left soon after climbing to it waits longer before it is tried again. Battery saver and heat cap the ladder.
- **Repairs itself:** Restarts a game loop that stopped, resumes or rebuilds frozen audio, frees memory when the device runs short or the app goes to the background, resets the short-lived effect lists after a storm of errors (and drops to a safe level if storms keep coming). CORE's check catches a sprite cache far over budget or a rung out of range.
- **Learns:** The rung that held for at least 20 seconds on this exact device (the next launch starts there), and when the device starts to run hot: if it had to step down after minutes of a steady level at about the same point in two sessions, it eases off one step just before that point instead of stuttering into it.
- **Works with:** Tells every engine when the quality tier changes, frees memory for the nine engines that keep picture caches, and reports the weather's and the plants' cost to CORE.
- **Runs on:** The processor.
- **In the engine room:** Locked: how hard the whole game runs is Settings > Graphics > Graphics quality.

### WORLD: The Architect

*Patient and exact. The same seed always builds the same city, block for block, on every device in the world, and it builds just ahead of wherever you are heading.*

- **What it does:** Generates the endless city from a seed at real-world scale: districts and biomes, roads and blocks, rivers, ponds and bridges, props, wrecks, street furniture, blood on the asphalt, seasons and snow. Each block is drawn once into a picture and reused.
- **Adapts:** Block pictures follow the quality tier's sharpness. It draws blocks just off screen in the direction the camera is moving, only on frames that have time to spare: since 1.9.991 only when what a block costs here fits the time left in the frame, and two at a time when there is plenty.
- **Repairs itself:** Checks its block cache stays bounded (and trims it if not); a fresh start redraws every block. At start it builds the same far-away block twice from the seed and checks both come out identical, because the city must match for everyone in co-op.
- **Learns:** How long drawing a block takes on this device at each sharpness.
- **Works with:** Gives the water fields, districts and buildings to the lighting, reflection, texture, crowd and bullet engines; covers for the blood engine with plain stains when it rests.
- **Runs on:** The processor (canvas drawing).
- **In the engine room:** Locked: the city must be the same on every device and for everyone in a co-op run.

### FLOW: The Pathfinder

*Single-minded. Every street, wall and river becomes a field of arrows pointing the dead at the nearest living player.*

- **What it does:** Builds flow fields around the players: every open cell knows the cheapest way to the nearest player, with walls, water and corners priced in; separate wider fields for big zombies and for crowds shoving through.
- **Adapts:** How often the paths refresh. On Auto it follows what a field costs on this device: every 0.3 s when fields are cheap and the street is full, up to 0.5 s when they are expensive and the frame is tight. Eco refreshes every 0.55 s, Hard every 0.25 s, Max every 0.18 s. The wide fields are only built while something that big is chasing.
- **Repairs itself:** A heartbeat while zombies are on the street; a check that the paths are never more than 3 seconds old; a fresh start rebuilds all four fields.
- **Learns:** How long a field takes to build here.
- **Works with:** The crowd engine leans on it, and it covers the crowd's movement when the crowd engine rests. In co-op only the host builds paths.
- **Runs on:** The processor (the host's, in co-op).
- **In the engine room:** Effort: how often the zombies' paths refresh.

### NET: The Messenger

*Fair above everything: one game decides, and everyone sees the same street. Since 1.9.991 it also smooths over a shaky link instead of letting the zombies stutter.*

- **What it does:** Wi-Fi co-op for 2 to 4 players: a PC hosts, phones and other PCs join; the host sends the state of the street 15 times a second (zombies, the wave, the clock, the score, teammates) and every player's own hits and hurts; reconnects, revives, markers, ping.
- **Adapts:** On a teammate's screen, each zombie and teammate is drawn a little ahead along the way it was moving, by about as long as the next snapshot takes on this link (never more than 0.16 s), and followed more softly when the link is jittery. Snapshots stay full-rate; only how the joiner's screen shows them changes.
- **Repairs itself:** Reconnects by itself for 25 seconds after a blip and puts you back in the same slot (the host keeps it for 30 seconds); its snapshot clock is checked and reset if it goes bad.
- **Learns:** How often the host's snapshots really arrive on this network, how much that wobbles, and the ping; the next game starts from it.
- **Works with:** Needs the city generator (each device builds the city from the run's seed, so the city never travels over the network).
- **Runs on:** The processor, over WebSockets (the Android app brings its own connection).
- **In the engine room:** Locked: co-op has to run the same on every screen in the game.

### LOADER: The Stagehand

*Only works while the curtain is down, so nothing stutters when it rises.*

- **What it does:** The loading screens and the warm-up behind them: the streets around you, the lights, the sprites, the plants and the zombies of the first waves are built before play instead of on the fly.
- **Adapts:** Spreads its work over many small jobs so the bar keeps moving and the screen never freezes.
- **Repairs itself:** A step that waits on something that never comes is let go after 12 seconds; a loading screen stuck for 45 seconds is taken down by the watchdog.
- **Learns:** How long each loading step takes on this device, so the screen can say about how long is left.
- **Works with:** Warms the lighting engine, the textures, the plants, and the zombies this device meets most (from the roster engine).
- **Runs on:** The processor.
- **In the engine room:** Locked: it never runs during play.

### WX: The Weatherman

*Moody on purpose. Rain, ash, blizzards and sandstorms roll through by season and district, and the street feels them.*

- **What it does:** Rain, thunderstorms with lightning, fog, snow and blizzards, sandstorms, ashfall, wind and gusts, seasons (leaves in the gutters in fall, blossom in spring), fireflies, breath in the cold, puddle rings and cloud shadows.
- **Adapts:** A density ladder from a quarter to full, shared with the governor; weather that fills the whole screen (fog, storm darkness, blowing sand) is trimmed before the resolution drops.
- **Repairs itself:** Checks that its drifting debris never piles up or loses its place and that the street's wetness stays in range; a fresh start clears the debris and the storms.
- **Learns:** What each kind of weather costs at full density on this device; when the next weather is chosen and it will not fit, it starts thinner instead of building up and being cut back.
- **Works with:** Gives wetness to the reflections and the lighting (beams in the rain), wind to the smoke, and the season to the city and the plants.
- **Runs on:** The processor.
- **In the engine room:** Effort: how much weather is drawn.

### LIFE: The Gardener

*Keeps the dead city breathing: things that sway, flutter, burn and go off.*

- **What it does:** Trees, grass and bushes that sway in the wind and shake when something brushes them, birds that scatter, props you can kick, explosive barrels, fires and car alarms.
- **Adapts:** Plant detail follows the quality tier; when the frame runs late the plants go one step stiller (the same switch the governor uses).
- **Repairs itself:** Checks the moving plants stay bounded and the birds keep their places; rebuilds the set of moving things around you.
- **Learns:** What the plants cost by how many are moving.
- **Works with:** Feeds fires and burning props to the lighting engine.
- **Runs on:** The processor.
- **In the engine room:** Effort: how much the plants move.

### SFX: The Foley Artist

*Never plays a recording: every gunshot, impact and scream is synthesized the moment it happens.*

- **What it does:** Live synthesized sound for every gun, impact, kill chain, zombie and ambience, with echoes that change by district, and the wave clock's ticks.
- **Adapts:** Quality low, medium or high, from the device's tier.
- **Repairs itself:** Its audio clock is checked every 2 seconds: resumed when the device suspends it (a call, a Bluetooth switch, the app going to the background), rebuilt when it freezes or closes.
- **Learns:** How often it falls behind at each quality on this device; if it keeps falling behind it settles one quality lower for good, and steps back up after a long calm.
- **Works with:** Plays alongside the radio on its own bus, so heavy fights never cut the music.
- **Runs on:** Web Audio.
- **In the engine room:** Effort: sound quality.

### RADIO: The DJ

*FM 66.6 never stops for anything. It writes its own songs and keeps the next minute ready.*

- **What it does:** Writes and renders its own songs ahead of time on a separate audio thread: 7 channels (synthwave, heavy metal, industrial, orchestral, lo-fi, drum and bass, chiptune) of 35 songs each, or your own music.
- **Adapts:** The first chunk of a song is short so it starts quickly; chunks stay short while little is buffered.
- **Repairs itself:** Its own audio clock is checked every 2 seconds and rebuilt if it freezes; a render that never finishes is dropped and tried again.
- **Learns:** How fast this device renders music; on a slow device it keeps more ready ahead (up to 48 seconds instead of 24) so the music never skips.
- **Works with:** Apart from the game, on purpose, so the frame and the music never compete.
- **Runs on:** Offline audio rendering on its own audio thread.
- **In the engine room:** Locked: it never competes with the frame.

### MUTAGEN: The Curator

*Keeps the catalogue of the dead: who each zombie was, how it looks, how it moves and what it does.*

- **What it does:** Builds the 2.0 roster at start (the first 50 regular zombies, each with its own name, look, build, walk, behaviour, strength and how bullets treat it) and keeps the 1,000 old mutations resting until they are rebuilt.
- **Adapts:** Nothing to adapt: it builds once.
- **Repairs itself:** Checks every zombie is whole (its numbers, its place in every list, its rig) and rebuilds a broken one from its definition; a self-test at start checks all 50.
- **Learns:** Which zombies this device meets most, so the loading screen warms their animation frames first. What a zombie is and does never changes with what is learned.
- **Works with:** Hands every zombie to the rig and animation engine, the blood engine, the glow engine and the crowd.
- **Runs on:** The processor.
- **In the engine room:** Locked: every zombie is built the same on every device.

### BOSS: The Showrunner

*Waiting in the wings. The bosses rest until they are rebuilt for 2.0.*

- **What it does:** 50 bosses with attack patterns that mutate into new forms mid-fight, plus the Snatcher and the Overlord.
- **Adapts:** Not yet.
- **Repairs itself:** Ready for their return: a check that a boss on the street keeps its health and its place, a repair that puts it back on its feet, and a self-test at start that every boss and form only uses moves the engine knows.
- **Learns:** Nothing: how a boss fights will never change with what a device learns.
- **Works with:** With the bullets, the blood, the glow and the crowd, once the bosses are back.
- **Runs on:** The processor.
- **In the engine room:** Locked until the bosses are rebuilt.

### ACCOUNT: The Vault

*Trusts no one with your progress, including the server it stores it on.*

- **What it does:** Free DeclAIre accounts and cloud saves: each save is encrypted on the device (AES-GCM, with a key wrapped by your password through PBKDF2) and merged across your devices; the global board.
- **Adapts:** Nothing to adapt.
- **Repairs itself:** A cloud save or a board score that cannot reach the cloud waits and goes up by itself: after 30 seconds, then 1, 2 and 5 minutes, and straight away when the device comes back online (a score from last month is dropped). A self-test at start checks a save comes back exactly the same and refuses to open for the wrong owner.
- **Learns:** How long the cloud takes to answer from this device.
- **Works with:** With the name filter (every name it stores or shows is checked).
- **Runs on:** The processor (the browser's built-in encryption).
- **In the engine room:** Locked: keeping your progress safe always runs in full.

### FILTER: The Bouncer

*Polite, firm and not easily fooled: it has a joke for the 50th try, but nothing gets in.*

- **What it does:** Checks every name a player types or sees (callsigns, account names, co-op names, the global board): slurs, swearing and threats even when hidden with numbers, symbols, spaces or dots; personal details (emails, phone numbers, links); names posing as the studio.
- **Adapts:** Nothing to adapt.
- **Repairs itself:** A self-test at start (listed words caught, the same words hidden with numbers or split with dots caught, ordinary names let through, personal details and studio names caught) that only ever reports counts, never the words; its lists are reloaded if they go missing.
- **Learns:** Nothing, on purpose: it has to treat every name the same way on every device.
- **Works with:** With the account engine and co-op.
- **Runs on:** The processor.
- **In the engine room:** Locked: it is never made lighter.

### LUX: The Lamplighter

*Obsessed with shadows. Every lamp, fire, muzzle flash and headlight casts them, and the sun moves across the sky.*

- **What it does:** Ray-traced shadows from every light, lamps at real heights (cars, trees, bodies throw shadows away from them), zombie shadows shaped by their pose, a moving sun as an area light, light beams in rain and fog, path-traced bounce light, bloom.
- **Adapts:** Five levels from glow only to full; it steps itself down when it goes over its share of the frame and the frame is slow, and back up after 12 good seconds if CORE agrees the next level fits.
- **Repairs itself:** Drops a level after a few errors and pauses itself for a minute after a burst; a heartbeat (CORE restarts it if it stops drawing while it should), checks on its level and its light map, a fresh start that rebuilds and re-warms it, and a self-test of its quality table.
- **Learns:** What each level costs on this device by how many lights are on screen.
- **Works with:** Covers for the shader engine (bloom on the processor) and the glow engine when they rest; the vehicles, the muzzle flashes, the glowing zombies, fires and the weather all feed it lights.
- **Runs on:** The processor; its bounce light runs on the graphics chip through the shader engine.
- **In the engine room:** Effort, and bounce light on the CPU or GPU.

### PRISM: The Lens

*The finisher. Every frame passes through it last, and it decides how the whole picture feels.*

- **What it does:** GPU shaders (WebGL 2 or 1) with a processor fallback: path-traced bounce light, bloom, light shafts, heat haze, sharpening and upscaling, colour temperature and grading, vignette and film grain, and relief and highlights from the nearest lamps on every surface.
- **Adapts:** Four levels; steps down when the graphics chip is the bottleneck and back up when there is room; runs on the processor on devices without a usable graphics chip.
- **Repairs itself:** Rebuilds its shaders after errors, rebuilds everything when the graphics chip comes back after losing its context, runs on the processor for a minute after repeated GPU errors; a heartbeat on the GPU path and a check for a lost context.
- **Learns:** How reliable this device's graphics chip is: after 3 lost contexts in recent sessions, Auto keeps the shaders on the processor for a while instead of stuttering through rebuilds, and calm sessions win the GPU back. Also what each level costs by screen size.
- **Works with:** Draws the reflection engine's reflections and the lighting engine's bounce light on the GPU.
- **Runs on:** The graphics chip (WebGL 2 or 1) or the processor.
- **In the engine room:** Effort, and CPU or GPU (the same as Settings > Graphics > Shader engine).

### TEXEL: The Painter

*Never satisfied with flat colour: grime, cloth, skin and asphalt, all painted by hand, by code.*

- **What it does:** Procedural textures for the zombies, the player and the city; blended ground materials with soft edges and districts that bleed into each other; sprites supersampled to the screen's exact sharpness.
- **Adapts:** Four levels; steps down when making sprites costs more than a frame each second, and back up after a long calm if CORE agrees.
- **Repairs itself:** Repairs its own memory, checks its sprite cache never overflows (and trims it), a fresh start clears every cache.
- **Learns:** What each level costs by how many new sprites it has to make each second.
- **Works with:** Paints for the rig and animation engine, the crowd and the city.
- **Runs on:** The processor.
- **In the engine room:** Effort: texture sharpness.

### MIRROR: The Still Water

*Quiet and reflective, literally. It makes a rainy street look wet.*

- **What it does:** Reflections on rivers, ponds, puddles, rain-soaked streets, ice, car glass and paint and fresh blood: the sky, the lamps, fires and headlights, rippled by waves and rain, with sun glitter on open water.
- **Adapts:** Three levels (off, sky and lights, full). Since 1.9.991 CORE climbs it back up when there is room (before, a step down lasted until the next run).
- **Repairs itself:** Steps down after errors; checks its level and its reflection map; a fresh start rebuilds the map.
- **Learns:** What each level costs by how wet the street is.
- **Works with:** Needs the lighting and shader engines; reads the city's water, the weather's wetness, the vehicles' glass and the blood engine's fresh pools.
- **Runs on:** The graphics chip through the shader engine, or the processor.
- **In the engine room:** Effort, and CPU or GPU.

### GORE: The Coroner

*Meticulous about what every wound looks like, and tidy: it cleans up what nobody can see.*

- **What it does:** Blood for every zombie type (glowing for the toxic, radioactive, molten, void, electric and spectral ones), a reaction to every gun on every zombie (holes, exit wounds, burns, frost, scorches), sprays in the direction of the shot, pools that dry, bloody footprints; blood fades after a while and clears once no player can see it.
- **Adapts:** A level and a detail setting: its own watch steps the detail, CORE steps the level, and since 1.9.991 CORE climbs the level back when there is room.
- **Repairs itself:** Throws out stains with bad data before they are drawn, steps down after errors, a fresh start clears every piece.
- **Learns:** What it costs by how many stains are on the street; CORE looks ahead with it when a horde is coming.
- **Works with:** Needs the lighting and reflection engines; the city generator covers for it with plain stains.
- **Runs on:** The processor.
- **In the engine room:** Effort: blood detail.

### MUZZLE: The Pyrotechnician

*Every gun gets its own fire, and it leaves the brass where it falls.*

- **What it does:** A different flash for every gun (star, fireball, flash-hider fan, shotgun bloom, sniper brake jets, launcher back-blast), tinted by the modification, with sparks, drifting smoke, ejected brass and shells, and a light that casts shadows.
- **Adapts:** Since 1.9.991 a ladder of its own (full, about two thirds, under half the smoke and brass) that CORE steps when the frame runs late and climbs back when there is room.
- **Repairs itself:** Checks its smoke and brass never pile up or lose their place; a fresh start clears them.
- **Learns:** What it costs by how much smoke and brass is on the street.
- **Works with:** Needs the lighting engine for its flash light; CORE covers for it with plain flashes when it rests.
- **Runs on:** The processor.
- **In the engine room:** Effort: how much smoke and brass.

### GARAGE: The Mechanic

*Keeps the abandoned cars of the city in working order, at least the lights.*

- **What it does:** 22 kinds of vehicle with liveries, burned and rolled wrecks, working headlights, hazards and light bars, reflective glass, rare crashed airliners, planes and helicopters.
- **Adapts:** Since 1.9.991 a headlight ladder: at night with many lit cars in view and the frame running late, the beams' shadows and the tail glow are dropped, and CORE climbs it back when there is room.
- **Repairs itself:** Checks every vehicle the crowd has moved keeps its place, and puts it back if not.
- **Learns:** What its lights cost by how many lit cars are in view.
- **Works with:** Feeds headlights to the lighting engine and glass to the reflection engine; the crowd engine pushes its vehicles.
- **Runs on:** The processor.
- **In the engine room:** Effort: headlight shadows.

### SKYWAY: The Overpass

*Built once and built to last: the highways are part of the city's picture.*

- **What it does:** Elevated highways on concrete piers through every district, interchanges of loops and flyovers, abandoned traffic and collapsed spans, deck shadows, fading when you walk underneath.
- **Adapts:** Nothing to adapt: the highways are baked into each block's picture when the block is made.
- **Repairs itself:** Checks its map of highway lines stays a sensible size and its readings stay sound.
- **Learns:** What drawing the decks costs by how many are in view.
- **Works with:** Needs the city generator and the lighting engine.
- **Runs on:** The processor.
- **In the engine room:** Locked: almost no cost each frame.

### TRACER: The Streak

*Fast and flashy, but it knows when to calm down.*

- **What it does:** Every round drawn in its gun's style: a white-hot head, a motion-blurred streak and a glow (machine gun tracers, the sniper's vapour trail and heat shimmer, shotgun pellets, smoking grenades, living flames), tinted by its modification, with sparks where it hits.
- **Adapts:** Its detail steps down when it takes too much of the frame and back up when there is room, if CORE agrees.
- **Repairs itself:** A part that keeps failing rests on its own while the rest keeps drawing; a fresh start clears its trails; CORE covers for it with plain tracers.
- **Learns:** What it costs by how many rounds are in flight.
- **Works with:** Needs the lighting and shader engines.
- **Runs on:** The processor.
- **In the engine room:** Effort: how much of every round is drawn.

### AURA: The Will-o'-the-Wisp

*Turns the strangest zombies into lanterns.*

- **What it does:** Toxic, molten, void, electric, radioactive, icy and spectral zombies, burning zombies and bosses become real light sources: their glow lights the street and casts shadows; eyes glow at night; a last flare when they die.
- **Adapts:** Its detail steps down when it takes too much of the frame and back up when there is room, if CORE agrees.
- **Repairs itself:** Parts rest on their own after errors; checks on its detail and its counts; a fresh start.
- **Learns:** What it costs by how many glowing zombies are on screen; CORE looks ahead with it when a horde is coming.
- **Works with:** Needs the lighting and blood engines; the lighting engine covers for it when it rests.
- **Runs on:** The processor.
- **In the engine room:** Effort: how many glowing zombies are lit and shadowed.

### SWARM: The Hive Mind

*Hundreds of bodies, one intention. It knows a crowd is more than many zombies.*

- **What it does:** Hordes and droves of hundreds that gather out of sight, march at one pace and surge when they see you; zombies moving the same way fall in step; bodies push by weight, and crowds push vehicles with real physics (only when 30 or more are after a player within 18 m and the vehicle stands within 9 m of that player); hordes spread to surround you and come to gunfire; levels of detail so 500 and more fit on screen.
- **Adapts:** Crowd detail and how many can be alive at once, stepped by its own watch; since 1.9.991 CORE also steps it down before a horde arrives when the learned costs say the frame will not hold it.
- **Repairs itself:** A heartbeat while zombies are on the street, its own checks and repairs, a fresh start that resets its caps; the pathfinding engine covers for its movement when it rests.
- **Learns:** What the crowd costs by how many zombies are alive, which is what lets CORE look ahead.
- **Works with:** Needs the pathfinding, governor and texture engines; pushes the vehicle engine's cars.
- **Runs on:** The processor.
- **In the engine room:** Effort: how much of the crowd is drawn in full detail.

### ANIMA: The Puppeteer

*Gives each of the dead its own way of moving: 2,500 animations, and not one of them shared.*

- **What it does:** Every 2.0 zombie is a jointed body seen from above with 50 animations of its own (10 ways of moving, 8 idles, 10 attacks, 8 hit reactions, 8 deaths, 6 specials), cross-fades that keep the feet in step, hit reactions layered on top, deaths from whatever pose it was in, bodies that stay a while; live joints near you, cached frames for the crowd, shadows shaped by each pose.
- **Adapts:** How many zombies get live joints (the rest use cached frames), stepped down when it takes too much of the frame and back up if CORE agrees.
- **Repairs itself:** Finds and resets broken poses and lost bodies; a self-test at start runs a handful of zombies through attacks, hit reactions and deaths and checks every joint comes out sound.
- **Learns:** What it costs by how many zombies it animates.
- **Works with:** Needs the texture engine and the governor; draws inside the crowd engine.
- **Runs on:** The processor.
- **In the engine room:** Effort: how many zombies get live joints.

### BALLISTICS: The Physicist

*Deals only in real numbers: muzzle velocity, mass, drag. It decides who lives, so it never takes shortcuts.*

- **What it does:** Real gun and bullet physics: real muzzle velocities and bullet masses (9 mm, .357, 5.56, 7.62, buckshot), energy, drag and penetration, swept rays that find the first wall and every zombie before it, ricochets, rounds slowed by car bodies, recoil; hit regions with real odds (head shots all but always kill, body shots usually do, limbs cripple); armour, helmets and shields.
- **Adapts:** Never: how bullets fly has to be the same everywhere.
- **Repairs itself:** Throws out a round that loses its place and keeps rounds from piling up; a self-test at start checks its rounds against real ones (a 9 mm near 500 joules, a 5.56 near 1,750, a 7.62 near 3,500).
- **Learns:** Nothing, on purpose: it has to work the same on every device and for everyone in co-op.
- **Works with:** Needs the city generator for walls and cars.
- **Runs on:** The processor.
- **In the engine room:** Locked: it decides who lives.
