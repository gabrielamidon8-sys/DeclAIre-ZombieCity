# Zombie City

A top-down zombie survival shooter for phones and browsers. You hold the streets against waves of mutating zombies, chain kills for bigger rewards, and fight bosses that evolve mid-fight. Every wave has its own soundtrack, and the city lights up in time with the music.

## Play

- **Android:** download the latest `.apk` from the [Releases](../../releases) page and open it on your phone. Updates install over the old version and keep your saves.
- **Browser:** open `zombie-city-offline.html` in any modern browser. It's a single self-contained file that needs no internet connection.

## What's in the game

- 1,000 zombie mutations and 250 weapons
- 50 bosses that mutate into new forms, plus the Snatcher and the Overlord
- Cards, curses and forbidden cards from the skull at x100; a prize wheel at x200 and up
- An A-10 Warthog airstrike earned at chain 75
- 20 wave songs that get more intense, from synthwave to orchestral speedcore, remixed for each boss
- A light show that reacts to the built-in songs or your own music
- Tunes itself to your device: it detects the hardware, adjusts resolution and detail as you play, and cleans up its own caches

## Versions

| Version | Highlights |
|---|---|
| **1.5** | The "Made with Claude" card now plays the finale of "gods heaven": the title lands on a beat, the light rays pulse with the music, and the song's hard stop closes the card before the fade into the game. |
| **1.4** | A studio intro at launch: a road is built block by block, the player sprints across it with a stampede of zombies behind, and the skull bites the road into a red-and-black freeze under the DeclAIre Studios name. Then an orchestral "Made with Claude" title card fades into the game. Tap to skip. |
| **1.3** | The game detects your device and adjusts quality on its own while you play: resolution, effects and level of detail for zombies and bosses. It caps at 60 fps on fast-refresh screens, follows battery saver and phone heat, frees memory when Android asks, and repairs itself if the game loop or audio stalls. A new Performance panel shows what it's doing. Fonts are built in, so nothing loads from the internet. |
| **1.2** | Sound effects no longer break up the music. The light show now follows the beat of your own songs, even loud ones. Bullets can hit zombies right on top of you. |
| **1.1** | A different song for every wave, 50 mutating bosses, the A-10 airstrike, the skull wheel and the Overlord. |
| **1.0** | First Android app release. |

## Building from source

The game is plain JavaScript split into modules that `build.js` joins into one page:

| File | What it holds |
|---|---|
| `shell.html` | Page layout, menus and styles |
| `game.js` | Core game loop, zombies, waves and drawing |
| `arsenal.js` | Firing, cards, the skull and the wheel |
| `bossai.js` | Boss moves, mutations, the Overlord and the A-10 |
| `bosses.js` | The 50-boss roster and how each one is drawn |
| `mutations.js` | The mutation list |
| `weapons.js` | The weapon list |
| `audio.js` | The music engine, songs and sound effects |
| `perf.js` | Device detection, the quality governor, LOD settings, cache refresher and self-repair |
| `intro.js` | The DeclAIre Studios intro and the "Made with Claude" card |
| `fonts/` | The three fonts (embedded into the page at build time) and their licenses |
| `media/` | The intro card's music clip (embedded into the page at build time) |

```sh
node build.js          # browser version -> zombie-city.html (+ zombie-city-offline.html)
node build.js app      # Android page    -> android/www/index.html
```

To build the Android app you also need `aapt2`, `android.jar` (API 34), `dx.jar` and Python's `cryptography` package:

```sh
cd android
javac --release 8 -cp android.jar -d build/classes src/com/zombiecity/app/MainActivity.java
java -jar dx.jar --dex --output=build/classes.dex build/classes
ZC_KEY=/path/to/zombie-city-signing-key.p12 ZC_KEY_PASS=... python3 build_apk.py
```

The signing key is kept out of this repository on purpose. Every update must be signed with the same key, or phones will refuse to install it over the old version, so keep your copy backed up somewhere safe.
