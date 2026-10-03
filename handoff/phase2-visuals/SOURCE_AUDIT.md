# Source audit

Prepared 3 October 2026. These are source identifiers and fingerprints, not copied private files. No application checkout is needed to integrate the images. Read README.md for launch modes and limitations.

## Capture evidence

| Project | Runtime artifact | SHA-256 |
| --- | --- | --- |
| CookFrom | Existing closed-testing APK, 0.11.78+137 | `a3838e0c5e7bc5caa10eb6619f85828f6b63db0bfbc751d24e621028e82825e8` |
| Ops Planner | Disposable current-source x86-64 debug build | `517759f636ae60c292e5225bc2adcdad35b919022791a87c61376a0cd849d843` |
| AI Tutor | Existing current Android debug APK, built-in sample service | `df56c2154c5138ee03d8fc62c2b0366573ee629e2a19fd4b0623ca73d844e089` |
| KeyQuest | Browser runtime of unchanged copied current source | See exact source hashes below |

Artifact hashes identify what was run; APKs are not distributed in this handoff. All application originals are captured from the fresh demo environments. Status-bar time and battery were normalized by Android's supported System UI demo mode; the PNG captures themselves were not edited.

## AgentLab

The gateway/shim directories are local project material within the enclosing workspace repository, not independently pinned repositories. Their inspected file hashes are recorded below. No environment/secret file was opened to determine runtime model overrides.

Evidence for the workflow card:

- The local infrastructure audit dated 3 October 2026, “Relevant services and schedules,” records a Claude product planner, Qwen/OpenCode builder, and QA/safety reviewer as enabled/running services. Its “One Horizon agents” architecture section routes agents through gateway/shim to Ollama and local Qwen inference. The diagram labels this as dated audit evidence, not fresh remote inspection.
- Local One Horizon workflow/service material corroborates planner, builder and reviewer responsibilities. The arrow sequence is a conceptual role workflow, not a timing trace or claim of automatic completion. Reviewer model identity is not sufficiently established to label it Codex.
- The diagram does not claim that every role runs inference locally: Claude is the planning role; “local execution” describes the Minisforum agent/execution infrastructure and local builder inference. No cloud/local placement for the reviewer is asserted.

Evidence for the gateway hero:

- README: stable level interface, AUTO routing, structured JSON/schema checking, bounded repair, and metadata-only telemetry.
- router.py: L0 deterministic task selection; L1/L2 choice from supplied signals; guard_l2 checks available RAM, swap and load. Exact thresholds are omitted from the public diagram.
- gateway.py: process_inference handles the deterministic path; L1/L2 use the Ollama transport. generate_structured validates and performs at most one same-model repair. Cloud escalation is a returned response, not an outbound cloud call. Defaults in code are not treated as verified runtime model settings.
- telemetry.py and README: aggregate attempt/task metadata, not prompt/response content. No recorded statistics were copied into the diagram.

## Source fingerprints

Hashes capture the local inspected files, including current uncommitted KeyQuest source. Paths are workspace-relative source locators. They are not public website routes.

