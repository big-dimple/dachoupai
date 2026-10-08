# Asset Credits and Asset Licenses

**This file is the effective licence record for media assets in this project.**

The root [Apache-2.0 licence](LICENSE) covers **source code only**. Models, textures, sky panoramas, audio, music, screenshots, and other media are governed by the entries below, and those entries take precedence over Apache-2.0 for the corresponding files. **Media not listed here is not licensed to you by Apache-2.0.** A missing record means "not yet documented," not "free to reuse."

## Redistribution tiers

| Tier | Meaning |
|---|---|
| `Yes` | Public-domain, CC0, MIT, or equivalent media; commercial and non-commercial redistribution is allowed. |
| `Yes, attribution required` | Redistribution is allowed only while the required credit and licence notice travel with the file. |
| `With the project only` | Project-created media may ship inside a working fork of VOIDCLAD, but may not be extracted, resold, or repackaged as an asset pack. |
| `No, permission required` | Paid, commissioned, or otherwise redistribution-restricted media; it must be removed before distributing a fork unless you hold permission. In this project that tier is not shipped at all — see below. |

## Excluded from this snapshot — the `No, permission required` tier

Two third-party models used by the private development tree are **not distributed here**, and both are enforced by the publication exclusion list rather than by good intentions:

| Asset | Creator | Source | Licence position | Why excluded | Runtime effect |
|---|---|---|---|---|---|
| `assets/vendor/sentry_turrets/**` (3 GLB + 4 textures + provenance) | 3Darknight | [Sci-Fi Modular Sentry Gun](https://3darknight.itch.io/sci-fi-modular-sentry-gun) | Custom licence: commercial use and modification permitted, **resale, redistribution and repackaging forbidden** | Publishing the files would be redistribution, which the licence forbids | `ShipVisual._build_model_turret()` finds no model and falls back to `_build_primitive_turret()` — the industrial faction's main mounts draw as procedurally built primitives. The energy emitter and swarm carapace pod are procedural anyway and unchanged. The lobby fitting preview falls back to a glowing node. |
| `assets/vendor/niko_spaceships/niko_fighter.glb` | niko-3d-models | [Free Sci-Fi Spaceships Pack](https://niko-3d-models.itch.io/free-sc-fi-spaceships-pack) | Storefront wording only — "free for personal and commercial use, no attribution" — with **no licence badge and no bundled licence file** | An informal page sentence is too weak a basis to redistribute someone else's mesh; excluded pending an owner licensing decision | `SquadronVisual` loads no mesh, so carrier strike wings are **simulated but not rendered**. The sim, its hashes, and the squadron tests are unaffected; the `wing` shot preset has nothing to frame. |

Nothing else in this repository is redistribution-restricted, so a fork of *this* snapshot has nothing it must delete.

## What a fork must keep

1. **The CC-BY music attribution.** Four tracks are CC-BY 4.0 and the credit must travel with them, in the product as well as in this file: *"Music: 'Aurora', 'Penumbra', 'Celestial', 'Decoherence' by Scott Buckley — released under CC-BY 4.0. www.scottbuckley.com.au"*. It currently ships inside the game's lobby credit line; keep it there.
2. **The sky-panorama credit and its AI restriction.** The author's terms permit commercial use, adaptation, and redistribution and ask for credit; they also forbid feeding the images into machine-learning training pipelines. Shipping them in a game is fine; training on them is not. Because that record is a storefront statement rather than a formal licence deed, this register applies the stricter of the plausible readings and files them as `Yes, attribution required`.
3. **The upstream licence texts already in the tree** — `assets/vendor/kenney_space_kit/KENNEY_License.txt`, `assets/vendor/majadroid/PROVENANCE.txt`, `assets/sfx/kenney/PROVENANCE.txt` — and this file.

Attribution is *not* legally required for the CC0 hulls, textures, and combat recordings; credit is given below because it is the decent thing to do.

## Inventory scope

This register covers **80 media files**: 68 third-party payloads (12 Quaternius, 24 Majadroid, 5 Kenney Space Kit models, 17 Kenney sound effects, 2 sky panoramas, 4 CC0 combat recordings, 4 CC-BY music tracks) and 12 first-party payloads (8 generated sound cues, 4 screenshots). Godot `*.import` files, `*.assetforge.json` sidecars, provenance notes, and upstream licence texts are metadata rather than media payloads and are not counted.

## Third-party hulls and props — CC0

Licence verified at pull time both on the source page and in the pack's own licence file; only a subset of each pack was copied in. Faction hull families: the angular Quaternius glTF family serves industrial and energy, the organic Majadroid OBJ family serves the swarm, and the Kenney props serve station dressing and sensor-dish fittings.

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/vendor/quaternius_ultimate_spaceships/Bob.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `73f187cd1a11e487a1b20405bfa59d3d9f98ef4960ee64e3f062a7373aa095ad` |
| `assets/vendor/quaternius_ultimate_spaceships/Bob_Bob_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `d65341b1c91903d53e3897b2b3387420eb3a9e56a67ffb731f73597527ca3c6e` |
| `assets/vendor/quaternius_ultimate_spaceships/Challenger.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `c600b39fd587c323557c682e7aae2e976b62fff2984929163b7ee12a0e4323fd` |
| `assets/vendor/quaternius_ultimate_spaceships/Challenger_Challenger_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `159d27e8d0644d5b5807fccb50206715fd45d66d95c8631dc222e1fe9cfd224b` |
| `assets/vendor/quaternius_ultimate_spaceships/Dispatcher.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `e76c42a694ac602152ee0c8a897f6c79a894da716d22410838892df0d04e8d5c` |
| `assets/vendor/quaternius_ultimate_spaceships/Dispatcher_Dispatcher_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `0a0f80acff5d07ae8cc34d1fe1f45bcf44ffd40e1fba9916cf00397cb62f03a0` |
| `assets/vendor/quaternius_ultimate_spaceships/Executioner.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `95dd08b854b0588480e91515949c5fd3e329ec856882e2b58b71e4cdc41348f9` |
| `assets/vendor/quaternius_ultimate_spaceships/Executioner_Executioner_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `ab50ca81a14e88ea366c591d7f5d769cd0e41bcb0d4df1df5b931de4b3758cc5` |
| `assets/vendor/quaternius_ultimate_spaceships/Imperial.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `389012d28270b859adb48ce12d1307af536f395ed734aafcb30f59ec8a9bb2e3` |
| `assets/vendor/quaternius_ultimate_spaceships/Imperial_Imperial_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `3d3b3fb5120ec211308ac0602d21eb8433bc6b8ac88109d5c90a757cdc6df234` |
| `assets/vendor/quaternius_ultimate_spaceships/Insurgent.gltf` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — source glTF hull | CC0-1.0 | `Yes` | `a6e75f658d4133bf8e96172a410b1daa8c3a8179f9c77b033f9d9cdaa04cb419` |
| `assets/vendor/quaternius_ultimate_spaceships/Insurgent_Insurgent_Orange.png` | Quaternius (quaternius.com) | [Ultimate Spaceships pack](https://quaternius.com/packs/ultimatespaceships.html) — Godot-extracted embedded diffuse texture | CC0-1.0 | `Yes` | `747cc0798c673cfeb8294cf70786f5028b655a8b7beeb67d107d48ed4a2716ed` |
| `assets/vendor/majadroid/m1-ship1.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `c8a5c68ae5d10cc5055a328e24aab780d32b6f350f745d5ba5069b22431f8bfc` |
| `assets/vendor/majadroid/m1-ship1.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `4f2877ec2e7213f81e4a89813fd6dfc368c291ecac454cc9eba5a7fbe4a7812b` |
| `assets/vendor/majadroid/m1-ship2.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `c8a5c68ae5d10cc5055a328e24aab780d32b6f350f745d5ba5069b22431f8bfc` |
| `assets/vendor/majadroid/m1-ship2.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `1a082174715db779b7834270a5d86f0cb102442a6e77ec166e93ac74468b9802` |
| `assets/vendor/majadroid/m1-ship3.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `c8a5c68ae5d10cc5055a328e24aab780d32b6f350f745d5ba5069b22431f8bfc` |
| `assets/vendor/majadroid/m1-ship3.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `236736c0deb217f2163949699cbb1877d8b4198c14647b292e4047ab5ce48f42` |
| `assets/vendor/majadroid/m1-ship5.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `c8a5c68ae5d10cc5055a328e24aab780d32b6f350f745d5ba5069b22431f8bfc` |
| `assets/vendor/majadroid/m1-ship5.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `0461488402aa7eb4022333a52cd4f33cbab81ec9eb25800658ad47348e516eaf` |
| `assets/vendor/majadroid/m2-ship1.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `a7a7f1bfd2d49b433f635764499707e91e7acd9710724ca17f64036a8ab627fc` |
| `assets/vendor/majadroid/m2-ship1.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `b1465d75e1a33f923ff30f4dbbb45ba01026085372ba3823cc2e65ce45498dc5` |
| `assets/vendor/majadroid/m2-ship2.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `a7a7f1bfd2d49b433f635764499707e91e7acd9710724ca17f64036a8ab627fc` |
| `assets/vendor/majadroid/m2-ship2.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `628888f4fb1c1ea5ff4e00d928e1ad57aba1dc0890d85c85991cfebf80f09299` |
| `assets/vendor/majadroid/m3-ship1.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `e32dd808da75b9871335c4ea15c28b0eab44f4556f0eb4f45766ce27752b5610` |
| `assets/vendor/majadroid/m3-ship1.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `26c5d176b08832fc89f531fd5e5826d478559d7527bdffa2a45987aed76a8b16` |
| `assets/vendor/majadroid/m3-ship2.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `e32dd808da75b9871335c4ea15c28b0eab44f4556f0eb4f45766ce27752b5610` |
| `assets/vendor/majadroid/m3-ship2.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `af74251bf841af7d01c4d2b8a99dc964434af7e4df80fd4eb76525996a812558` |
| `assets/vendor/majadroid/m4-ship1.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `5a3111e5ff1d7c2f1163d3658e70e56be94bf5baf0a6398a71f6f39d7a7eedd6` |
| `assets/vendor/majadroid/m4-ship1.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `a56bca085fbab4df22bba4c1c0718cef14c228528b96f0f80516ddfed1202c4e` |
| `assets/vendor/majadroid/m4-ship3.mtl` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — material definition for the matching hull (map_Kd repointed to the relative texture name) | CC0-1.0 | `Yes` | `5a3111e5ff1d7c2f1163d3658e70e56be94bf5baf0a6398a71f6f39d7a7eedd6` |
| `assets/vendor/majadroid/m4-ship3.obj` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — low-poly OBJ hull | CC0-1.0 | `Yes` | `0eccce938dbb3210046b648c7aaf3305ea73a7cf87caa582c3a3d40538f27b45` |
| `assets/vendor/majadroid/tex01-512.png` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — shared 512px texture | CC0-1.0 | `Yes` | `b6646cf4b10e35ff1a48e2b29c6917ce065f2a36b11fcc975f29f2f3750cfbd6` |
| `assets/vendor/majadroid/tex02-512.png` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — shared 512px texture | CC0-1.0 | `Yes` | `b2359a75e59417e6603d12a6bd1f870d8ef30eed74a794e261aafded1a4d9ff3` |
| `assets/vendor/majadroid/tex03-512.png` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — shared 512px texture | CC0-1.0 | `Yes` | `5f5a6e3f988cd7950fef26a853fd69b0495f7a15f31e294ffbf4db1ade0526cf` |
| `assets/vendor/majadroid/tex04-512.png` | Majadroid | [3D Lowpoly Spaceships and Components](https://majadroid.itch.io/3d-lowpoly-spaceships-and-components-cc0) — shared 512px texture | CC0-1.0 | `Yes` | `2828352c255bb3d23243df43e67a01b27507bee87df87722191e99b001442e5d` |
| `assets/vendor/kenney_space_kit/satelliteDish.glb` | Kenney Vleugels / kenney.nl | [Space Kit](https://kenney.nl/assets/space-kit) — station/prop greeble, glTF export | CC0-1.0 | `Yes` | `db27a561b66fabda45a6ce2bcf41d650852e89e15bb9f63b68133ad1293aed8b` |
| `assets/vendor/kenney_space_kit/satelliteDish_detailed.glb` | Kenney Vleugels / kenney.nl | [Space Kit](https://kenney.nl/assets/space-kit) — station/prop greeble, glTF export | CC0-1.0 | `Yes` | `143dd36b2c427e3201110967a18fd836bc7aa8002dbf3e44efa42c75fbb44ae5` |
| `assets/vendor/kenney_space_kit/satelliteDish_large.glb` | Kenney Vleugels / kenney.nl | [Space Kit](https://kenney.nl/assets/space-kit) — station/prop greeble, glTF export | CC0-1.0 | `Yes` | `8fe696a37081a0a6f1c56ab867f447f33a498ef9f1daabb5aabc62b1ce09277e` |
| `assets/vendor/kenney_space_kit/turret_double.glb` | Kenney Vleugels / kenney.nl | [Space Kit](https://kenney.nl/assets/space-kit) — station/prop greeble, glTF export | CC0-1.0 | `Yes` | `a707823a86f895f6418df2340f2e231d7d88be6c2069d3245433299cec1f9f9c` |
| `assets/vendor/kenney_space_kit/turret_single.glb` | Kenney Vleugels / kenney.nl | [Space Kit](https://kenney.nl/assets/space-kit) — station/prop greeble, glTF export | CC0-1.0 | `Yes` | `ef27f43718c846297f90a0b20446b13c6a1f092cd995ea730f27d6e003efd1e0` |

## Sky panoramas — author-stated CC-BY-like, with an AI-training restriction

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/vendor/space_spheremaps/blue_nebulae_1.png` | Space Spheremaps | [space-spheremaps.itch.io](https://space-spheremaps.itch.io/space-spheremaps) — 8192×4096 equirectangular panorama, used via PanoramaSkyMaterial | Author-stated, similar to CC-BY 4.0; no-AI-training restriction | `Yes, attribution required` | `441db3b0825d1de9ec5b6f14fec06afd7f0896d5187022bc204a2e441ca696e1` |
| `assets/vendor/space_spheremaps/plain_starfield_1.png` | Space Spheremaps | [space-spheremaps.itch.io](https://space-spheremaps.itch.io/space-spheremaps) — 8192×4096 equirectangular panorama, used via PanoramaSkyMaterial | Author-stated, similar to CC-BY 4.0; no-AI-training restriction | `Yes, attribution required` | `351dda042a7137b98a2a1d1067669c805e031f5b65cbe11ee07e89dafa06b2a0` |

## Kenney sound effects — CC0

Curated subset of Kenney's Impact Sounds and Sci-Fi Sounds packs (shell impacts, ship-death
explosions, laser fire, passive-shield blocks — loaded by `scripts/view/audio_layer.gd`). The
upstream provenance record ships beside the files at `assets/sfx/kenney/PROVENANCE.txt`.

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/sfx/kenney/explosionCrunch_001.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `fdd04d6f0032d4d57c134ad37f3587d2d00e58c9572715275bd8cf4f43593576` |
| `assets/sfx/kenney/explosionCrunch_002.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `be2b8ddc62e4a24c91e2e77793de98549ce216faf2f323a917e7d6f34321ff97` |
| `assets/sfx/kenney/explosionCrunch_003.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `8c7197bb3a1c504690319c3abe0e62a5423ee246dd70caab57963d0b7aa8144f` |
| `assets/sfx/kenney/explosionCrunch_004.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `9c3a1c73cadf0de5d5a578b31a264f20b1ac7cb6ec9bbd34a203f58402ea5390` |
| `assets/sfx/kenney/forceField_000.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `c2916f2a062c8ddd1aca2826d134fe90847037db31342726ffb0f9097afe339c` |
| `assets/sfx/kenney/forceField_001.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `5574e69dd04e5f59322c5ddffde5978f077b09170ae5e29cec0bd9901828cd90` |
| `assets/sfx/kenney/forceField_002.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `051b0eafc479695af4ca3607d41fd4be41bae7c21f4f9508d004722b09f1bd63` |
| `assets/sfx/kenney/impactMetal_heavy_000.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831` |
| `assets/sfx/kenney/impactMetal_heavy_001.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `83554049f81f4db9209379e103c30bfa63f65c42189a03f300b045c2c82e23ae` |
| `assets/sfx/kenney/impactMetal_heavy_002.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `b914c8f1eb7c0f34bb165d7c77f4be0351f6be0660c13c53e65424e262e2c093` |
| `assets/sfx/kenney/impactMetal_light_002.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `25a96f90a9a1f88a531e824e126f0519504625e5635e65a72e4f31611428db29` |
| `assets/sfx/kenney/impactMetal_light_003.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `92d5db6bfc672d9dc1b4f390b2900504f013187fa36335472554fafefa9050b1` |
| `assets/sfx/kenney/impactMetal_medium_002.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `7e89ce2ca0dbda95ea2b78d4b50791cab35c10d20e9f5ccd45dd0b00e99ff548` |
| `assets/sfx/kenney/impactMetal_medium_003.ogg` | Kenney Vleugels / kenney.nl | [impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0-1.0 | `Yes` | `2a185e2e57211d02c1bdd33b872d6b6a2fe83e6c14f4e56f426a95e717acf08e` |
| `assets/sfx/kenney/laserLarge_000.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `a56d95794cd732d6c2d66ce488c14cf557fe526c282897c9a77675c2bd9b77e6` |
| `assets/sfx/kenney/laserLarge_001.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `e678aca631495b7dfef4ac625f0349875ccac81a60f538d530e072241af3e4bd` |
| `assets/sfx/kenney/laserLarge_002.ogg` | Kenney Vleugels / kenney.nl | [sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0-1.0 | `Yes` | `e5e0b6ccc4d5720c8174a3e5b7cc6f9be3057352a89cbb2e99a00efc6fe5cc11` |

## Combat sound effects — CC0

These four replaced an earlier synthesized set that the owner rejected. The game's lobby credit line summarises the sound attribution as "AssetForge originals + Kenney (CC0)"; that summary is inaccurate for these four files — the accurate per-file attribution is the table below. CC0 requires no attribution, so nothing is owed, but this register is the record that governs.

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/sfx/core_boom.wav` | Za-Games | [Deep Boom](https://freesound.org/people/Za-Games/sounds/539968/) — re-encoded to 44.1 kHz 16-bit stereo, no other change | CC0-1.0 | `Yes` | `fa2ef04fe4de5fc1c820617c4bb5fae425d30de7e65084f60c03d898e6842a5b` |
| `assets/sfx/fire_heavy.wav` | qubodup | [Tiny Naval Battle Sounds Set](https://opengameart.org/content/tiny-naval-battle-sounds-set) — "GunShotGverb" — re-encoded to 44.1 kHz 16-bit stereo, no other change | CC0-1.0 | `Yes` | `cfbbaeb156bb9992ac571d6dd820fcff2a5702b276c9bb59f12a38f6ad7eadde` |
| `assets/sfx/impact_pen.wav` | qubodup | [Tiny Naval Battle Sounds Set](https://opengameart.org/content/tiny-naval-battle-sounds-set) — "ExplosionMetalGverb" — re-encoded to 44.1 kHz 16-bit stereo, no other change | CC0-1.0 | `Yes` | `935cbabff9aa83176bf946db7a00204def63a4ae7fa83b64f92d6732a63f74f4` |
| `assets/sfx/ricochet_ping.wav` | GameAudio | [Ping Sound Ricochet](https://freesound.org/people/GameAudio/sounds/220204/) — re-encoded to 44.1 kHz 16-bit stereo, no other change | CC0-1.0 | `Yes` | `971a301fa89fd51a7ceeb4d8e948de393af5edd1112cd00e77090aa7624a3556` |

## Music — CC-BY 4.0, attribution required

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/music/aurora.mp3` | Scott Buckley | ['Aurora'](https://www.scottbuckley.com.au/library/aurora/) — re-encoded to V5 MP3 for repo size, no other change | CC-BY 4.0 | `Yes, attribution required` | `4d42325592a54f0c37c47342fac2a3b6b8d2f3f66fcdbf30a7b486043601120a` |
| `assets/music/celestial.mp3` | Scott Buckley | ['Celestial'](https://www.scottbuckley.com.au/library/celestial/) — re-encoded to V5 MP3 for repo size, no other change | CC-BY 4.0 | `Yes, attribution required` | `f19071dad6b8093ca1ddaa239799ddbf8ad5aec20670731c6404adf874898786` |
| `assets/music/decoherence.mp3` | Scott Buckley | ['Decoherence'](https://www.scottbuckley.com.au/library/decoherence/) — re-encoded to V5 MP3 for repo size, no other change | CC-BY 4.0 | `Yes, attribution required` | `c1fd53349e0e26cf83679d8a87cbcdec9eff304ba81c824306800e98baf1fbd7` |
| `assets/music/penumbra.mp3` | Scott Buckley | ['Penumbra'](https://www.scottbuckley.com.au/library/penumbra/) — re-encoded to V5 MP3 for repo size, no other change | CC-BY 4.0 | `Yes, attribution required` | `8f6b7672c3a1a1152b3bfcdbf4103da6a0eaca1fb38074b69a0b0b271f7284e8` |

## First-party generated sound cues

Deterministic local generation (AssetForge `sfx`, houseproc/jsfxr tier) under an explicit commercial-intent flag, each with a machine-readable sidecar recording tool, seed, licence status, and shippability.

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `assets/sfx/alarm_klaxon.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `alarm_klaxon.wav.assetforge.json` | Owner self-authored | `With the project only` | `201154db20005ca710669c93a6bb5eb8995fdea202914d0865289e3df16d6c72` |
| `assets/sfx/laser_zap.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `laser_zap.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |
| `assets/sfx/missile_launch.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `missile_launch.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |
| `assets/sfx/rcs_thruster.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `rcs_thruster.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |
| `assets/sfx/shield_up.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `shield_up.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |
| `assets/sfx/smoke_puff.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `smoke_puff.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |
| `assets/sfx/ui_notch.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `ui_notch.wav.assetforge.json` | Owner self-authored | `With the project only` | `fe369fb3e21c130856006e88fb49ed479ba4ef6bde38780716a096bb9657834f` |
| `assets/sfx/warp_arrival.wav` | VOIDCLAD contributors | AssetForge `sfx` (houseproc/jsfxr) deterministic generation; sidecar `warp_arrival.wav.assetforge.json` | Owner self-authored | `With the project only` | `d95cf1decee6617c671e4598caa458d23027b378646340e5f7db6002bf533995` |

## First-party screenshots

Captured from this gated snapshot — with the two excluded models absent — by the in-repo shot harness, run windowed but far offscreen with a dummy audio driver.

| Asset | Creator | Source | License | Redistribution | SHA-256 |
|---|---|---|---|---|---|
| `docs/captures/battle-tactical.png` | VOIDCLAD contributors | `--shot=tactical` shot harness, offscreen windowed run of this snapshot | Project-created capture | `With the project only` | `8d426c0bd2b1b0c48b0bf2e9a8b2aa1511b2ba0934e509b9441856a67601ade8` |
| `docs/captures/fleet-warp-in.png` | VOIDCLAD contributors | `--shot=fleet_wide` shot harness, offscreen windowed run of this snapshot | Project-created capture | `With the project only` | `c3a2197ee5986772b9c19a9edc7cd1c961144f9031e0fda1b902e6aac949f6a0` |
| `docs/captures/target-plate.png` | VOIDCLAD contributors | `--shot=impact` shot harness, offscreen windowed run of this snapshot | Project-created capture | `With the project only` | `bae400b396128aa7798d041fa542acb43f987d99b32eff5da5d760a40f23940c` |
| `docs/captures/bridge-view.png` | VOIDCLAD contributors | `--shot=bridge` shot harness, offscreen windowed run of this snapshot | Project-created capture | `With the project only` | `1ee19e66d5613a21dae4a041a88caa1fa392de4a2c14f56e00653fcd34b824fe` |

## Verifying this record

Every SHA-256 above is re-checked against the tree by the publication claim gate before this snapshot is produced. To repeat it locally:

```sh
shasum -a 256 assets/vendor/quaternius_ultimate_spaceships/* assets/vendor/majadroid/* \
  assets/vendor/kenney_space_kit/*.glb assets/vendor/space_spheremaps/*.png \
  assets/sfx/kenney/*.ogg \
  assets/sfx/*.wav assets/music/*.mp3 docs/captures/*.png
```

## Third-party code (not media)

[GUT 9.6.0](addons/gut/) — the Godot Unit Test framework by Tom "Butch" Wesley and contributors — is vendored in full under `addons/gut/` and keeps its own MIT licence at [`addons/gut/LICENSE.md`](addons/gut/LICENSE.md). It is a development dependency, not shipped media; its own images and icons belong to that package.

## Preserved provenance records, and where they are stale

[`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md) is the original intake ledger and is kept in the tree: it records how each licence was verified, which candidates were evaluated and rejected, and which sources are approved but not yet pulled. Three of its rows have drifted from the tree, and **this file is the accurate one**:

- It describes **four** Quaternius hulls; the tree ships **6** hulls with their extracted textures.
- It lists a Kenney `craft_speederA.glb` fighter; that file is no longer in the tree (it was superseded by the excluded fighter mesh above).
- It lists the Majadroid pack only under "not yet pulled", while the pack is in fact imported; its per-directory record is [`assets/vendor/majadroid/PROVENANCE.txt`](assets/vendor/majadroid/PROVENANCE.txt), which carries the CC0 source and licence.

Per-directory provenance notes and per-file sidecars are also preserved: `assets/vendor/majadroid/PROVENANCE.txt`, `assets/vendor/kenney_space_kit/KENNEY_License.txt`, `assets/sfx/kenney/PROVENANCE.txt`, and `assets/sfx/*.assetforge.json`.
