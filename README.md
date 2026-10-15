# Zombie City

A top-down zombie survival shooter for phones and browsers. You hold the streets against waves of mutating zombies, chain kills for bigger rewards, and fight bosses that evolve mid-fight. Every wave has its own soundtrack, and the city lights up in time with the music.

## Play

- **Android:** download the latest `.apk` from the [Releases](../../releases) page and open it on your phone. Updates install over the old version and keep your saves.
- **Browser:** open `zombie-city.html` in any modern browser. It's a single self-contained file.

## What's in the game

- 1,000 zombie mutations and 250 weapons
- 50 bosses that mutate into new forms, plus the Snatcher and the Overlord
- Cards, curses and forbidden cards from the skull at x100; a prize wheel at x200 and up
- An A-10 Warthog airstrike earned at chain 75
- 20 wave songs that get more intense, from synthwave to orchestral speedcore, remixed for each boss
- A light show that reacts to the built-in songs or your own music

## Versions

| Version | Highlights |
|---|---|
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

```sh
node build.js          # browser version -> zombie-city.html
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
