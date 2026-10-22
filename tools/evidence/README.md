# Evidence for the film engines' course (1.9.995)

`sh mk.sh` builds `dev.html` (the five film engines and the render helpers in `evid.js`).
`python3 dump.py` runs every exam and writes `course.json`; `python3 ev.py <list.json> <tag>` renders pictures into `ev/`;
`python3 sheets.py` lays out one sheet per engine and version in `sheets/` (needs Playwright with Chromium, Pillow and
matplotlib). The studio (`studio/`, `node tools/build_studio.js`) shows the same sheets and can run the exams itself.
