# Perennial

**A live ASCII tree that grows while you code.**

[**Live site → coding-plant.vercel.app**](https://coding-plant.vercel.app/)

Perennial is a small, dependency-free web experiment: a procedural tree drawn entirely with characters, growing in real time. Leave the tab open while you work. Type into the field-note line and the tree takes a little of that energy for itself.

![Perennial](og.png)

## What it does

- Grows a new, deterministic ASCII specimen from a seed.
- Keeps growing in real time — from germination through canopy to old growth.
- Persists locally in `localStorage`, so the same tree is waiting when you return.
- Feeds on keystrokes: typing accelerates growth and releases a small shower of nutrients.
- Pauses, resumes, reseeds, and exports the current ASCII tree as plain text.
- Responsive, keyboard accessible, and respectful of `prefers-reduced-motion`.

No images, no frameworks, no analytics. The tree is drawn character by character on a canvas and echoed as plain text.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm run dev
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173). There are no dependencies to install.

## Controls

| Control | Effect |
| --- | --- |
| **Feed the tree** | Every character adds a little growth and a bright burst of nutrients |
| **Pause growth** | Freezes the session clock and the tree |
| **New seed** | Confirms, then plants a new specimen |
| **Copy ASCII** | Copies the current tree and session details to the clipboard |
| **Save .txt** | Downloads the current tree as plain text |

Session state lives only in your browser under `perennial.session.v1`. Typed text is never stored — only the number of keys offered.

## How it works

`tree.js` is a seeded, deterministic branching system. A central trunk rises through several layers of limbs; each limb fans into smaller branches and leaf clusters. Branch birth times are absolute, so any moment in the tree's life can be reconstructed from the seed and elapsed time. `main.js` renders the result to a character grid on a canvas, adds a soft canopy density field around the foliage, and handles the session clock, local persistence, and interactions.

The palette is a small set of translucent phosphor greens, warm wood tones, and a single amber for blossom season.

## Deploy

The site is static, so it deploys anywhere. The included `vercel.json` adds security headers and clean URLs; a Vercel deployment needs no build step.

## License

[MIT](LICENSE)
