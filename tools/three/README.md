# three.js for the 3D view (1.9.999)

`vendor/three-r170.min.js` is three.js r170 (MIT) with the add-ons the 3D view uses, bundled as one global `THREE`.
To rebuild it:

```
npm install three@0.170.0 esbuild@0.24.0
npx esbuild tools/three/entry.js --bundle --minify --format=iife --legal-comments=none --target=es2019 --outfile=three-zc.js
```

then put the license header back on top (see the first lines of the vendored file).