| Project | Inspected source | SHA-256 |
| --- | --- | --- |
| CookFrom | `recipe_ai/README.md` | `da873c2a445f725d8b5ce005ff106d808211664e96cbd2458d05877a1df6f067` |
| CookFrom | `recipe_ai/lib/screens/home_shell.dart` | `5d4189fb82bb960b607146d53540f87013110efa108015d4556fce078925f9da` |
| CookFrom | `recipe_ai/lib/models/ingredient_catalog_data.dart` | `cf7eec9c5966a1c6553afc7fc8766ffb1f9469278d12e7fbac1d0501dd976aaa` |
| Ops Planner | `repositories/ops-planner/lib/screens/planner_screen.dart` | `6f04573e9ce1a92f82113c45c7f41f5c98db4341e0f3c3cb1ddb8a4d04c32527` |
| Ops Planner | `repositories/ops-planner/lib/data/planner_repository.dart` | `c7e2969bafff8ab3604cc8e174472c77cbdd4302e1889345c7f35957aa4fa144` |
| Ops Planner | `repositories/ops-planner/lib/data/database.dart` | `d2cdbd8d33989e5cc09e453598232dcf63f78c260ecfb18ccf11b19cd0f11aae` |
| Ops Planner | `repositories/ops-planner/lib/widgets/employee_form_sheet.dart` | `9e6b8da3e9eb6701aa0bec945c3757436ec62204f5f6f67ec389d6ea68fa2a2e` |
| Ops Planner | `repositories/ops-planner/lib/data/report_xlsx.dart` | `fa570d138019fb7c9b71f210fa6408fbf084bae0e807840a6677398b6666de63` |
| AI Tutor | `homework-tutor/docs/CURRENT_STATE.md` | `da95963680d59be7bee9c5284302544c95bab4af2784cdcc5d74fe6c42e7b014` |
| AI Tutor | `homework-tutor/app/lib/main.dart` | `a1afc7435ef0af2ce5ad2a45fa8164ab44db5f183c710e888c5aaa979e12285f` |
| AI Tutor | `homework-tutor/app/lib/services/tutor_service.dart` | `21f803ab85fb2e75a7f5bbcf4d8094262e1f8e64ea04ef82474ffb21bd088a7a` |
| AI Tutor | `homework-tutor/app/lib/domain/mock_tutor_session.dart` | `bc25081ba8044facfdb152a1e8ceab8f546f5cc8c24fd8db47f7e62aa49952b5` |
| KeyQuest | `repositories/Keyboard-Trainer/src/App.tsx` | `85012325e804b8404c21545999305ff7cd3df9e614cbd1a90da123862c80c40c` |
| KeyQuest | `repositories/Keyboard-Trainer/src/styles.css` | `2504ebe67a75cfe663c46a7b8ce3053ab03632d4c2cc81e5149187dcbeb965d2` |
| KeyQuest | `repositories/Keyboard-Trainer/src/game/levels.ts` | `37fc37832e9a1fb5648c7333ee7e14f8a1fe88214eef1d70df4535462076cd9e` |
| KeyQuest | `repositories/Keyboard-Trainer/src/game/typingEngine.ts` | `fe30cc7252688fed119d0fd8ebcc2f92ce263bfb48b624c7fd54b72bd028d064` |
| KeyQuest | `repositories/Keyboard-Trainer/src/game/progression.ts` | `9eb5946ae36561229c929c2e105c7b70d856fead93e61e0176a64772ad522341` |
| KeyQuest | `repositories/Keyboard-Trainer/src/game/persistence.ts` | `c047d54a559566cbab609a99fcab82ffeb32d239fb3b01a9d6b1a399e3e6ac82` |
| AgentLab | `agentlab-local-ai-gateway/README.md` | `b22bf4218a3c7641efcf574b5331812324b756407938326044c079a8ffbbf811` |
| AgentLab | `agentlab-local-ai-gateway/gateway.py` | `97a18feb17d9428f06d283609de88a284aa6253bc2b2a354a80f86d5a54a3886` |
| AgentLab | `agentlab-local-ai-gateway/router.py` | `445bd74c93643d72ec2bc44af196d4e01b9f133f053401f8cd2f2f83144d8fa5` |
| AgentLab | `agentlab-local-ai-gateway/telemetry.py` | `3b19a9a78d84917d408d25ff5886c2172bc9227692a33437c1aa35ff6f08bbc0` |
| AgentLab | `agentlab-qwen-shim/agentlab_qwen_shim.py` | `b274220429fbc8ab0e30117fb540148f107fb46fda74e98cab3fea1380e8266c` |
| AgentLab | `homelab-infrastructure-audit.md` | `cbe9736df5395cb1a48172b8d18d98d168660933099dfa701d4eeee5131a231d` |

## Known evidence limits

CookFrom captures the available beta artifact rather than recompiling current source. Its recipe screenshot is a shipped catalog recipe. AI Tutor's captures use the existing shipped sample service. KeyQuest is local uncommitted development material. Ops Planner's debug build changes only disposable signing/build plumbing. No remote infrastructure service was contacted for this visual handoff. Mountains of Madness had no identifiable source material within the documented search scope.
