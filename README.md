# VolunteerThing
A Thing-y to promote volunteer commitment and engegement


## Interactive 3D body painter (UI/UX prototype)

The `body-painter/` directory contains the standalone browser demo: a CC0 rigged human model, 3D surface painting and erasing, undo, arm posing, unrestricted rotation, and fast zoom. Model picking and brush updates are optimized for interactive painting.

Run from this repository:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/body-painter/`. All model and library assets are included; no API key or build step is required. Serve over HTTP rather than opening the HTML directly.

See [integration instructions and model credits](body-painter/README.md) for embedding and the annotation save/restore API. Annotations remain in page memory unless the host application saves them.
