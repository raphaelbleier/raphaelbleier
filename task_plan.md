# Task Plan: GitHub Profile README

## Goal
Create a custom GitHub profile README for `raphaelbleier` that:
- Shows all public projects with descriptions
- Shows language/tech stats (including private repo hints via wakatime/stats cards)
- Displays GitHub stats (commits, stars, streak)
- Matches raphael.bleier.uk design aesthetic

## Design System (from website)
- Background: #050505 (deep black)
- Surface: #0f0f0f / #1a1a1a
- Primary Text: #ffffff
- Secondary Text: #a1a1aa (zinc gray)
- Accent: #38bdf8 (sky blue)
- Font: Inter
- Subtle grid overlay (radial-gradient dots 24px spacing)
- Tagline: "Building scalable web solutions & automating the mundane."

## GitHub Data
- Username: raphaelbleier
- Public repos: 6
- Bio: "Currently studying applied computer science 💯"
- Followers: 2

## Public Repos
1. SE2Einzelphase (Kotlin)
2. geminibrowserextension (JavaScript) - ⭐1
3. SpotifyToWled (Python) - Spotify cover color to WLED LEDs
4. aau_smartgreenhouse (JavaScript) - Smart greenhouse AAU
5. Local-Media-Wish-Management-App-React-Node (JavaScript)
6. react-resume (fork, no language shown)

## Approach
GitHub Profile README (repo: raphaelbleier/raphaelbleier)
- Uses github-readme-stats for stat cards + language card + streak stats
- All cards themed to match website (#050505 bg, #38bdf8 accent, white text)
- Project cards for public repos
- Custom SVG-based header section
- GitHub Actions to keep stats fresh

## Phases
- [x] Research: Design + GitHub data gathered
- [ ] Create README.md with full content
- [ ] Create GitHub Actions workflow for auto-update (optional dynamic parts)
- [ ] Create setup instructions

## Constraints
- GitHub README only supports: Markdown, limited HTML, external images/SVGs
- No custom CSS/JS
- Private repo data: language stats can be shown via github-readme-stats with user token (self-hosted or via their service with private_count=true)
