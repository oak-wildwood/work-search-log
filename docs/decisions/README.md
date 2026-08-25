# Architecture decision records

Short records of the decisions that shape this codebase in ways a comment on one line can't
explain — the alternatives considered, and what would make us revisit it. A comment explains a
line; these explain why the line's neighborhood looks the way it does.

Format is lightweight on purpose: context, decision, consequences, a page at most. If one starts
growing sections, that's usually a sign it's actually two decisions.

1. [No backend, no accounts, browser storage only](./0001-browser-only-storage.md)
2. [Module-scoped composables instead of Pinia](./0002-module-scoped-composables.md)
3. [State rules as runtime-normalized JSON](./0003-runtime-normalized-state-config.md)
4. [No autofill, no compliance claims](./0004-no-autofill-no-compliance-claims.md)
5. [Effective-dated requirement schedule](./0005-effective-dated-requirements.md)
