# Teduh design system (design.md)

Winner of the /design bracket on 2026-11-07: direction A "Field guide" (beat "Signal" 3-0 and "Air" 3-0 on council votes).
References: Dorfromantik (warm muted palette, goals pinned into the world), botanical field guides (serif names,
hairline rules, specimen dots), Islanders and Townscaper (keep the world visible; little chrome).

## Palette (one accent)
| token | hex | use |
|---|---|---|
| paper | #f8f3e8 | panels, HUD cards |
| paper-2 | #efe7d6 | insets, hover |
| ink | #23302a | text, the action pill (13.2:1 on paper) |
| muted | #56615a | secondary text (6.1:1 on paper) |
| line | #d9cfba | hairlines, double rules |
| accent (forest) | #2f5d4a | the only accent: primary buttons, goal bar, progress (7.4:1 with white) |
| sun | #c9951a | energy meter only |
| warn | #9c3b26 | missing materials (6.3:1 on paper) |

No purple, violet or indigo anywhere (tests/run_tests.py fails the build on hues 255-320).

## Type
- Display: Fraunces 600 (bundled woff2): panel titles, clock, coins, goal title, numbers in facts.
- Body: Figtree 400-700 (bundled woff2): everything else. Never Inter.
- Small caps labels: 12 px, 700, letter-spacing .1-.14em (kickers, place name).

## Spacing, radius, motion
- Scale 4, 8, 12, 16, 24, 32 px. Radius 6 px for cards, pills (999 px) for buttons, dock and toasts.
- Shadow: one soft shadow token. Motion only for meters and toasts; prefers-reduced-motion turns it off.
- Tap targets 44 px minimum (40 px small buttons inside panels, 32 px only for in-list Give buttons).

## Signature
The field-guide page: serif names over a 3 px double rule, specimen dots for every material, ruled two-column
recipe lists, and a forest-green left bar on the goal card. In the world, the gold beacon marks the current goal.

## Voice
Plain, calm, second person. Facts a player can check ("Two scrap make one wire"). No hype words, no emoji,
no exclamation marks except villagers' greetings.

## Banned defaults
Purple or blue-to-purple gradients, glow blobs, glassmorphism, emoji icons, Inter-only type, identical rounded
card grids with icons, gradient text, centre-everything layouts, fake testimonials, "Get started" as the only CTA.
