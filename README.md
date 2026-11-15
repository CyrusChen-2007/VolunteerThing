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

## Dental model

The same `body-painter/` page now has **人体模型 / 牙科模型** tabs. The dental viewer loads on first use and retains its selections when switching back to the body. It supports tooth-only and tooth-with-adjacent-gingiva selections, rotation, zoom, jaw views, and mouth opening. Each marked tooth retains its selection scope independently. Root ends outside the gingiva are removed.

The standalone viewer is `dental-model/index.html`; all runtime libraries and anatomy data are embedded, so it also works offline. The dental anatomy is an adaptation of BodyParts3D / Anatomography © DBCLS, via OrganUI, licensed CC BY-SA 2.1 Japan; see `dental-model/ATTRIBUTION.md`. This license applies to the adapted dental model and its renders. The body model retains its separate CC0 license.
