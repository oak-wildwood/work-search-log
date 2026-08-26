# 6. Agent instructions in one file, with procedure in a skill

## Context

Most pull requests in this repository are now opened by AI coding agents. An agent reading only
the source sees a CRUD app over `localStorage`; it has no way to work out that the records are
evidence in a benefits determination, that fabricating an entry is fraud, or that a requirement
change must never rescore a logged week. Those constraints have real consequences and are
invisible in the code.

There is more than one way to tell an agent that, and the options differ in what they cost to
maintain rather than in what they say.

## Decision

**One instruction file, imported rather than duplicated.** [`AGENTS.md`](../../AGENTS.md) holds
the content. [`CLAUDE.md`](../../CLAUDE.md) is `@AGENTS.md` plus a short Claude-specific section.
Claude Code reads `CLAUDE.md` and not `AGENTS.md`, and the import is what lets both, and any other
agent that reads `AGENTS.md`, see the same instructions.

**Nothing vendor-specific beyond that import.** No Codex, Cursor, or Gemini variants.

**Only what the code cannot say.** No directory layout, no dependency list, no npm scripts — a
session derives those from `ls` and `package.json`, and they would cost context every session for
nothing. What earns its place is the domain, the prohibitions, and the invariants a
plausible-looking edit breaks quietly.

**Constraints are always loaded; procedure is not.** Adding a state config is a multi-step
workflow, so it lives in `.claude/skills/add-state-config/` and loads on demand. The prohibitions
stay in `AGENTS.md`, because a rule that might not be loaded when it matters is not a rule.

## Alternatives considered

**Two parallel files.** `AGENTS.md` and `CLAUDE.md` both holding the full text. Rejected: they
drift, one gets updated and the other doesn't, and an agent then acts on stale instructions with
no signal that it's doing so.

**A skill per vendor.** Rejected on maintenance grounds. Each vendor's format would need writing
and keeping current, and `AGENTS.md` is already read by most agents — the tax buys nothing the
import doesn't.

**A filled-in template.** Rejected as worse than nothing: a generic instructions file occupies the
slot where real knowledge should go while teaching an agent nothing, and it looks maintained.

## Consequences

- Instructions are edited in one place. `CLAUDE.md` should stay thin; anything true for all agents
  belongs above the import, not below it.
- The always-loaded file has a context budget, so new material has to justify itself against the
  derivability test rather than being added because it's true.
- A vendor that reads neither `AGENTS.md` nor `CLAUDE.md` gets nothing. That's accepted — the fix
  is a second import line, not a second copy.
- `AGENTS.md` is a load-bearing file rather than documentation. Changing a prohibition there
  changes what agents will do, so it deserves the same review as changing `src/lib/requirements.ts`.
- If a future agent platform makes `AGENTS.md` obsolete, or the constraints stop fitting one file,
  this is worth revisiting. Neither has happened.
