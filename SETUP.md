# GitHub Profile README Setup

## 1. Create the special profile repo

Create a new GitHub repo named exactly: `raphaelbleier`
(same as your username — GitHub uses this as your profile README)

→ https://github.com/new
- Repository name: `raphaelbleier`
- Public: ✓
- Add README: ✓ (or just push this one)

## 2. Copy the README

Copy `README.md` from this folder into the new repo.

## 3. Enable private repo language stats

For the language card to count your private repos:

1. Go to: https://github.com/settings/tokens
2. Generate a new token (classic) with: `repo` scope
3. Go to your `raphaelbleier` repo → Settings → Secrets → Actions
4. Add a secret named `GH_STATS_TOKEN` with that token value
5. The `count_private=true` parameter in the stats URLs will then work

## 4. Add repo descriptions (optional but recommended)

The project cards look better with descriptions. Go to each repo and add one:
- `SE2Einzelphase` → e.g. "Android app — Software Engineering 2 coursework"
- `geminibrowserextension` → e.g. "Google Gemini browser extension for quick AI access"
- `Local-Media-Wish-Management-App-React-Node` → e.g. "Full-stack wish list app for local media"

## 5. Pin repos (optional)

On your GitHub profile, you can pin up to 6 repos via "Customize your pins".
The README cards will still show regardless.
