# Agent instructions

Instructions in this file apply to any AI coding agent working in this repo
(Claude Code, Codex, Cursor, etc.).

## Bash commands

Whenever you propose a Bash command to run, break it down piece by piece in a
comment/explanation the reader can follow. The user is knowledgeable about
general Bash but not every command or every option/flag, so explain the base
command, notable flags, pipes, and any less-common options — covering the
non-obvious parts especially.

## Pending requests — check at session start

Before starting other work in a new session, read
[`PENDING_REQUESTS.md`](./PENDING_REQUESTS.md). If it lists any requests,
show them to the user and **ask** whether they still want each one done
(now, later, or dropped) — do not start on them without a yes. Remove items
from the file once they are done or the user drops them.
