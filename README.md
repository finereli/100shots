# 100 Shots

100 Shots is a skill-building method for creators and founders learning to put themselves out there and sell: you focus on attempts, not success or failure, and get a little better with each one, until skill meets luck and you achieve liftoff.

This repo is the app for it, live at **https://100shots.finereli.com**. The method itself is written up at [/about](https://100shots.finereli.com/about).

## The method

Decide in advance that you'll be bad at something 100 times. Your first attempt is number 100, the next is 99. Every attempt counts, good or bad, so a bad sales call is one of the hundred you planned for and not proof that you can't sell. After each one, write down what worked and what you'll try next.

Most people try something like posting or cold outreach two or three times and quit, right before it would have started to work. When you count down you watch the number instead of the fear, the way you do when you count backwards before anesthesia.

## The app

- A card per skill with the shots left out of 100. One tap per attempt, with Undo.
- A note sheet after every shot (or only on request), and a history where any shot's note can be read and edited.
- No streaks: a week off costs nothing, ten attempts in a day count as ten.
- Drag to reorder, a small-card view, an optional evening reminder.
- Local-first and offline. Optional Google sign-in syncs across devices.

## Development

Svelte 5 + Vite + TypeScript PWA, built on Eli's pwa kit (`shared/` holds the vendored kit files). Served by a Cloudflare Worker with D1 for sync and Web Push reminders. Details for working on it are in [CLAUDE.md](CLAUDE.md).

```sh
npm install
npm run dev      # local dev
npm run build    # svelte-check + build
npm test         # merge and reminder tests
npm run deploy   # test, build, migrate D1, deploy (needs CLOUDFLARE_API_TOKEN)
```

Made by [Eli Finer](https://finereli.com).
