# ZIP read dependency

`fflate-0.8.2.min.js` is the unchanged UMD distribution of **fflate 0.8.2** (32,665 bytes), MIT, Arjun Barrett. License: `fflate-LICENSE.txt`.

Source: https://registry.npmjs.org/fflate/-/fflate-0.8.2.tgz (`package/umd/index.js`). Retrieved with `npm pack fflate@0.8.2`; the registry tarball's SHA-512 integrity was independently verified:

```
sha512-cPJU47OaAoCbg0pBvzsgpTPhmhqI5eJjh/JIu8tPj5q+T7iLvW/JAYUqmE7KOB4R1ZyEhzBaIQpQpardBF5z8A==
```

Vendored script SHA-256:

```
c3b34f2e9f5e74d4d7d64e01cac7a0c01954c6c406414d42185c7b53d6875ddf
```

Loaded locally on demand by the existing asset library's import mode. Application use is limited to `AsyncInflate` for reading bounded ZIP members. No application ZIP writing, external CDN dependency, package manager at runtime, or second compression library. Tests additionally use `zipSync` to create synthetic fixtures.
