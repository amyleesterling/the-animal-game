# Test deployment

The public playtest address is:

https://amyleesterling.github.io/the-animal-game/

GitHub Pages serves the compiled static game from the `gh-pages` branch.
That branch contains the contents of `dist/`, a `.nojekyll` marker, and
`build-info.json` recording the source commit. It is separate from the
reviewed source branches; publishing a test build does not merge a PR.

Build with `npm ci` and `npm run build`. Vite emits relative bundle URLs;
the model loader resolves its asset relative to the document so the same
build works at the repository subpath and at a domain root. Publish only
the compiled files, never local saves, test traces, credentials or source
dependencies. Preserve `gh-pages` history when updating the test build.

Run the complete browser suite against the hosted site in PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://amyleesterling.github.io/the-animal-game/'
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

The suite includes touch input, portrait and landscape views, saved photos,
reload, keyboard use, and model-loading failures. Mobile emulation is not a
measurement of real iPhone/Android performance. The game needs WebGL2; simple
graphics and reduced motion can help on slower devices. Saves belong to the
current browser and origin, so localhost progress does not transfer to Pages.

There is no account, camera/microphone request, or cross-device save service.
Narration uses a local English voice when available; visible text remains usable
without narration. This deployment is for playtesting the first zebra expedition.
