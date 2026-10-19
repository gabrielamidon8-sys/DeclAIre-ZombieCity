# Zombie City

A top-down zombie survival shooter for phones, PCs and controllers. You hold the streets against waves of mutating zombies, chain kills for bigger rewards, and fight bosses that evolve mid-fight. Tune the in-game radio to FM 66.6 for seven channels of music, and the city lights up in time with it.

## Play

- **Windows:** download `ZombieCity-Setup.exe` from the [Releases](../../releases) page and double-click it. It installs the Zombie City Launcher for your Windows account (no administrator password), adds it to the Start menu, offers a desktop shortcut and can start the game straight away; it also shows up in Settings > Apps for uninstalling (your saves are kept). The launcher is a borderless window with the news, your account, a check for updates and Play, which opens the game in its own window (full screen or windowed, your choice). It keeps the game up to date from this repository's releases and hosts Wi-Fi co-op games. Windows may warn that the app is new: choose "More info", then "Run anyway". The first time you host, allow Zombie City on private networks. Prefer nothing installed? `ZombieCity-Launcher-Windows.zip` is the same launcher: unzip it anywhere and run `Zombie City Launcher.exe`.
- **Android:** download the latest `.apk` from the [Releases](../../releases) page and open it on your phone. Updates install over the old version and keep your saves.
- **Browser (Mac, Linux, iPhone, Chromebook and everything else):** play at [gabrielamidon8-sys.github.io/DeclAIre-ZombieCity](https://gabrielamidon8-sys.github.io/DeclAIre-ZombieCity/), or open `zombie-city-offline.html` in any modern browser. It's a single self-contained file that needs no internet connection.

Website: [declairestudios.wordpress.com](https://declairestudios.wordpress.com)

Every version is the same game. It works out what you are playing with (touch screen, keyboard and mouse, or a controller) and switches on the fly; on PC and controller you aim yourself, and every key and button can be changed in Settings > Controls.

## Wi-Fi co-op

Two to four players on the same Wi-Fi play one run together. A PC running the launcher hosts: on the main menu choose **Wi-Fi co-op**, then **Start hosting**. Phones (the Android app) and other PCs on the same network choose Wi-Fi co-op too, and the host's game shows up in their list (or they type the address the host sees). When everyone is in, the host presses **Start the run**.

Everyone fights the same zombies, waves and bosses in the same city, and shares the score. When a player goes down, a teammate stands next to them for a couple of seconds to revive them; everyone is back on their feet when a wave is cleared, and the run ends only when the whole team is down. After each wave every player picks a card. The A-10 is the team's: anyone can call it in. The web page can't join (browsers don't let a secure page connect to devices on your network), but the apps can.

- **Card rounds never freeze.** Each round has a number, the host sends the cards again until every player has them, and a 30-second timer picks a card for anyone who is away (in the pause menu, on another app, or disconnected). The waiting line shows who has picked.
- **Ping.** The lobby shows every player's ping live. In a run it sits on the HUD; switch it off in the pause menu or in Settings > Gameplay > Wi-Fi co-op.
- **Find your team.** When a teammate is off screen an arrow on the edge of the screen points to them, with their name and distance. Press G (LB on a controller, the pin button on a phone) to drop a marker for everyone.
- **Drops are survivable.** If the Wi-Fi blips, the game reconnects by itself for 25 seconds and puts you back in the same slot of the same run; the host keeps your place for 30 seconds. Everyone must run the same version, and an older copy is told to update.
- **What is local and what is shared.** Each device builds the city itself from the run's seed (streets, rivers, weather, props), so the world never travels over the network. Your own movement, aiming and shots run on your device for instant response. The host owns everything that must agree: zombies and bosses, the wave, the score, the cards and revives, and sends a compact snapshot 15 times a second. Late snapshots are dropped rather than queued, so a slow device catches up instead of falling behind.

## Accounts and cloud saves

A free DeclAIre Studios account keeps your progress on every device. Make one on the [account page](https://headless-iilujwebfcb-gabrielamidon8-140e.wix-site-host.com/), then log in from **Account** on the game's main menu (browser, Android app or Windows launcher). After every run the game merges this device's progress with the cloud: unlocks from every device add up, bests are kept, and each device keeps its own totals.

- Accounts run on Wix (members and a data collection). Passwords are never stored by the game; Wix stores only a one-way hash.
- Each account's save is encrypted on the device with AES-GCM under a random 256-bit key made for that account. That key is wrapped with a key derived from the password (PBKDF2-SHA256, 600,000 rounds, a random salt per account) before it is uploaded, so the stored save can't be read without the password. Changing the password re-wraps the key; after a password reset the game asks once for the old password, or starts a new cloud save from the device's progress.
- One season leaderboard for every platform: your best run each month goes up under your account name.
- Names (survivor, board and co-op) go through a filter for slurs, swearing, threats and personal details (emails, phone numbers, links), with 50 different remarks for anyone trying to sneak something past it. Names that pose as the studio (ADMIN, DECLAIRE, moderator, official and so on, in any spelling such as D3CLA1RE) are saved for the team.
- The studio's admin account shows as **ADMIN|DECLAIRE** (ADMIN in cracked red, DECLAIRE underlined in orange). Only that account can use it: on the board the game checks the row's Wix owner, and in co-op teammates ask Wix to confirm it, so a copy shows as an ordinary name.
- If someone else logs in on your device, your progress is put away and comes back when you log in again; their progress never mixes with yours.

## What's in the game

- 1,000 zombie mutations and 250 weapons
- 50 bosses that mutate into new forms, plus the Snatcher and the Overlord
- Cards, curses and forbidden cards from the skull at x100; a prize wheel at x200 and up
- An A-10 Warthog airstrike earned at chain 75, with splash-damage rounds that chew up the road
- 25 dashes with their own effects and passives
- FM 66.6, an in-game radio with 7 channels and 35 songs on each (synthwave, heavy metal, industrial, orchestral, lo-fi, drum & bass, chiptune), all generated by the game. Songs end and the next one fades in. Bluetooth plays your own songs
- An endless city made from a seed, different every run: downtown, burning districts, riot zones, destroyed blocks, ash towns, suburbs, deserts and the frozen north, each district with its own name. Plazas are gardens, squares, street markets or basketball courts; rooftops have water towers, ducts, stair hatches, solar panels and gardens; streets have crossings, manholes, drains, hydrants, traffic lights, bus stops and power lines; suburban houses have driveways, pools and sheds; the desert has ranches, trailers, shacks and windmills; the north has hamlets along ploughed lanes and ski lodges; and districts blend into each other at the edges
- Rivers with bridges (wading slows you down), ponds, frozen rivers and dry washes
- Weather and seasons: rain, thunderstorms with lightning strikes, fog, snow, blizzards, sandstorms and ashfall; spring, summer, fall and winter
- Wind: a breeze on a calm day, stronger in rain, a gale in storms. Its direction wanders and gusts roll across the city as waves you can watch moving through the trees and grass. Trees and bushes lean and sway, flames and smoke bend downwind, and paper, plastic bags, leaves, tumbleweeds, snow and ash skitter along the ground. The HUD shows the wind with an arrow
- Ambience: a breeze that swells with each gust and whistles between buildings when it picks up, the low drone of the city, crickets and cicadas, and far-off sounds that fit each district: sirens, horns, helicopters and gunfire downtown; dogs, birdsong, wind chimes and frogs in the suburbs; crows, groaning steel and a church bell in the ruins; creaks and collapses where it burns; coyotes, hawks and rattlesnakes in the desert; wolves and cracking ice up north
- Things to touch: bushes and grass that shake, trees, traffic cones and trash cans to kick, explosive barrels, car alarms that lure zombies, birds that take off, footprints in snow and sand
- Layered gun sounds for every weapon, with shell casings and echoes that change with the district
- A light show that reacts to the radio or your own music
- Settings with a simple Basic page and an Advanced page for graphics, sound (master, music, effects, gunfire, ambience and menu volume), gameplay, controls, accessibility and the system
- Touch, keyboard and mouse, and controllers (Xbox, PlayStation, Switch and others), picked automatically from what you last used. Mouse aim with a crosshair, twin-stick aiming on a controller, optional aim assist or auto-aim, full key and button rebinding, controller rumble and menus you can drive with a controller
- Your name on the main menu, at the top left during a run and on the leaderboard, with the device each score was played on
- Wi-Fi co-op for 2 to 4 players: a PC hosts, phones and other PCs on the same Wi-Fi join, with revives, shared cards and a shared A-10
- Free accounts with encrypted cloud saves across devices, one global season board, and a name filter
- Loading screens with tips that show what is being prepared (starting the game, after the intro, going into a run, joining co-op) and stay up only as long as the work takes
- Tunes itself to your device: it detects the hardware, adjusts resolution, weather and world detail as you play, and cleans up its own caches

## Versions

| Version | Highlights |
|---|---|
| **1.9.927** | The construction site comes alive: the workers are jointed puppets that shamble with a limp, breathe, blink (one eye wanders off on its own), flap their jaws and wear springy hard hats, with flies buzzing round their heads. Running gags: the hammerer smashes his thumb and hops about swearing in symbols, Kevin's plank bonks Gary the crispy flagger every time he turns, the welder bonks the fine zombie back down when he sits up to wave, the napper's snot bubble pops and wakes him, someone peeks out of the porta-potty and slams the door, the wheelbarrow hits a bump and the bones fly, and a crow lands on the crane's sign to caw. A spinning cement mixer, a crane operator nodding to his headphones, a flickering work lamp, welding flashes, bats across the moon and a "Zombies at work" sign. The foreman skull laughs at every gag. |
| **1.9.926** | The maintenance screen is a construction site while 2.0 is built: zombie workers in hard hats carry planks, hammer on the scaffold, wheel bones about and weld "a fine zombie" together (he sits up and waves), one sleeps on a crate, and the crane swings the 2.0 sign. The skull is the foreman: he wears a hard hat, talks through 100 lines, 24 of them hints about 2.0 (the game counts the ones you have found), and says when it's done before the city opens again. Tap him for the next line. |
| **1.9.925** | Parked cars are back (they had gone invisible). A more detailed, more believable city: plazas come as gardens, squares, markets or courts; rooftops, streets, suburbs, the desert and the north all get new structures and street detail, districts blend at their edges, snow drifts with the wind, burnt plazas are scorched and rubble no longer sits in black holes. Wind in the weather system, from a gentle breeze to a gale, with gusts you can see coming through the trees, debris blowing along the ground and dust devils in the desert. Far more ambience: wind that swells and whistles, insects, and distant sounds for every district. |
| **1.9.90** | Wi-Fi co-op fixed and built out: picking cards no longer freezes the host or the team (numbered rounds, resent cards, a 30-second timer that picks for anyone away), dropped connections reconnect into the same run, and phones and PCs keep up with the host instead of falling behind. Live ping in the lobby and on the HUD (switch it off in game), arrows on the screen edge that point to teammates, and markers you drop for the team with G. Loading screens everywhere: starting up, after the intro (watched or skipped), going into a run, joining a game and back to the menu. A Windows installer (`ZombieCity-Setup.exe`) with Start menu and desktop shortcuts, and a borderless launcher that opens the game in its own window. Maintenance mode and test builds, so updates go through dev, test and publish. The studio admin's name, and names that pose as the studio are refused. A different account logging in on the same device no longer mixes progress. |
| **1.9.82** | The game's home is now the DeclAIre-ZombieCity repository: the launcher checks its releases for updates, and the browser version and the website's download buttons point to it. |
| **1.9.80** | DeclAIre Studios accounts: make a free account with an email and password and your progress follows you to every phone and PC. Saves are merged after every run (unlocks add up, bests are kept, totals count every device) and encrypted on the device with a key made for each account and locked with its password. One global season board for the website, Android and Windows, under your account name. A filter keeps slurs, swearing and personal details out of every name, with 50 remarks for those who try. The account page on the website shows your stats and changes your name or password, or deletes the account. The launcher shows who is signed in and explains why an update check failed. |
| **1.9.70** | Wi-Fi co-op: up to four players on the same Wi-Fi play one run together. A PC hosts from the Windows launcher, and phones and other PCs find the game in a list and join. Everyone fights the same zombies, bosses and weather in the same generated city, teammates show with their name and color, the score is shared, downed players are revived by standing next to them, every player picks a card after each wave, and the whole team can call in the A-10. The Windows app is now the Zombie City Launcher: a launcher screen with the news, a Play button and a check for updates, which downloads new versions of the game from GitHub, checks them and installs them, and still plays offline with the copy it carries. Back to the launcher and Quit sit on the main menu. |
| **1.9.60** | Play on PC with a keyboard and mouse or on any device with a controller, and aim for yourself: the mouse aims with a crosshair (hold left click to fire), and on a controller the left stick moves and the right stick aims and fires. Aim assist, auto-aim and the firing style can be set separately for each, and V (or R3) switches auto-aim on the fly. The game detects whether you are on a touch screen, a keyboard and mouse or a controller and switches the moment you pick up something else, changing the HUD and the hints to match. Every key, mouse button and controller button can be reassigned in Settings > Controls (with swapping, clearing and reset), the controller drives every menu (A chooses, B goes back, LB and RB flip tabs) and rumbles on big hits. Type your name on the main menu: it shows at the top left during a run and goes on the leaderboard together with what you played on, and the board can be filtered by phone, PC or controller. The main menu has a survivor file with your record, a controls card and the top of the board on wide screens, the armory has a loadout panel beside the racks, and the intro's road now runs through a city that builds itself around it. New Windows app. |
| **1.9.50** | The city is now a procedurally generated world, different every run. It is split into named districts: downtown, burning districts full of fires, riot zones with barricades and police lights, destroyed blocks of rubble and craters, grey ash towns, leafy suburbs, deserts with mesas and cacti, and the snowy frozen north. Rivers wind through everything; roads cross them on bridges, and wading through the water slows you (and the zombies) down. In the desert they are dry washes, up north they freeze over. The weather changes as you play: rain, thunderstorms whose lightning strikes the street (and conducts through water), fog, snow, blizzards, sandstorms and ashfall, and the season turns from spring to winter. Bushes and grass shake when you or the zombies push through, trees drop leaves, cones and trash cans get kicked around, red barrels explode when shot, parked cars set off alarms that pull zombies in, crows take off as you get close, and you leave footprints in snow and sand. Every gun has a new layered sound with shell casings and echoes that follow the district. New Settings: a Basic page and an Advanced page with Graphics, Sound (sliders for master, music, effects, gunfire, ambience and menus), Gameplay, Controls, Accessibility and System. The quality governor now also trims weather and tree animation, builds new streets ahead of you, and scales world detail to the device. |
| **1.9.10** | 25 dashes, each with its own effect on you and the zombies plus an always-on passive: Sprint, Shoulder Charge, Baseball Slide, Smoke Bomb, Adrenaline Rush, Frost Step, Flame Dash, Thunder Dash, Toxic Trail, Blink, Phantom Walk, Shockwave Slam, Blood Rush, Gravity Well, Hologram Decoy, Rocket Boots, Time Warp, Berserker, Holy Ground, Ninja Vanish, Meteor Strike, Dragon's Breath, Void Rift, Storm Rider and Warthog Run. Find them on cards during a run and pick your starting dash in the armory. The A-10 is louder and more epic: a deep GAU-8 BRRRT that echoes off the buildings after the rounds land, engine smoke trails, a gun smoke cloud, tracers, and high-explosive rounds that splash damage and leave bullet holes in the road. |
| **1.9.01** | The armory is now a full back room behind a chain-link cage: gun racks, a workbench, a neon ARMORY sign, a wall clock that shows the real time, a shelf radio that pulses with FM 66.6, dripping pipes and a rat. The keeper has 15 animations: cleaning his rifle, sleeping, reciting funny Shakespeare, a coffee break, aiming at you, flipping a bullet, reloading, reading the paper, waving, humming to the radio, sharpening a machete, swatting a fly, juggling grenades, a blackout and a thumbs up when you equip a weapon. Ring the bell to get his attention. The rare skull moment (still 0.001%) now tears in with a glitch. Epic and legendary weapons glow in the armory. |
| **1.9** | The music is now a radio, FM 66.6, that runs apart from the game, so heavy fights can't make it skip or go silent. It has 7 channels with 35 songs each, and one song ends before the next fades in. Bluetooth plays a playlist of your own songs. Mute, change the channel or skip from the HUD, the title screen or the pause menu (or press M, N, [ and ]). Kills now clink like dog tags, ping, then hit with a deep echoing pop that grows more epic every 25 kills. A new pause screen, more animation across the menus, better landscape layouts, and the armory has a keeper sitting in his cage. |
| **1.8** | Chain kills now hit with a punchy 8-bit pop that turns into deeper retro bass every 25 kills, adding an 808 boom, a crushed burst, a distorted power-chord stab and finally a full retro explosion. Each gunshot cuts off the one before it, so rapid fire stays clean. Every wave song has a heavy metal and orchestral layer that gets heavier as the waves climb. Bullets now leave from the muzzle of the gun you're holding. |
| **1.7** | The intro is the first thing on screen (no flash of the menu) and flows straight through: the skull's bite punches red and black, everything sinks into darkness except its red eyes, and the studio name slams in below them. The letters of CLAUDE then orbit in 3D and lock into the word on the music's hit, with a light ring and beat shockwaves, and the card crossfades into the title screen. |
| **1.6** | The intro starts on its own (in a browser that blocks sound, the first tap turns the sound on without skipping). The stampede is now heavy stomping footfalls panned with the horde, and the skull's laugh is a deep, layered demonic laugh with a cavernous echo. |
| **1.5** | The "Made with Claude" card now plays the finale of "gods heaven": the title lands on a beat, the light rays pulse with the music, and the song's hard stop closes the card before the fade into the game. |
| **1.4** | A studio intro at launch: a road is built block by block, the player sprints across it with a stampede of zombies behind, and the skull bites the road into a red-and-black freeze under the DeclAIre Studios name. Then an orchestral "Made with Claude" title card fades into the game. Tap to skip. |
| **1.3** | The game detects your device and adjusts quality on its own while you play: resolution, effects and level of detail for zombies and bosses. It caps at 60 fps on fast-refresh screens, follows battery saver and phone heat, frees memory when Android asks, and repairs itself if the game loop or audio stalls. A new Performance panel shows what it's doing. Fonts are built in, so nothing loads from the internet. |
| **1.2** | Sound effects no longer break up the music. The light show now follows the beat of your own songs, even loud ones. Bullets can hit zombies right on top of you. |
| **1.1** | A different song for every wave, 50 mutating bosses, the A-10 airstrike, the skull wheel and the Overlord. |
| **1.0** | First Android app release. |

## Building from source

The game is plain JavaScript split into modules that `build.js` joins into one page. They all share one script, so `build.js` stops if two modules define a function with the same name (one would silently replace the other):

| File | What it holds |
|---|---|
| `shell.html` | Page layout, menus and styles |
| `game.js` | Core game loop, zombies, waves and drawing |
| `world.js` | The generated world: districts, biomes, rivers, bridges, seasons and how each city block is drawn |
| `life.js` | Things you can touch: bushes, grass, trees, props, explosive barrels, birds, fires, car alarms, footprints, water |
| `weather.js` | Weather: rain, storms and lightning, fog, snow, sandstorms, ash, leaves, the wind and its gusts, blowing debris, the ambience scheduler (which far-off sound plays when), and what weather does to the game |
| `settings.js` | The Settings screen (Basic and Advanced) and how each setting is applied |
| `arsenal.js` | Firing, cards, the skull and the wheel |
| `bossai.js` | Boss moves, mutations, the Overlord and the A-10 |
| `bosses.js` | The 50-boss roster and how each one is drawn |
| `mutations.js` | The mutation list |
| `weapons.js` | The weapon list |
| `audio.js` | Sound effects, the intro's score and the instruments the radio plays |
| `sfx2.js` | Gun sounds, weather ambience (rain, wind and its whistle, rivers, fire, the city's drone, insects), thunder, the far-off sounds of each district, and the sounds of the world (joined into `audio.js` at build time) |
| `dashes.js` | The 25 dashes: what each does, their passives, cards and the armory tab |
| `keeper.html`, `keeper.css`, `keeper.js` | The armory keeper: his room, his 15 animations and the glitch |
| `radio.js` | FM 66.6: the song generator, the seven channels, offline rendering and the Bluetooth player |
| `perf.js` | Device detection, the quality governor, LOD settings, cache refresher and self-repair |
| `intro.js` | The DeclAIre Studios intro (with the city that builds itself around the road) and the "Made with Claude" card |
| `input.js` | Touch, keyboard and mouse, and controller input: device detection, aiming, rebinding and menu navigation |
| `profile.js` | Your name, your record across runs and the main menu's side panel |
| `loader.js` | The loading screens: the steps, the progress bar and the tips |
| `net.js` | Wi-Fi co-op: hosting and joining, the host's snapshots of the run, teammates, revives, shared cards and the co-op screen |
| `acct-core.js` | Accounts: Wix sign-in over REST, the per-account keys and encryption, save records and the global board (shared with the account page) |
| `maint.js` | The maintenance screen: the construction-site scene (jointed zombie puppets and their gags), the foreman skull and his 100 lines (24 hints), and the made-up progress bar |
| `account.js` | The game's Account sheet, merging this device's progress with the cloud save, and syncing after runs |
| `filter.js`, `filterdata.js` | The name filter and its 50 remarks. `filterdata.js` is generated by `tools/make_filter_data.py` from the [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) English list (CC BY 4.0) |
| `site/` | The account page (log in, sign up, stats, name and password changes, account deletion, the global board, privacy policy). `python3 tools/build_site.py` writes `site/dist/` for upload to the Wix site |
| `desktop/` | The Windows launcher: Electron's `main.js` (the borderless launcher window and the game window) and `preload.js`, the launcher screen (`launcher.html`), the Wi-Fi co-op server (`lan.js`), the packaging script (`build_win.py`), the exe icon patcher, and the installer (`installer/installer.nsi`, built by `build_setup.py`) |
| `tools/` | `release.py` (the dev, test and publish phases), `build_site.py` (the account page), `make_filter_data.py` (the name filter's data) and `make_installer_art.py` (the installer's pictures and icon) |
| `index.html`, `.nojekyll` | The GitHub Pages entry point, which opens `zombie-city.html` (turn on Pages for the main branch, root folder) |
| `fonts/` | The three fonts (embedded into the page at build time) and their licenses |
| `media/` | The intro card's music clip (embedded into the page at build time) |

```sh
node build.js          # browser version -> zombie-city.html (+ zombie-city-offline.html)
node build.js app      # Android page    -> android/www/index.html
node build.js win      # Windows launcher -> desktop/app/ (launcher.html, game/index.html, game/game.json)
```

To build the Windows launcher, download Electron's Windows x64 zip (`electron-v33.2.1-win32-x64.zip` from Electron's GitHub releases) and run:

```sh
python3 desktop/build_win.py electron-v33.2.1-win32-x64.zip out 1.9.925
ZC_NSIS=/path/to/nsis python3 desktop/build_setup.py out/ZombieCity-Launcher-Windows.zip out 1.9.925
```

The first writes `out/ZombieCity-Launcher-Windows.zip` plus `zombie-city-game.html` and `game.json`; the second turns the zip into `out/ZombieCity-Setup.exe` with [NSIS](https://nsis.sourceforge.io/) 3 (`makensis` on Windows or Linux; `ZC_NSIS` is the folder that holds NSIS's `Include`, `Contrib` and `Stubs`). To ship a game update to everyone who has the launcher, attach those two files (with exactly those names) to a new release on this repository; the launcher reads the newest release that has them, checks the download against the checksum in `game.json` and installs it. The repository has to be public for the launcher to see its releases.

To build the Android app you also need `aapt2`, `android.jar` (API 34), `dx.jar` and Python's `cryptography` package:

```sh
cd android
javac --release 8 -cp android.jar -d build/classes src/com/zombiecity/app/MainActivity.java   # the Wi-Fi co-op scanner and connection live in it too
java -jar dx.jar --dex --output=build/classes.dex build/classes
ZC_KEY=/path/to/zombie-city-signing-key.p12 ZC_KEY_PASS=... python3 build_apk.py
```

The signing key is kept out of this repository on purpose. Every update must be signed with the same key, or phones will refuse to install it over the old version, so keep your copy backed up somewhere safe.

## Releasing an update

Every update goes through three phases, so problems show up before players see them:

1. **Dev.** Build everything (`node build.js`, `node build.js app`, `node build.js win`, the APK and the installer) and run the tests.
2. **Test.** `python3 tools/release.py test` puts the new web version in `test/` (so [the test page](https://gabrielamidon8-sys.github.io/DeclAIre-ZombieCity/test/) gets it) while the main page keeps the published version. Commit and push, then make a GitHub release for the version with **Set as a pre-release** ticked and the five files attached (`ZombieCity-Setup.exe`, `ZombieCity-Launcher-Windows.zip`, `ZombieCity-Android.apk`, `zombie-city-game.html`, `game.json`). Only the admin's launcher sees pre-releases (its Test channel switch); players don't. Set **test** in the Game Status collection on Wix to the version, and the game shows "Test build". Anything wrong is fixed and tested again.
3. **Publish.** Turn on maintenance (Game Status: **maintenance** on, a **message** and an **until** time): players see "Down for maintenance" (a run in progress finishes first) while the admin can still play. Run `python3 tools/release.py publish`, commit and push, then edit the GitHub release: untick pre-release and tick **Set as the latest release**. Set **stable** to the version (and **minVer** too when older versions can't play with it, such as a co-op change, so they are asked to update). Turn maintenance off.

Game Status is the one-row collection on the DeclAIre Studios Wix project (Wix dashboard > CMS > Game Status). Everyone can read it, only the site's admins can change it, and the game checks it every few minutes.

