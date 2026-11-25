# Perennial for VS Code

A living ASCII tree, fed by the time you actually spend in VS Code.

The extension tracks focused VS Code time, keeps the same deterministic tree between sessions, and opens the Perennial interface in a webview. The tree starts as a seed. Its clock pauses when you pause it or when VS Code loses focus. It lives in VS Code's global storage, not a browser tab.

## Use

- Install the packaged extension:
  ```bash
  code --install-extension perennial-vscode-0.2.0.vsix
  ```
- Reload VS Code if prompted.
- The tree opens automatically the first time. After that, click the **Perennial** status bar item or run **Perennial: Open Tree** from the Command Palette.
- The tree page's own controls work in the webview: pause/resume, plant a new seed, focus mode, copy ASCII, and save the current tree as text.

## Commands

| Command | Effect |
| --- | --- |
| `Perennial: Open Tree` | Opens or reveals the tree webview |
| `Perennial: Pause or Resume Growth` | Pauses/resumes VS Code time |
| `Perennial: Plant New Seed` | Starts a fresh tree at zero |

## What counts as time

Time accumulates while the VS Code window is focused. When VS Code loses focus, the clock stops. The status bar shows the current session time and whether the tree is paused or idle.

The pacing is intentionally slow: a seed for about twenty seconds, first leaves after roughly ten minutes, and a full canopy after about eight hours of focused time. Leave the tree open across a workday. The interface follows your local dawn, day, dusk, and night; focus mode hides the surrounding UI when you want just the tree.

Typing in the tree's **Feed the tree** field still adds a little extra growth.

## Development

The webview loads a copy of the site bundled in `media/`. Sync those files whenever the parent site changes:

```bash
npm run sync-media
npm run package
```

The site source lives in the parent repository. This extension has no runtime dependencies beyond VS Code and Node's built-in modules.

## License

MIT
