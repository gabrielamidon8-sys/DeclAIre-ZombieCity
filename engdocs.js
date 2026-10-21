/* ================= the engines, characterized =================
   Who each engine is, what it does, how it adapts, how it repairs itself, what it learns, who it works with, where
   it runs and what you can tune in the engine room. The engine room shows this under "About", and the engines
   document is written from it (tools/engdocs.js). A new engine brings its own entry through coreDefine({ docs }). */
const ENG_DOCS = {
  CORE: {
    title: 'The Conductor',
    character: 'The calm one in the middle. It never draws a pixel: it listens to every engine every second, keeps the books on the frame, and decides who steps back when time runs short. Since v3 it remembers what works on each device, what has failed there, and which engines it can trust.',
    does: 'The hub every engine plugs into: one shared frame (the view, the camera, the sun, the brightest lights), one time budget, a message bus for events (a new run, a kill, a horde, memory running short), a capability registry so engines ask for "light" or "crowd" instead of for each other by name, and the watchdog that keeps them all sound. It also runs the engine room\'s tuning and locks.',
    adapts: 'Runs the time budget. When the frame runs late it steps down the engine whose step down saves the most on this device (Eco engines first, Hard engines last, Max never on its own). It climbs engines back up when the frame has room and what it learned says the next level fits. When a horde sets off or a wave starts it looks at what the engines cost with that many zombies and steps them down before the crowd arrives, not after the frame stutters.',
    repairs: 'Every two seconds it looks at every engine: a run of errors, the engine\'s own check, a heartbeat gone quiet, a self-test that fails. For each problem it tries the fixes that have worked best for that kind of problem on this device (the engine\'s own repair, help from the other engines, a step down, a fresh start; at most three), then rests the engine for a minute (longer each time) while the others cover for it, and tells everyone who leans on it so they can adapt. It checks itself too: its cost readings and its log.',
    learns: 'On each device: what every engine costs at each of its levels under each load, the levels an engine could not hold (so it stops bouncing between two), which fix clears which kind of problem, and how much to trust each engine (an engine with recent trouble starts a run one step lighter and earns the step back). It also remembers each engine\'s settled level across launches. All of it stays on the device, is relearned after an engine is updated, and can be wiped with Forget in the engine room.',
    works: 'With every engine. It keeps the links: who needs whom, who covers for whom, who helps repair whom.',
    runs: 'The processor. It costs almost nothing.',
    tune: 'Nothing: it is the one doing the locking, so it always runs in full.'
  },
  PERF: {
    title: 'The Governor',
    character: 'The pragmatist. It cares about one number, the frame rate, and will trade sharpness for it without blinking, but it remembers what each device can really do and starts there next time.',
    does: 'Profiles the device at start (processor cores, memory, graphics chip, screen, browser features, a short benchmark), picks a quality tier and a resolution, caps the frame rate, watches battery and heat, and keeps the caches the game builds up (sprites, city blocks, menu pictures) inside a budget.',
    adapts: 'One ladder of eleven rungs from Ultra at full resolution down to Low at half. Once a second it compares real frame times with the target and moves a rung at a time; before dropping a rung it trims the weather or the plants if they are eating the frame, and asks CORE to step down the engine that would save the most. A rung that had to be left soon after climbing to it waits longer before it is tried again. Battery saver and heat cap the ladder.',
    repairs: 'Restarts a game loop that stopped, resumes or rebuilds frozen audio, frees memory when the device runs short or the app goes to the background, resets the short-lived effect lists after a storm of errors (and drops to a safe level if storms keep coming). CORE\'s check catches a sprite cache far over budget or a rung out of range.',
    learns: 'The rung that held for at least 20 seconds on this exact device (the next launch starts there), and when the device starts to run hot: if it had to step down after minutes of a steady level at about the same point in two sessions, it eases off one step just before that point instead of stuttering into it.',
    works: 'Tells every engine when the quality tier changes, frees memory for the nine engines that keep picture caches, and reports the weather\'s and the plants\' cost to CORE.',
    runs: 'The processor.',
    tune: 'Locked: how hard the whole game runs is Settings > Graphics > Graphics quality.'
  },
  WORLD: {
    title: 'The Architect',
    character: 'Patient and exact. The same seed always builds the same city, block for block, on every device in the world, and it builds just ahead of wherever you are heading.',
    does: 'Generates the endless city from a seed at real-world scale: districts and biomes, roads and blocks, rivers, ponds and bridges, props, wrecks, street furniture, blood on the asphalt, seasons and snow. Each block is drawn once into a picture and reused.',
    adapts: 'Block pictures follow the quality tier\'s sharpness. It draws blocks just off screen in the direction the camera is moving, only on frames that have time to spare: since 1.9.991 only when what a block costs here fits the time left in the frame, and two at a time when there is plenty.',
    repairs: 'Checks its block cache stays bounded (and trims it if not); a fresh start redraws every block. At start it builds the same far-away block twice from the seed and checks both come out identical, because the city must match for everyone in co-op.',
    learns: 'How long drawing a block takes on this device at each sharpness.',
    works: 'Gives the water fields, districts and buildings to the lighting, reflection, texture, crowd and bullet engines; covers for the blood engine with plain stains when it rests.',
    runs: 'The processor (canvas drawing).',
    tune: 'Locked: the city must be the same on every device and for everyone in a co-op run.'
  },
  FLOW: {
    title: 'The Pathfinder',
    character: 'Single-minded. Every street, wall and river becomes a field of arrows pointing the dead at the nearest living player.',
    does: 'Builds flow fields around the players: every open cell knows the cheapest way to the nearest player, with walls, water and corners priced in; separate wider fields for big zombies and for crowds shoving through.',
    adapts: 'How often the paths refresh. On Auto it follows what a field costs on this device: every 0.3 s when fields are cheap and the street is full, up to 0.5 s when they are expensive and the frame is tight. Eco refreshes every 0.55 s, Hard every 0.25 s, Max every 0.18 s. The wide fields are only built while something that big is chasing.',
    repairs: 'A heartbeat while zombies are on the street; a check that the paths are never more than 3 seconds old; a fresh start rebuilds all four fields.',
    learns: 'How long a field takes to build here.',
    works: 'The crowd engine leans on it, and it covers the crowd\'s movement when the crowd engine rests. In co-op only the host builds paths.',
    runs: 'The processor (the host\'s, in co-op).',
    tune: 'Effort: how often the zombies\' paths refresh.'
  },
  NET: {
    title: 'The Messenger',
    character: 'Fair above everything: one game decides, and everyone sees the same street. Since 1.9.991 it also smooths over a shaky link instead of letting the zombies stutter.',
    does: 'Wi-Fi co-op for 2 to 4 players: a PC hosts, phones and other PCs join; the host sends the state of the street 15 times a second (zombies, the wave, the clock, the score, teammates) and every player\'s own hits and hurts; reconnects, revives, markers, ping.',
    adapts: 'On a teammate\'s screen, each zombie and teammate is drawn a little ahead along the way it was moving, by about as long as the next snapshot takes on this link (never more than 0.16 s), and followed more softly when the link is jittery. Snapshots stay full-rate; only how the joiner\'s screen shows them changes.',
    repairs: 'Reconnects by itself for 25 seconds after a blip and puts you back in the same slot (the host keeps it for 30 seconds); its snapshot clock is checked and reset if it goes bad.',
    learns: 'How often the host\'s snapshots really arrive on this network, how much that wobbles, and the ping; the next game starts from it.',
    works: 'Needs the city generator (each device builds the city from the run\'s seed, so the city never travels over the network).',
    runs: 'The processor, over WebSockets (the Android app brings its own connection).',
    tune: 'Locked: co-op has to run the same on every screen in the game.'
  },
  LOADER: {
    title: 'The Stagehand',
    character: 'Only works while the curtain is down, so nothing stutters when it rises.',
    does: 'The loading screens and the warm-up behind them: the streets around you, the lights, the sprites, the plants and the zombies of the first waves are built before play instead of on the fly.',
    adapts: 'Spreads its work over many small jobs so the bar keeps moving and the screen never freezes.',
    repairs: 'A step that waits on something that never comes is let go after 12 seconds; a loading screen stuck for 45 seconds is taken down by the watchdog.',
    learns: 'How long each loading step takes on this device, so the screen can say about how long is left.',
    works: 'Warms the lighting engine, the textures, the plants, and the zombies this device meets most (from the roster engine).',
    runs: 'The processor.',
    tune: 'Locked: it never runs during play.'
  },
  WX: {
    title: 'The Weatherman',
    character: 'Moody on purpose. Rain, ash, blizzards and sandstorms roll through by season and district, and the street feels them.',
    does: 'Rain, thunderstorms with lightning, fog, snow and blizzards, sandstorms, ashfall, wind and gusts, seasons (leaves in the gutters in fall, blossom in spring), fireflies, breath in the cold, puddle rings and cloud shadows.',
    adapts: 'A density ladder from a quarter to full, shared with the governor; weather that fills the whole screen (fog, storm darkness, blowing sand) is trimmed before the resolution drops.',
    repairs: 'Checks that its drifting debris never piles up or loses its place and that the street\'s wetness stays in range; a fresh start clears the debris and the storms.',
    learns: 'What each kind of weather costs at full density on this device; when the next weather is chosen and it will not fit, it starts thinner instead of building up and being cut back.',
    works: 'Gives wetness to the reflections and the lighting (beams in the rain), wind to the smoke, and the season to the city and the plants.',
    runs: 'The processor.',
    tune: 'Effort: how much weather is drawn.'
  },
  LIFE: {
    title: 'The Gardener',
    character: 'Keeps the dead city breathing: things that sway, flutter, burn and go off.',
    does: 'Trees, grass and bushes that sway in the wind and shake when something brushes them, birds that scatter, props you can kick, explosive barrels, fires and car alarms.',
    adapts: 'Plant detail follows the quality tier; when the frame runs late the plants go one step stiller (the same switch the governor uses).',
    repairs: 'Checks the moving plants stay bounded and the birds keep their places; rebuilds the set of moving things around you.',
    learns: 'What the plants cost by how many are moving.',
    works: 'Feeds fires and burning props to the lighting engine.',
    runs: 'The processor.',
    tune: 'Effort: how much the plants move.'
  },
  SFX: {
    title: 'The Foley Artist',
    character: 'Never plays a recording: every gunshot, impact and scream is synthesized the moment it happens.',
    does: 'Live synthesized sound for every gun, impact, kill chain, zombie and ambience, with echoes that change by district, and the wave clock\'s ticks.',
    adapts: 'Quality low, medium or high, from the device\'s tier.',
    repairs: 'Its audio clock is checked every 2 seconds: resumed when the device suspends it (a call, a Bluetooth switch, the app going to the background), rebuilt when it freezes or closes.',
    learns: 'How often it falls behind at each quality on this device; if it keeps falling behind it settles one quality lower for good, and steps back up after a long calm.',
    works: 'Plays alongside the radio on its own bus, so heavy fights never cut the music.',
    runs: 'Web Audio.',
    tune: 'Effort: sound quality.'
  },
  RADIO: {
    title: 'The DJ',
    character: 'FM 66.6 never stops for anything. It writes its own songs and keeps the next minute ready.',
    does: 'Writes and renders its own songs ahead of time on a separate audio thread: 7 channels (synthwave, heavy metal, industrial, orchestral, lo-fi, drum and bass, chiptune) of 35 songs each, or your own music.',
    adapts: 'The first chunk of a song is short so it starts quickly; chunks stay short while little is buffered.',
    repairs: 'Its own audio clock is checked every 2 seconds and rebuilt if it freezes; a render that never finishes is dropped and tried again.',
    learns: 'How fast this device renders music; on a slow device it keeps more ready ahead (up to 48 seconds instead of 24) so the music never skips.',
    works: 'Apart from the game, on purpose, so the frame and the music never compete.',
    runs: 'Offline audio rendering on its own audio thread.',
    tune: 'Locked: it never competes with the frame.'
  },
  MUTAGEN: {
    title: 'The Curator',
    character: 'Keeps the catalogue of the dead: who each zombie was, how it looks, how it moves and what it does.',
    does: 'Builds the 2.0 roster at start (the first 50 regular zombies, each with its own name, look, build, walk, behaviour, strength and how bullets treat it) and keeps the 1,000 old mutations resting until they are rebuilt.',
    adapts: 'Nothing to adapt: it builds once.',
    repairs: 'Checks every zombie is whole (its numbers, its place in every list, its rig) and rebuilds a broken one from its definition; a self-test at start checks all 50.',
    learns: 'Which zombies this device meets most, so the loading screen warms their animation frames first. What a zombie is and does never changes with what is learned.',
    works: 'Hands every zombie to the rig and animation engine, the blood engine, the glow engine and the crowd.',
    runs: 'The processor.',
    tune: 'Locked: every zombie is built the same on every device.'
  },
  BOSS: {
    title: 'The Showrunner',
    character: 'Waiting in the wings. The bosses rest until they are rebuilt for 2.0.',
    does: '50 bosses with attack patterns that mutate into new forms mid-fight, plus the Snatcher and the Overlord.',
    adapts: 'Not yet.',
    repairs: 'Ready for their return: a check that a boss on the street keeps its health and its place, a repair that puts it back on its feet, and a self-test at start that every boss and form only uses moves the engine knows.',
    learns: 'Nothing: how a boss fights will never change with what a device learns.',
    works: 'With the bullets, the blood, the glow and the crowd, once the bosses are back.',
    runs: 'The processor.',
    tune: 'Locked until the bosses are rebuilt.'
  },
  ACCOUNT: {
    title: 'The Vault',
    character: 'Trusts no one with your progress, including the server it stores it on.',
    does: 'Free DeclAIre accounts and cloud saves: each save is encrypted on the device (AES-GCM, with a key wrapped by your password through PBKDF2) and merged across your devices; the global board.',
    adapts: 'Nothing to adapt.',
    repairs: 'A cloud save or a board score that cannot reach the cloud waits and goes up by itself: after 30 seconds, then 1, 2 and 5 minutes, and straight away when the device comes back online (a score from last month is dropped). A self-test at start checks a save comes back exactly the same and refuses to open for the wrong owner.',
    learns: 'How long the cloud takes to answer from this device.',
    works: 'With the name filter (every name it stores or shows is checked).',
    runs: 'The processor (the browser\'s built-in encryption).',
    tune: 'Locked: keeping your progress safe always runs in full.'
  },
  FILTER: {
    title: 'The Bouncer',
    character: 'Polite, firm and not easily fooled: it has a joke for the 50th try, but nothing gets in.',
    does: 'Checks every name a player types or sees (callsigns, account names, co-op names, the global board): slurs, swearing and threats even when hidden with numbers, symbols, spaces or dots; personal details (emails, phone numbers, links); names posing as the studio.',
    adapts: 'Nothing to adapt.',
    repairs: 'A self-test at start (listed words caught, the same words hidden with numbers or split with dots caught, ordinary names let through, personal details and studio names caught) that only ever reports counts, never the words; its lists are reloaded if they go missing.',
    learns: 'Nothing, on purpose: it has to treat every name the same way on every device.',
    works: 'With the account engine and co-op.',
    runs: 'The processor.',
    tune: 'Locked: it is never made lighter.'
  },
  LUX: {
    title: 'The Lamplighter',
    character: 'Obsessed with shadows. Every lamp, fire, muzzle flash and headlight casts them, and the sun moves across the sky.',
    does: 'Ray-traced shadows from every light, lamps at real heights (cars, trees, bodies throw shadows away from them), zombie shadows shaped by their pose, a moving sun as an area light, light beams in rain and fog, path-traced bounce light, bloom.',
    adapts: 'Five levels from glow only to full; it steps itself down when it goes over its share of the frame and the frame is slow, and back up after 12 good seconds if CORE agrees the next level fits.',
    repairs: 'Drops a level after a few errors and pauses itself for a minute after a burst; a heartbeat (CORE restarts it if it stops drawing while it should), checks on its level and its light map, a fresh start that rebuilds and re-warms it, and a self-test of its quality table.',
    learns: 'What each level costs on this device by how many lights are on screen.',
    works: 'Covers for the shader engine (bloom on the processor) and the glow engine when they rest; the vehicles, the muzzle flashes, the glowing zombies, fires and the weather all feed it lights.',
    runs: 'The processor; its bounce light runs on the graphics chip through the shader engine.',
    tune: 'Effort, and bounce light on the CPU or GPU.'
  },
  PRISM: {
    title: 'The Lens',
    character: 'The finisher. Every frame passes through it last, and it decides how the whole picture feels.',
    does: 'GPU shaders (WebGL 2 or 1) with a processor fallback: path-traced bounce light, bloom, light shafts, heat haze, sharpening and upscaling, colour temperature and grading, vignette and film grain, and relief and highlights from the nearest lamps on every surface.',
    adapts: 'Four levels; steps down when the graphics chip is the bottleneck and back up when there is room; runs on the processor on devices without a usable graphics chip.',
    repairs: 'Rebuilds its shaders after errors, rebuilds everything when the graphics chip comes back after losing its context, runs on the processor for a minute after repeated GPU errors; a heartbeat on the GPU path and a check for a lost context.',
    learns: 'How reliable this device\'s graphics chip is: after 3 lost contexts in recent sessions, Auto keeps the shaders on the processor for a while instead of stuttering through rebuilds, and calm sessions win the GPU back. Also what each level costs by screen size.',
    works: 'Draws the reflection engine\'s reflections and the lighting engine\'s bounce light on the GPU.',
    runs: 'The graphics chip (WebGL 2 or 1) or the processor.',
    tune: 'Effort, and CPU or GPU (the same as Settings > Graphics > Shader engine).'
  },
  TEXEL: {
    title: 'The Painter',
    character: 'Never satisfied with flat colour: grime, cloth, skin and asphalt, all painted by hand, by code.',
    does: 'Procedural textures for the zombies, the player and the city; blended ground materials with soft edges and districts that bleed into each other; sprites supersampled to the screen\'s exact sharpness.',
    adapts: 'Four levels; steps down when making sprites costs more than a frame each second, and back up after a long calm if CORE agrees.',
    repairs: 'Repairs its own memory, checks its sprite cache never overflows (and trims it), a fresh start clears every cache.',
    learns: 'What each level costs by how many new sprites it has to make each second.',
    works: 'Paints for the rig and animation engine, the crowd and the city.',
    runs: 'The processor.',
    tune: 'Effort: texture sharpness.'
  },
  MIRROR: {
    title: 'The Still Water',
    character: 'Quiet and reflective, literally. It makes a rainy street look wet.',
    does: 'Reflections on rivers, ponds, puddles, rain-soaked streets, ice, car glass and paint and fresh blood: the sky, the lamps, fires and headlights, rippled by waves and rain, with sun glitter on open water.',
    adapts: 'Three levels (off, sky and lights, full). Since 1.9.991 CORE climbs it back up when there is room (before, a step down lasted until the next run).',
    repairs: 'Steps down after errors; checks its level and its reflection map; a fresh start rebuilds the map.',
    learns: 'What each level costs by how wet the street is.',
    works: 'Needs the lighting and shader engines; reads the city\'s water, the weather\'s wetness, the vehicles\' glass and the blood engine\'s fresh pools.',
    runs: 'The graphics chip through the shader engine, or the processor.',
    tune: 'Effort, and CPU or GPU.'
  },
  GORE: {
    title: 'The Coroner',
    character: 'Meticulous about what every wound looks like, and tidy: it cleans up what nobody can see.',
    does: 'Blood for every zombie type (glowing for the toxic, radioactive, molten, void, electric and spectral ones), a reaction to every gun on every zombie (holes, exit wounds, burns, frost, scorches), sprays in the direction of the shot, pools that dry, bloody footprints; blood fades after a while and clears once no player can see it.',
    adapts: 'A level and a detail setting: its own watch steps the detail, CORE steps the level, and since 1.9.991 CORE climbs the level back when there is room.',
    repairs: 'Throws out stains with bad data before they are drawn, steps down after errors, a fresh start clears every piece.',
    learns: 'What it costs by how many stains are on the street; CORE looks ahead with it when a horde is coming.',
    works: 'Needs the lighting and reflection engines; the city generator covers for it with plain stains.',
    runs: 'The processor.',
    tune: 'Effort: blood detail.'
  },
  MUZZLE: {
    title: 'The Pyrotechnician',
    character: 'Every gun gets its own fire, and it leaves the brass where it falls.',
    does: 'A different flash for every gun (star, fireball, flash-hider fan, shotgun bloom, sniper brake jets, launcher back-blast), tinted by the modification, with sparks, drifting smoke, ejected brass and shells, and a light that casts shadows.',
    adapts: 'Since 1.9.991 a ladder of its own (full, about two thirds, under half the smoke and brass) that CORE steps when the frame runs late and climbs back when there is room.',
    repairs: 'Checks its smoke and brass never pile up or lose their place; a fresh start clears them.',
    learns: 'What it costs by how much smoke and brass is on the street.',
    works: 'Needs the lighting engine for its flash light; CORE covers for it with plain flashes when it rests.',
    runs: 'The processor.',
    tune: 'Effort: how much smoke and brass.'
  },
  GARAGE: {
    title: 'The Mechanic',
    character: 'Keeps the abandoned cars of the city in working order, at least the lights.',
    does: '22 kinds of vehicle with liveries, burned and rolled wrecks, working headlights, hazards and light bars, reflective glass, rare crashed airliners, planes and helicopters.',
    adapts: 'Since 1.9.991 a headlight ladder: at night with many lit cars in view and the frame running late, the beams\' shadows and the tail glow are dropped, and CORE climbs it back when there is room.',
    repairs: 'Checks every vehicle the crowd has moved keeps its place, and puts it back if not.',
    learns: 'What its lights cost by how many lit cars are in view.',
    works: 'Feeds headlights to the lighting engine and glass to the reflection engine; the crowd engine pushes its vehicles.',
    runs: 'The processor.',
    tune: 'Effort: headlight shadows.'
  },
  SKYWAY: {
    title: 'The Overpass',
    character: 'Built once and built to last: the highways are part of the city\'s picture.',
    does: 'Elevated highways on concrete piers through every district, interchanges of loops and flyovers, abandoned traffic and collapsed spans, deck shadows, fading when you walk underneath.',
    adapts: 'Nothing to adapt: the highways are baked into each block\'s picture when the block is made.',
    repairs: 'Checks its map of highway lines stays a sensible size and its readings stay sound.',
    learns: 'What drawing the decks costs by how many are in view.',
    works: 'Needs the city generator and the lighting engine.',
    runs: 'The processor.',
    tune: 'Locked: almost no cost each frame.'
  },
  TRACER: {
    title: 'The Streak',
    character: 'Fast and flashy, but it knows when to calm down.',
    does: 'Every round drawn in its gun\'s style: a white-hot head, a motion-blurred streak and a glow (machine gun tracers, the sniper\'s vapour trail and heat shimmer, shotgun pellets, smoking grenades, living flames), tinted by its modification, with sparks where it hits.',
    adapts: 'Its detail steps down when it takes too much of the frame and back up when there is room, if CORE agrees.',
    repairs: 'A part that keeps failing rests on its own while the rest keeps drawing; a fresh start clears its trails; CORE covers for it with plain tracers.',
    learns: 'What it costs by how many rounds are in flight.',
    works: 'Needs the lighting and shader engines.',
    runs: 'The processor.',
    tune: 'Effort: how much of every round is drawn.'
  },
  AURA: {
    title: 'The Will-o\'-the-Wisp',
    character: 'Turns the strangest zombies into lanterns.',
    does: 'Toxic, molten, void, electric, radioactive, icy and spectral zombies, burning zombies and bosses become real light sources: their glow lights the street and casts shadows; eyes glow at night; a last flare when they die.',
    adapts: 'Its detail steps down when it takes too much of the frame and back up when there is room, if CORE agrees.',
    repairs: 'Parts rest on their own after errors; checks on its detail and its counts; a fresh start.',
    learns: 'What it costs by how many glowing zombies are on screen; CORE looks ahead with it when a horde is coming.',
    works: 'Needs the lighting and blood engines; the lighting engine covers for it when it rests.',
    runs: 'The processor.',
    tune: 'Effort: how many glowing zombies are lit and shadowed.'
  },
  SWARM: {
    title: 'The Hive Mind',
    character: 'Hundreds of bodies, one intention. It knows a crowd is more than many zombies.',
    does: 'Hordes and droves of hundreds that gather out of sight, march at one pace and surge when they see you; zombies moving the same way fall in step; bodies push by weight, and crowds push vehicles with real physics (only when 30 or more are after a player within 18 m and the vehicle stands within 9 m of that player); hordes spread to surround you and come to gunfire; levels of detail so 500 and more fit on screen.',
    adapts: 'Crowd detail and how many can be alive at once, stepped by its own watch; since 1.9.991 CORE also steps it down before a horde arrives when the learned costs say the frame will not hold it.',
    repairs: 'A heartbeat while zombies are on the street, its own checks and repairs, a fresh start that resets its caps; the pathfinding engine covers for its movement when it rests.',
    learns: 'What the crowd costs by how many zombies are alive, which is what lets CORE look ahead.',
    works: 'Needs the pathfinding, governor and texture engines; pushes the vehicle engine\'s cars.',
    runs: 'The processor.',
    tune: 'Effort: how much of the crowd is drawn in full detail.'
  },
  ANIMA: {
    title: 'The Puppeteer',
    character: 'Gives each of the dead its own way of moving: 2,500 animations, and not one of them shared.',
    does: 'Every 2.0 zombie is a jointed body seen from above with 50 animations of its own (10 ways of moving, 8 idles, 10 attacks, 8 hit reactions, 8 deaths, 6 specials), cross-fades that keep the feet in step, hit reactions layered on top, deaths from whatever pose it was in, bodies that stay a while; live joints near you, cached frames for the crowd, shadows shaped by each pose.',
    adapts: 'How many zombies get live joints (the rest use cached frames), stepped down when it takes too much of the frame and back up if CORE agrees.',
    repairs: 'Finds and resets broken poses and lost bodies; a self-test at start runs a handful of zombies through attacks, hit reactions and deaths and checks every joint comes out sound.',
    learns: 'What it costs by how many zombies it animates.',
    works: 'Needs the texture engine and the governor; draws inside the crowd engine.',
    runs: 'The processor.',
    tune: 'Effort: how many zombies get live joints.'
  },
  BALLISTICS: {
    title: 'The Physicist',
    character: 'Deals only in real numbers: muzzle velocity, mass, drag. It decides who lives, so it never takes shortcuts.',
    does: 'Real gun and bullet physics: real muzzle velocities and bullet masses (9 mm, .357, 5.56, 7.62, buckshot), energy, drag and penetration, swept rays that find the first wall and every zombie before it, ricochets, rounds slowed by car bodies, recoil; hit regions with real odds (head shots all but always kill, body shots usually do, limbs cripple); armour, helmets and shields.',
    adapts: 'Never: how bullets fly has to be the same everywhere.',
    repairs: 'Throws out a round that loses its place and keeps rounds from piling up; a self-test at start checks its rounds against real ones (a 9 mm near 500 joules, a 5.56 near 1,750, a 7.62 near 3,500).',
    learns: 'Nothing, on purpose: it has to work the same on every device and for everyone in co-op.',
    works: 'Needs the city generator for walls and cars.',
    runs: 'The processor.',
    tune: 'Locked: it decides who lives.'
  },
  LEGEND: {
    title: 'The Rigger',
    character: 'Builds a person out of shapes, then teaches him to stand like a soldier. Patient and exacting: after a pose it measures every bone, and a hand that misses its grip by two millimetres fails its test. Its first legend is the Operator, the beginner every player starts with.',
    does: 'The legends: real 3D characters made entirely in code, with no model files. A shape builder (lathes, limbs, bevelled boxes, extrusions, tubes, decals) skins every vertex to a 47-bone rig: the spine, each finger and thumb, the props (a pistol with its own slide and magazine, a knife, a carbine) and the seven plates of the Operator\'s exotech mask, which fold out from the helmet and click shut over his face one plate at a time. A procedural atlas paints 20 materials with height, roughness and cavity: camo with ripstop, Cordura plate carrier, leather, polymer, Cerakote, brushed steel, and carbon with etched circuits that glow in the class colour. Two-bone reach (IK) puts hands on grips and keeps feet planted, and a hand that cannot quite reach brings its shoulder forward, as a real arm does for a handguard. There are fifty animations in seven groups (moving, standing, pistol, long gun, close quarters, special, hits and down), with cross-fades and events (footsteps, shots, the mask locking). Three levels of detail: about 65,000 triangles up close, 26,000, and 6,000. Two renderers: WebGL with shadows, puddle reflections, relief normals, rim light and the class glow; and a processor painter that draws the same meshes when there is no GPU. In a run the survivor is the chosen legend: frames of his rig seen from straight above, doing what the player does (standing, walking, backing up, strafing, running, dashing, down). Each frame is painted once and kept, most of them on the main menu before a run starts.',
    adapts: 'Its level comes from the device\'s tier and the ecosystem. It decides the texture size on the Legends screen (128 to 512 px tiles), whether run frames are supersampled, and how many frames are kept (120 to 320). In a run it paints at most two new frames a frame, or one when stepped down. Until a new frame is ready it borrows the nearest phase already painted, so a new pose never stalls the game. The Legends screen has its own governor: when the cinematic runs slow, the effects step down first, then the director, then the characters, and they climb back in the other order.',
    repairs: 'Six errors in ten seconds and it rests for a minute while the old survivor stands in for the legend. Its check catches frames piling up. Its repair clears the frames and the error count. Its fresh start frees every model from the GPU and rebuilds them. Its self-test at start runs random poses (every bone must keep its exact length), puts both hands on the pistol and on the carbine (each must land within 2 mm of its grip), and checks that all fifty animations are there.',
    learns: 'What a run frame costs to paint on this device (shown in the engine room). The ecosystem uses it with what each level costs.',
    works: 'Needs CORE. MIMATIC directs it and VFXRAY finishes its frames. In a run it draws inside the city, and the muzzle flash and smoke come out of the real barrel of the pose. In co-op each player\'s legend and class travel with the lobby, so teammates see the right character.',
    runs: 'The GPU (WebGL 1) on the Legends screen, with the processor painter as a fallback. Run frames are painted on the processor and kept.',
    tune: 'Effort: how sharp the run frames are and how many are kept. GPU or processor for the Legends screen; the three Legends engines share one renderer, so the processor wins if any of them is set to it.'
  },
  MIMATIC: {
    title: 'The Director',
    character: 'Mimatic means cinematic mimicry. It studies how films are shot, keeps the techniques rather than the images, and blends them the way a director would: it chooses where the camera stands, when time slows, and where the music hits. It references; it never copies.',
    does: 'Turns a beat sheet into a film. A library of 13 film techniques, each with a note on why it works and where it comes from: low-angle hero, tracking shot, macro insert and push-in, over the shoulder, Dutch angle, whip pan, punch-in and impact shake, handheld energy, speed ramp, freeze frame and bullet time, lightning as light, title card, and hit points. From the beats it builds the shots (framed on the actors\' bones, so the camera follows a real head or a real hand), a time curve for speed ramps and freezes, and cues for the score and effects. The Operator\'s cinematic (14.2 seconds, 12 shots): he walks a rain-soaked alley, the mask closes, a door bangs, two of the dead rush him; a whip pan, a muzzle-lit headshot, a grab, a tactical throw, a pin; then slow motion as the knife rises, and lightning freezes the frame on his name. It also stages the line-up (the five classes standing in the rain behind the selection), the hub, and the studio, where the model turns front-on and then the camera tilts up and over to look straight down, the way the game sees him.',
    adapts: 'Its level sets the resolution the cinematic renders at (55% to 100%) and the detail of the characters it casts (the hero and the line-up separately). The screen\'s governor steps it down after the effects when frames run slow.',
    repairs: 'A clock gone bad is reset to the start of the shot. Repeated errors rest it while the screen holds a still. Its self-test at start directs the Operator\'s cinematic and checks that no two shots leave a gap, that time never runs backwards through the speed ramps and the freeze, and that every shot uses a technique from its library.',
    learns: 'What a cinematic frame costs on this device at its current resolution (shown in the engine room).',
    works: 'Needs LEGEND for the actors and VFXRAY for the rain, the flashes and the post. It cues the cinematic score and sound effects in the sound engine, and holds the radio down while it plays.',
    runs: 'The GPU, through LEGEND\'s renderer, or the processor painter at a lower detail.',
    tune: 'Effort: the resolution of the cinematics. GPU or processor, shared with LEGEND and VFXRAY.'
  },
  VFXRAY: {
    title: 'The Finisher',
    character: 'The last pair of hands on every frame. Rain, sparks and light are its whole world. It keeps a promise to your eyes: lightning never flashes more than three times a second, and with reduced flashing it becomes one soft swell.',
    does: 'The last pass of every Legends frame. Rain in scene time: the streaks shorten in slow motion and the drops hang in the air when the frame freezes. Splashes and ripples where the drops land. A sprite batch for muzzle flashes, gun smoke, ejected brass, blood mist and steam. Lightning: bolts and their branches, with an uneven flash pattern that lights the scene from the sky. The post chain: bloom, an anamorphic streak, colour fringing, film grain, vignette, letterbox bars, fades and flashes, motion blur from the frame before, and a colour grade that the director can drain to a cold blue-white on the freeze.',
    adapts: 'Its level sets how many drops fall (900 to 6,500), the splashes (60 to 320), the bloom steps, and whether the streak, the motion blur, the fringing, the puddle reflections and the shadows are on. It is the first thing the screen\'s governor steps down when frames run slow, and the last to climb back.',
    repairs: 'Clears its sprites if they pile up, and rests after repeated errors. Its self-test at start fires a bolt and checks the flash pattern stays at three flashes a second or fewer, and that every quality step still has rain.',
    learns: 'Through CORE: what its effects cost on this device at each level.',
    works: 'Needs LEGEND\'s renderer. MIMATIC tells it when to slow, freeze, flash and fade. It respects Settings > Accessibility > Reduce flashing.',
    runs: 'The GPU (shaders for the rain, the sprites and the post), with a processor fallback for rain, flashes, grain, vignette and bars.',
    tune: 'Effort: more rain, the streak and motion blur, or less rain and fewer bloom steps. GPU or processor, shared with LEGEND and MIMATIC.'
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = ENG_DOCS;
