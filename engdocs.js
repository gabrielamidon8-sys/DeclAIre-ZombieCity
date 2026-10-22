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
    does: 'Builds flow fields around the players: every open cell knows the cheapest way to the nearest player, with walls, water and corners priced in; separate wider fields for big zombies and for crowds shoving through. Since 1.9.994 the dead always find the way: a coarse long-range field (four cells in one, the whole neighbourhood round each player, about ten times the area of the fine field) guides the far ones the fine field does not reach, so none of them stands lost behind a block (its first look at a new area is spread over a few frames, so it never makes a hitch); in co-op each standing player gets a field of their own and each zombie follows the field of the player it is after, so two players far apart are each hunted properly.',
    adapts: 'How often the paths refresh. On Auto it follows what a field costs on this device: every 0.3 s when fields are cheap and the street is full, up to 0.5 s when they are expensive and the frame is tight. Eco refreshes every 0.55 s, Hard every 0.25 s, Max every 0.18 s. The wide fields are only built while something that big is chasing.',
    repairs: 'A heartbeat while zombies are on the street; a check that the paths are never more than 3 seconds old; a fresh start rebuilds every field (the four shared ones, each player\'s own and the long-range ones, which are rebuilt one a frame, the stalest first).',
    learns: 'How long a field takes to build here.',
    works: 'The crowd engine leans on it, and it covers the crowd\'s movement when the crowd engine rests. In co-op only the host builds paths, and NET tells each zombie who is closest: it goes for that player and keeps to them until another is clearly closer (a fifth nearer), so it never dithers between two.',
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
    does: 'Ray-traced shadows from every light, lamps at real heights (cars, trees, bodies throw shadows away from them), zombie shadows shaped by their pose, a moving sun as an area light, light beams in rain and fog, path-traced bounce light, bloom. Since 1.9.993 the flashlight is a weapon light: it comes out of the muzzle of the gun in the survivor\'s hands and points where the gun points, reaching further and narrowing as he focuses on a target, dipping during a reload, a swap or a sprint; teammates\' lights do the same.',
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
    does: 'Hordes and droves of hundreds that gather out of sight, march at one pace and surge when they see you (since 1.9.994 after fourteen seconds of marching at most: they come for you); a horde is a mix now, the leader\'s kind, its strain and a handful of the wave\'s other dead, so a crowd is never a wall of one face, and every zombie is its own size and pace; zombies moving the same way fall in step; bodies push by weight, and crowds push vehicles with real physics (only when 30 or more are after a player within 18 m and the vehicle stands within 9 m of that player); hordes spread to surround you and come to gunfire; levels of detail so 500 and more fit on screen.',
    adapts: 'Crowd detail and how many can be alive at once, stepped by its own watch; since 1.9.991 CORE also steps it down before a horde arrives when the learned costs say the frame will not hold it.',
    repairs: 'A heartbeat while zombies are on the street, its own checks and repairs, a fresh start that resets its caps; the pathfinding engine covers for its movement when it rests.',
    learns: 'What the crowd costs by how many zombies are alive, which is what lets CORE look ahead.',
    works: 'Needs the pathfinding, governor and texture engines; pushes the vehicle engine\'s cars.',
    runs: 'The processor.',
    tune: 'Effort: how much of the crowd is drawn in full detail.'
  },
  ANIMA: {
    title: 'The Puppeteer',
    character: 'Gives each of the dead its own way of moving: 3,000 animations (since 1.9.994, with the ten knife kills), and not one of them shared.',
    does: 'Every 2.0 zombie is a jointed body seen from above with 60 animations of its own (10 ways of moving, 8 idles, 10 attacks, 8 hit reactions, 8 deaths, 6 specials, 10 knife kills), cross-fades that keep the feet in step, hit reactions layered on top, deaths from whatever pose it was in, bodies that stay a while; live joints near you, cached frames for the crowd, shadows shaped by each pose.',
    adapts: 'How many zombies get live joints (the rest use cached frames), stepped down when it takes too much of the frame and back up if CORE agrees.',
    repairs: 'Finds and resets broken poses and lost bodies; a self-test at start runs a handful of zombies through attacks, hit reactions, deaths and knife kills and checks every joint comes out sound.',
    learns: 'What it costs by how many zombies it animates.',
    works: 'Needs the texture engine and the governor; draws inside the crowd engine. BLADE picks which of the ten knife kills a zombie dies (the gut, the neck, point blank, the throat, the hammer at the collar, two rounds, the pistol whip, under the jaw, the lunge, the reaper\'s spin), and in co-op the death travels with the kill so both screens show the same one. Since 1.9.994 each zombie drawn up close also wears what happened to it, not to its kind: its own blood, a rip with the skin underneath, a gash, bite marks, drool down its front, and more blood with every hit.',
    runs: 'The processor.',
    tune: 'Effort: how many zombies get live joints.'
  },
  BALLISTICS: {
    title: 'The Physicist',
    character: 'Deals only in real numbers: muzzle velocity, mass, drag. It decides who lives, so it never takes shortcuts.',
    does: 'Real gun and bullet physics: real muzzle velocities and bullet masses (9 mm, 9×18 mm, .45 ACP, .357, 5.45, 5.56, 7.62, buckshot), energy, drag and penetration, swept rays that find the first wall and every zombie before it, ricochets, rounds slowed by car bodies, recoil; hit regions with real odds (head shots all but always kill, body shots usually do, limbs cripple); armour, helmets and shields.',
    adapts: 'Never: how bullets fly has to be the same everywhere.',
    repairs: 'Throws out a round that loses its place and keeps rounds from piling up; a self-test at start checks its rounds against real ones (a 9 mm near 500 joules, a 5.56 near 1,750, a 7.62 near 3,500).',
    learns: 'Nothing, on purpose: it has to work the same on every device and for everyone in co-op.',
    works: 'Needs the city generator for walls and cars.',
    runs: 'The processor.',
    tune: 'Locked: it decides who lives.'
  },
  PHYSICS: {
    title: 'The Gravity Clerk',
    character: 'New in 1.9.993, and a stickler. It thinks every spent case deserves a real fall: the right metal, the right bounce, the right roll. A bottlenecked rifle case curves as it rolls because a real one does, and it will not let a single one sink into the street.',
    does: 'The game\'s own physics engine, in two worlds that share one set of rules. In a run (top-down, with height): spent cases leave each gun\'s ejection port at that gun\'s angle and speed, spinning end over end; they fall under real gravity, bounce with the restitution of their metal (brass rings, lacquered steel clicks, a shotgun hull thuds), lose speed to friction and then roll (a straight pistol case rolls straight, a bottlenecked rifle case in a curve), glance off walls and sink in water. Magazines dropped in a reload fall heavier and flatter, slide and stop, each gun\'s own shape and colour (the AK\'s curved plum mag, the PP-19\'s helical drum, the revolver\'s half-moon clips). Cases lie 5 seconds and magazines 30, then fade, each with its landing sound. In a cinematic (full 3D): bodies with a shape (sphere, cylinder or box), velocity, orientation and spin, ground contact with friction and rolling, and static boxes for the set; the can kicked in the dark in the stoop, the bottles and cans the alley fight knocks over, the papers in the wind. And springs and pendulums that the other engines use for weight: the survivor\'s upper body lagging when he turns or stops, the lean and the recoil, the camera\'s kick, the bulb swinging on its cable.',
    adapts: 'Four levels (how many bodies at once and how many steps a frame). It steps itself down when the street is crowded and the frame is slow, dropping the oldest cases first, and climbs back when there is room.',
    repairs: 'Throws out a body that loses its place, trims a pile-up, rests after repeated errors; a heartbeat while things are moving. Its self-test at start drops a can from a metre (it must bounce lower each time, never sink into the ground, and come to rest) and throws a ball at a wall (it must come back, not pass through).',
    learns: 'What a frame of street physics costs on this device by how many bodies are moving.',
    works: 'ARMS and MUZZLE hand it the cases and the magazines; LEGEND, MIMATIC and the run camera use its springs; the sound engine plays its landings.',
    runs: 'The processor.',
    tune: 'Effort: more bodies at once and two steps a frame, or fewer bodies and one step.'
  },
  ARMS: {
    title: 'The Armorer',
    character: 'New in 1.9.993. A range instructor with opinions: the gun comes up before it fires, a sprinting man does not shoot, and you keep your partial magazine when nobody is close. It studied how operators and soldiers actually handle guns and will not let the Operator cut a corner.',
    does: 'The 250 frame-and-mod guns rest while they are rebuilt on real ones ten at a time; the first ten are five primaries (M4A1, AK-74M, Mk 17, M1014, PP-19) and five secondaries (M17, M9, M1911A1, M1917 revolver, APS), each with its real calibre, capacity, rate of fire and muzzle velocity. You carry one of each and swap. Ready up and ready down: relaxed, the gun rides at low ready; engaged, it comes up to the eyes in the gun\'s own ready time, with a focused posture (shoulders forward, knees soft, shorter steps), and after a few quiet seconds it comes back down. Sprinting carries the gun off target and nothing fires until it is back up. Each gun reloads its own way: the AR\'s speed reload with the bolt catch slapped on empty, the AK\'s hook-and-rock with the handle racked from under, the Mk 17\'s left-side handle, the shotgun\'s tube loaded shell by shell (a round through the port on empty), the PP-19\'s helical magazine hooked on its front pins and rotated up, a pistol\'s slide lock, the 1911\'s slide stop, the revolver\'s half-moon clips; a round stays in the chamber on a tactical reload, a partial magazine is kept when nobody is close, and pressing reload on a full gun is a press check. The dash button is a dodge roll (the 25 dashes rest): untouchable for its first part, then committed. Every shot kicks the gun, the shoulders and the camera by its calibre. Since 1.9.994 the knife is one of its states (BLADE runs it): the sidearm comes out for the chain and the long gun comes back after it, and teammates see which knife move you are making.',
    adapts: 'Never, on purpose: how the guns handle has to be the same for everyone and in co-op. What it draws scales through LEGEND and PHYSICS instead.',
    repairs: 'A state that goes bad, a magazine count that goes wrong or a move stuck past its time is put back to the relaxed carry with full magazines; a heartbeat while you play. Its self-test at start checks that there are five and five and every gun is in the shared tables, that a tactical reload leaves thirty plus one and an empty one thirty, that nothing fires while sprinting or before the gun is up, and each round\'s muzzle energy against the published figure for its calibre (within a quarter).',
    learns: 'Which gun you reload most, so its frames are warmed before a run.',
    works: 'Needs BALLISTICS for the rounds and PHYSICS for the brass and the magazines. LEGEND animates every move it decides, the run camera and LUX follow its focus, MUZZLE ejects from each gun\'s port, and in co-op each player\'s gun state travels with them, so teammates see each other\'s reloads and magazines hit the street.',
    runs: 'The processor.',
    tune: 'Locked: how the guns handle has to be the same for every player.'
  },
  BLADE: {
    title: 'The Knife',
    character: 'New in 1.9.994. Quiet, close and quick: it would rather finish it with a blade than wake the street with a shot. It keeps count of every combo you find and is a little smug about the Reaper.',
    does: 'The combat knife, on V (the right bumper on a controller, the knife button on a phone). He lunges to the nearest of the dead in front of him (any side when it is right on top of him), untouchable on the way, and sticks it; while the chain is open (a breath after each strike) the next press lunges to the next one, further away, and fire puts a round into the one in front of him point blank. That is the rhythm: knife, knife, shot, knife, knife, shot, until the sidearm runs dry, and then the shot becomes a pistol whip. Ten combos, each its own move for the Operator and its own death for the zombie: Stick (the gut), Two-Step (the neck), Knife Knife Shot (point blank into the head), Throat Line (a cut across the throat), Hammer Down (the overhand stab at the collar), Second Pair (two rounds into the chest), Pistol Whip (dry), Whip and Stick (under the jaw), Lunge (a long dash into a thrust) and Reaper (three of the dead with the knife: a spinning backhand that takes everything in reach). Knife kills are silent: no horde hears them. The heavy dead (the big ones and the bosses) take a deep wound and stagger instead, and go down on the third. A banner names each combo as it lands, a pale arc shows where the blade went, a hit stop and a slow beat land the big ones, and the first time you find a combo it tells you (of ten).',
    adapts: 'Never, on purpose: a strike has to land the same for everyone and in co-op.',
    repairs: 'It only works while the knife is out, and its heartbeat is the strike itself. A strike that never finishes, or a knife out with no chain, puts the knife away; after repeated errors it stays sheathed for a moment. Its self-test at start runs the combo grammar on a dummy (knife, knife, shot, knife, knife, shot, then dry: the whip, then the jaw) and checks ANIMA has its ten knife deaths and ARMS its knife state.',
    learns: 'The combos you have found (kept on the device) and the one you use most.',
    works: 'ARMS gives it the sidearm and takes the long gun back after the chain; ANIMA plays the death each combo chose; BALLISTICS and MUZZLE fire the point-blank rounds; LEGEND draws the Operator\'s knife moves in a run and in the studio; the chain counter counts its kills. In co-op the strike travels with the hit (and the death it chose), so the host kills it with the right death and both screens show it, and teammates see your knife out and which move you are making.',
    runs: 'The processor.',
    tune: 'Locked: a strike has to land the same for every player.'
  },
  LEGEND: {
    title: 'The Rigger',
    character: 'Builds a person out of shapes, then teaches him to stand like a soldier. Patient and exacting: after a pose it measures every bone, and a hand that misses its grip by two millimetres fails its test. Its first legend is the Operator, the beginner every player starts with.',
    does: 'The legends: real 3D characters made entirely in code, with no model files. A shape builder (lathes, limbs, bevelled boxes, extrusions, tubes, decals) skins every vertex to a 47-bone rig: the spine, each finger and thumb, the props (a pistol with its own slide and magazine, a knife, a carbine) and the seven plates of the Operator\'s exotech mask, which fold out from the helmet and click shut over his face one plate at a time. A procedural atlas paints 20 materials with height, roughness and cavity: camo with ripstop, Cordura plate carrier, leather, polymer, Cerakote, brushed steel, and carbon with etched circuits that glow in the class colour. Two-bone reach (IK) puts hands on grips and keeps feet planted, and a hand that cannot quite reach brings its shoulder forward, as a real arm does for a handguard. There are fifty animations in seven groups (moving, standing, pistol, long gun, close quarters, special, hits and down), with cross-fades and events (footsteps, shots, the mask locking). Three levels of detail: about 65,000 triangles up close, 26,000, and 6,000. Two renderers: WebGL with shadows, puddle reflections, relief normals, rim light and the class glow; and a processor painter that draws the same meshes when there is no GPU. Since v2 (1.9.993) the survivor in a run is built in three layers painted from straight above: the legs (walking, strafing, backing up, sprinting, each paced by what it measured), the upper body with the gun in his hands, and the head; they turn on their own the way a body does: the head turns first, the chest follows it and the legs follow the movement, with a limit on the twist, so he looks around a corner before he turns into it. Springs give him weight: he leans into a start and settles after a stop, each shot kicks his shoulders by the gun\'s calibre, and near a wall he cants the gun and leans to slice the corner. Each of the ten rebuilt guns is modelled with its own grips, rails, optic and magazine, so the hands land on that gun\'s grip and handguard, and the magazine hand goes to that gun\'s magazine well; the knife sits in a reverse grip, the blade out of the little-finger side of the fist. A hundred and seven animations now: the fifty, thirty-two seated idles for the stoop (the knife sharpened on a whetstone, the can, a lamp flicker, a coin across the knuckles, a doze, a radio check and more, cross-faded into one another) and thirteen arms moves you can watch in the Legends studio. The Operator also has a face now (stubble, brows, the balaclava rolled down) for when his mask is down. Since 1.9.994 the hands are real hands: an anatomical glove over three bones a finger (the thumb too), and every grip is fitted to the actual gun: the palm slides onto the grip until it touches, then each finger and the thumb close joint by joint until they meet the surface (the model of that gun, sampled point by point), so the fingers wrap the grip, the handguard, the slide and the knife\'s handle instead of floating; the fits are kept on the device and warmed in the background for the guns you carry. The ten guns were rebuilt to their real proportions: a 5.56 magazine as deep as its round is long, the AK\'s deep curve, the Mk 17\'s straight 20-rounder, slimmer raked grips with texture panels, stocks with their slots and cut-outs, and the pistols on real slides (serrations front and back, the port with the barrel hood in it, sights with their dots, the M17\'s red dot), real grip angles with beavertails and wooden panels, and a revolver with its top strap and fluted cylinder; edges are rounded in two facets. The legend\'s page has an armory on its left: each gun drawn from its own model through a depth buffer (smooth light, clean edges, lit by the class), the one in view big with its numbers and its special reload, and picking one puts it in his hands in the studio at once. Ten knife moves (the combos) join the arms moves in the studio. Since 1.9.995 (v3 to v5, its course) it has studied anatomy and handling things. Every joint keeps the range a human joint has (shoulder, elbow, forearm, wrist, fingers, hip, knee, ankle, neck and spine, from the AAOS and Soucie tables): the arm swivels to keep the wrist in range, poses the clips made by hand are brought back inside the ranges (1,495 joint angles out of range across the game\'s clips before, none after), the arms are kept out of the body, and the centre of mass and the base of support are tracked frame by frame. It holds thirteen everyday things in the grasp people choose for each (Feix\'s taxonomy: a hook for a mug, wraps, a power sphere for a ball, a tripod for a pen, pinches for a coin and a key, two hands for a crate), the hand settling until the pads touch without sinking in and the contacts can hold the thing against gravity (friction cones). It reaches to grasp with the bell of speed and the opening of real prehension (widest at about 70% of the reach, 55 mm plus 0.75 of the thing\'s width), follows Fitts\'s law, lifts a 12 kg crate with the legs, hands a bottle to another person with the weight passing in 0.3 s, and throws a ball with the kinetic chain (hips, then trunk, elbow and arm), learning when to let go so it lands on its target. It checks its own movement like an animation supervisor (feet that slide, limbs into the body, smoothness by SPARC, arcs, the eyes leading the hand, breathing at rest) and performs one action in different Laban efforts (a punch, a float, a glide, a slash). Since 1.9.996 (slice 13): LOCO, a gait built from measured human walking and running: the cadence, stride and share of stance for each speed (treadmill studies, Fukuchi 2017 for running), the hip, knee and ankle through the step as measured curves, the planted foot pivoting on its heel and then its ball and never sliding, the stride warped to the speed, the hips turned toward the way he moves (up to 45 degrees off the chest, which stays on the aim) and swung round past 100 degrees so he backs up properly, the hips riding the stance leg in a walk and bouncing in a run; the walk, patrol, jog, run, sprint, crouch walk, strafes and backpedal are rebuilt on it, and in a run his legs are painted from it at the speeds he really moves, with a step finished, not melted, when he stops. LGP, the performance layer: every joint answers its parent a little late and settles past the mark (a damped spring per part, computed from the clip\'s own past so a film can still be scrubbed), a standing body sways and breathes, and the kit hangs on four new bones that swing (the radio\'s antenna, the dump pouch, the cummerbund\'s strap tails). The weapon light is on the gun\'s rail (an M600-style light on each long gun, a compact light on the pistol) and the beam goes along the barrel. The heads are sculpted as one surface (brow, eye sockets, nose, cheekbones, lips, chin), with ballistic glasses resting on the nose, brows, stubble and hair when his face shows; the sleeves and trousers fold, the cargo pockets are full-size and the pads sit low.',
    adapts: 'Its level comes from the device\'s tier and the ecosystem. It decides the texture size on the Legends screen (128 to 512 px tiles), whether run frames are supersampled, and how many frames are kept (120 to 320). In a run it paints at most two new frames a frame, or one when stepped down. Until a new frame is ready it borrows the nearest phase already painted, so a new pose never stalls the game. The Legends screen has its own governor: when the cinematic runs slow, the effects step down first, then the director, then the characters, and they climb back in the other order.',
    repairs: 'Six errors in ten seconds and it rests for a minute while the old survivor stands in for the legend. Its check catches frames piling up. Its repair clears the frames and the error count. Its fresh start frees every model from the GPU and rebuilds them. Its self-test at start runs random poses (every bone must keep its exact length), puts both hands on the pistol and on the carbine (each must land within 2 mm of its grip; since 1.9.995 the support hand may roll round the handguard to keep its wrist in range, and must stay on it), checks that all fifty animations are there with the seated idles and the arms moves, checks that the knife is held the right way round, and (since 1.9.996) that the walk keeps a measured cadence (100 to 122 steps a minute at 1.33 m/s), that a flat foot slides less than 2.5 cm while it is down, and that the performance layer leaves a held pose where the clip put it.',
    learns: 'What a run frame costs to paint on this device. It also teaches itself as it plays: every time it paints the upper body it measures where the support hand landed against that gun\'s grip in that posture; if it is off by more than 6 mm it moves that gun\'s posture in toward the shoulder by most of the miss, paints it again and checks again (most land within 2 mm after a try or two), and if moving the gun does not bring the hand closer it puts the posture back and leaves it. What it learned is kept on the device. Its steps are paced by the gait itself (the phase advances by the ground covered over the stride for that speed), so a planted foot holds the ground; it keeps the leg frames it has painted at the speeds the survivor has actually moved. Its course: five versions, each with an exam measured on its own output (proportions against de Leva, 120 reaches, the grips on ten guns, joint ranges, balance, the grasps, reach, lift, handover, throw, the quality of movement); a version is held only while every exam before it passes, and the results are kept on the device. It also learns by practice: the support-hand grip\'s cost falls from 415 to under 5 over its tries, the balance gain is found in a few practice reaches, and the throw\'s release in a few practice throws (the miss goes from a metre to a centimetre).',
    works: 'Needs CORE. MIMATIC directs it and VFXRAY finishes its frames. In a run ARMS decides what the hands and the gun do and LEGEND moves the body to match, PHYSICS gives it its springs, it draws inside the city, and the muzzle flash, the brass and the weapon light come out of the real gun in the pose. In co-op each player\'s legend, class and gun travel with them, so teammates see the right character doing the right thing.',
    runs: 'The GPU (WebGL 1) on the Legends screen, with the processor painter as a fallback. Run frames are painted on the processor and kept.',
    tune: 'Effort: how sharp the run frames are and how many are kept. GPU or processor for the Legends screen; the three Legends engines share one renderer, so the processor wins if any of them is set to it.'
  },
  MIMATIC: {
    title: 'The Director',
    character: 'Mimatic means cinematic mimicry. It studies how films are shot, keeps the techniques rather than the images, and blends them the way a director would: it chooses where the camera stands, when time slows, and where the music hits. It references; it never copies.',
    does: 'Turns a beat sheet into a film. A library of 13 film techniques, each with a note on why it works and where it comes from: low-angle hero, tracking shot, macro insert and push-in, over the shoulder, Dutch angle, whip pan, punch-in and impact shake, handheld energy, speed ramp, freeze frame and bullet time, lightning as light, title card, and hit points. From the beats it builds the shots (framed on the actors\' bones, so the camera follows a real head or a real hand), a time curve for speed ramps and freezes, and cues for the score and effects. The Operator\'s cinematic (14.5 seconds, 15 shots, rebuilt in 1.9.994): he walks a rain-soaked alley carrying your sidearm, the mask closes, a door bangs, two of the dead rush him; a whip pan, a muzzle-lit headshot, a grab, a tactical throw; down on a knee and the knife goes in; a third one out of the dark behind him; he comes up turning, the knife at its collar in slow motion, the pistol past the knife arm, point blank (knife, knife, shot, the in-game combo\'s rhythm), and time stops on the muzzle flash while lightning freezes the frame on his name; the score is rewritten to the new cut. It also stages the line-up (the five classes standing in the rain behind the selection), the hub, and the studio, where the model turns front-on and then the camera tilts up and over to look straight down, the way the game sees him (a seated clip plays there on his chair). Since v2 (1.9.993): the stoop, the idle scene behind each face on the selection screen: the Operator sits on a wooden chair under a dim bulb swinging on its cable over a shop shutter, mask down, sharpening his knife, the camera on the street at floor level looking up at him; a director picks from thirty seated idles and cross-fades them so he is never still the same way twice, and somewhere in the first quarter-minute a can is kicked in the dark: he is up off the chair with the knife out, and there is nothing there. Every actor carries weight now (springs that lag the head and the chest behind the hips), the knife is held the right way, the alley has neon that buzzes and flickers, bottles and cans the fight knocks over, papers in the wind, a passing car\'s lights sweeping the walls and a siren far off. And it directs the run\'s camera: lead room ahead of where you look when engaged and where you move when not, a slight push in when you focus, a pull out when you sprint, and a kick by each gun\'s calibre that springs back. In the studio the Operator carries the guns from the armory, his hands fitted to them, and a pick turns the camera three-quarters from his gun side to watch him take it. Since 1.9.995 (v3 to v5, its course): a camera body and lens (Super 35 and full frame, focal length and angle of view, aperture, focus, depth of field by the thin-lens formula, shutter angle, exposure value, the judder limit on pans) and its rigs (locked, pan, tilt, whip, dolly, crane, arc, steadicam, handheld, dolly zoom, rack focus) with minimum-jerk starts and stops; the shot sizes from extreme close-up to extreme wide, framed on the face as LEGEND models it, composition and clear sightlines; light designed for the subject (key, fill and back at the look\'s ratio, 2:1 to 16:1, colour temperatures through Planck\'s law) and metered by two renders until the ratio is right; and directing: coverage of a scene (master, two-shot, singles, overs, inserts), continuity (the 180-degree and 30-degree rules, match on action) and the cut chosen over all the possibilities by Murch\'s rule of six. With BOARD and VFXRAY it shoots a written scene: the set and its practical lights from the heading (a night avenue of sodium lamps and neon, a warehouse under bulbs), the light per shot, the director\'s camera following its subject, focus pulled to the eyes, a kick on the camera when a blow lands. Since 1.9.996: every actor plays through LEGEND\'s performance layer, so the films move as if motion-captured; the alley was watched frame by frame from a fixed witness camera and fixed: the mask-on reach (elbow forward, his hand to the helmet\'s rail) shot from his left with a warm key light, the shoulder throw turned round the contact on his back (he drops and bends, it rolls over and is slammed down), the head shots that drop as dead weight, the last of the dead clawing at the knife in its collar on the freeze, and no jump before it. The stoop is cut like a film\'s quiet scene: four held shots on a 26-second loop (a wide pushing in, a side medium on the knife, an insert on his hands and the blade, his face from under the helmet\'s brim), each keeping him clear of the class card.',
    adapts: 'Its level sets the resolution the cinematic renders at (55% to 100%) and the detail of the characters it casts (the hero and the line-up separately). The screen\'s governor steps it down after the effects when frames run slow.',
    repairs: 'A clock gone bad is reset to the start of the shot. Repeated errors rest it while the screen holds a still. Its self-test at start directs the Operator\'s cinematic and checks that no two shots leave a gap, that time never runs backwards through the speed ramps and the freeze, and that every shot uses a technique from its library.',
    learns: 'What a cinematic frame costs on this device at its current resolution. It also checks its own framing as it plays: where the subject\'s head lands in each shot (off the edge, or with no headroom over the eyes) and corrects that shot next time, a little wider or the target moved, keeping the corrections on the device. Its course: five versions with exams on its own output (the cinematic\'s time curve, framing learned from its own frames, lens arithmetic and a dolly zoom measured on renders, framing within 1%, colour temperatures against Planck, lighting ratios metered within 2%, an edit with no crossings and no jump cuts that beats a careless one by the rule of six); a version is held only while every earlier exam passes.',
    works: 'Needs LEGEND for the actors, VFXRAY for the rain, the flashes and the post, and PHYSICS for the props and the weight springs; ARMS and LUX follow the run camera\'s focus. It cues the cinematic score and sound effects in the sound engine, and holds the radio down while it plays.',
    runs: 'The GPU, through LEGEND\'s renderer, or the processor painter at a lower detail.',
    tune: 'Effort: the resolution of the cinematics. GPU or processor, shared with LEGEND and VFXRAY.'
  },
  VFXRAY: {
    title: 'The Finisher',
    character: 'The last pair of hands on every frame. Rain, sparks and light are its whole world. It keeps a promise to your eyes: lightning never flashes more than three times a second, and with reduced flashing it becomes one soft swell.',
    does: 'The last pass of every Legends frame. Rain in scene time: the streaks shorten in slow motion and the drops hang in the air when the frame freezes. Splashes and ripples where the drops land. A sprite batch for muzzle flashes, gun smoke, ejected brass, blood mist and steam. Lightning: bolts and their branches, with an uneven flash pattern that lights the scene from the sky. The post chain: bloom, an anamorphic streak, colour fringing, film grain, vignette, letterbox bars, fades and flashes, motion blur from the frame before, and a colour grade that the director can drain to a cold blue-white on the freeze. Since v2 (1.9.993) the post is more filmic: halation (the red-orange glow film gives off round bright lights), a soft shoulder so highlights roll off instead of clipping, and a split tone (cool shadows, warm highlights) set per scene; the stoop has its own grade, teal and sodium-orange, with heavier grain and vignette. Since 1.9.995 (v3 to v5, its course): what a camera really records: depth of field gathered from the lens in linear light and measured against the thin-lens formula, motion blur from the camera\'s own movement through a 180-degree shutter, natural cos-fourth vignetting; the filmic tone curve, colour looks as 32-cube lookup tables (teal and orange, bleach bypass, day for night, sodium), light shafts, and height fog by the Beer-Lambert law; and effects from physics: rain at each drop size\'s terminal speed, sparks that fly, bounce and cool through a black body\'s colours, smoke carried by curl noise, debris, a ring of dust where a body lands, and the muzzle flash in its phases, all cued by CHOREO\'s fights (on a wet street, water off the body and a splash ring where it lands).',
    adapts: 'Its level sets how many drops fall (900 to 6,500), the splashes (60 to 320), the bloom steps, and whether the streak, the motion blur, the fringing, the puddle reflections and the shadows are on. It is the first thing the screen\'s governor steps down when frames run slow, and the last to climb back.',
    repairs: 'Clears its sprites if they pile up, and rests after repeated errors. Its self-test at start fires a bolt and checks the flash pattern stays at three flashes a second or fewer, and that every quality step still has rain.',
    learns: 'What its effects cost on this device at each level, and its rain: if the drops cost more than the frame has room for it thins them a step at a time (never below 40%) and brings them back when there is room, keeping that on the device. Its course: five versions with exams on its own output (the bloom, the film look, blur measured in pixels against the lens, fog measured against exp(-ρL), rain against Atlas\'s drop speeds, sparks cooling, smoke\'s spread, the flash\'s phases, a cue for every moment of a fight); a version is held only while every earlier exam passes.',
    works: 'Needs LEGEND\'s renderer. MIMATIC tells it when to slow, freeze, flash and fade. It respects Settings > Accessibility > Reduce flashing.',
    runs: 'The GPU (shaders for the rain, the sprites and the post), with a processor fallback for rain, flashes, grain, vignette and bars.',
    tune: 'Effort: more rain, the streak and motion blur, or less rain and fewer bloom steps. GPU or processor, shared with LEGEND and MIMATIC.'
  },
  CHOREO: {
    title: 'The Fight Director',
    character: 'Thinks in beats and distances. It will not let a blow land for real: every staged hit stops a hand short of the face, on the side the camera cannot see, and the partner moves on the cue, not on the touch.',
    does: 'Designs fights and has the others perform, shoot and dress them. Moves (v1): jab, cross, hook, uppercut, body shot, front kick, roundhouse, high block, parry, slip, duck, a grab, a bottle swing and a point-blank shot, each timed in three phases (wind-up, contact, recovery) from measured punches and kicks, with the line it travels, the limb, the target and how it is written on a fight sheet; reactions (snap back, snap sideways, snap up, fold, pushed back, stagger, fall). Spacing and contact (v2): the measure kept between fighters, the strike arriving on its target at the moment of contact, blocks meeting the strike, feet planted with their own direction (they never slide or spin in place), steps that lift before they travel, the gap of every staged hit hidden along the lens. Phrases and rhythm (v3): moves joined into phrases with the pause-burst-pause rhythm, several attackers who take turns, only one engaged at a time. Reading on camera (v4): every exchange staged for its camera, the hit and the reaction in one frame, silhouettes clear. Whole fights (v5): a set-up, an escalation, a reversal and a climax, a bottle picked up off a crate and used, the shot to end it, and the sheet.',
    adapts: 'Nothing per frame: a fight is solved once (every pose, every contact) and kept, so it costs nothing while it plays.',
    repairs: 'Its self-test at start stages a jab and a cross and checks the cross stops a hand short of the face along the lens and reads as landing, that every move has its three phases and that a cue leaves the partner more than a human reaction time.',
    learns: 'Its course: five versions, each with its own exam measured on its own fights (contact timing, the gap on the picture and in the air, foot slip, the rhythm of the gaps between blows, the story\'s intensity). A version is held only while every exam before it passes; the results are kept on the device.',
    works: 'Needs LEGEND to perform the moves (its reach, its balance, its anatomy). BOARD hands it the fights a written scene calls for; MIMATIC chooses the camera and its gap goes away from that camera; VFXRAY takes its cue sheet (a hit, a block, a fall).',
    runs: 'The processor, once per fight.',
    tune: 'Locked: a fight is staged once, there is nothing to tune while it plays.'
  },
  BOARD: {
    title: 'The Storyboard Artist',
    character: 'Reads a page the way a first assistant director does, then draws it with a soft pencil. Leaves alone what a note did not touch.',
    does: 'Turns a written scene into what a production plans from. Reading (v1): the scene heading (inside or out, the place, the time of day), the weather and light, the people (named in capitals, described as "a stranger", or followed back through he and she), what each does (walks, runs, picks up, puts down, hands, throws, drinks, talks, looks, every blow and defence of a fight), to whom, with what, how (an adverb becomes one of Laban\'s efforts) and what they say. The shot list (v2): every beat planned as shots with number, description, size, type, camera move, lens and length, opening wide, close for feeling, inserts for hands, fights in short handheld shots. Panels (v3): each shot drawn from MIMATIC\'s camera with the people as LEGEND performs them at that moment, in pencil (line weight by depth, hatching on the shadow side), with the arrows boards use for a figure\'s movement and for the camera. Floor plans and continuity (v4): the set from above with the marks, the paths, the line of action and every camera with its field of view, and the 180-degree rule, screen direction and eyelines checked across the cuts. Style, revisions and the animatic (v5): a director\'s notes ("make 6 a close-up", "add an insert of the mug after 3", "cut 5", "flip to the other side") applied without disturbing the rest, and the panels timed into an animatic. It also compiles the scene: each beat becomes a LEGEND performance or a CHOREO fight, in order, on its marks, so MIMATIC can direct it and VFXRAY finish it.',
    adapts: 'Nothing per frame: a scene is read, staged and drawn once.',
    repairs: 'Its self-test at start reads a four-sentence scene back (the heading, the two people, the walk, the bottle handed to the right person, the duck that answers the punch).',
    learns: 'Its course: five versions, each with an exam on scenes it has not been fitted to (the beats read right, the shot list complete, the panels framed from the real cameras, continuity kept, notes applied), held only while every earlier exam still passes; the results are kept on the device.',
    works: 'Hands CHOREO the fights and LEGEND the handling and the walks, asks MIMATIC for the cameras and the cut, and gives VFXRAY the weather. The Cinematic Studio (studio/ in the repository) runs it from a scene typed in.',
    runs: 'The processor, once per scene.',
    tune: 'Locked: nothing of it runs while a scene plays.'
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = ENG_DOCS;
