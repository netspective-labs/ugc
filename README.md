# UGC (User Generated Content) Contributions Management System

The `ugc` library is a Deno module designed to facilitate the management and
validation of User Generated Content (UGC). With the power of Zod, it offers
strong type validations for entities related to UGC. The module simplifies the
process of storing contributions, making them hierarchical, and provides both
in-memory and potentially other persistent solutions.

## Features

- Strongly typed entities using Zod.
- In-memory persistence strategy for quick prototyping.
- Extensible design to accommodate other storage solutions.
- Hierarchical representation of contributions.
- Asynchronous methods simulating real-world scenarios.
- Simple rendering logic for contributions.

## Init after clone

This repo uses git hooks for maintenance, after cloning the repo in your sandbox
please do the following:

```bash
deno task init
```

## Check for missing deps

```bash
deno task doctor
```

You should see something like this:

```bash
Git dependencies
  🆗 .githooks/pre-commit
  🆗 .githooks/pre-push
  🆗 .githooks/prepare-commit-msg
Runtime dependencies
  🆗 deno 1.34.0 (release, x86_64-unknown-linux-gnu)
Build dependencies
  🆗 dot - graphviz version 2.43.0 (0)
  🆗 java 17 2021-09-14 LTS
  🆗 PlantUML version 1.2022.6 (Tue Jun 21 13:34:49 EDT 2022)
```

Doctor task legend:

- 🚫 is used to indicate a warning or error and should be corrected
- 💡 is used to indicate an (optional) _suggestion_
- 🆗 is used to indicate success

If you get any error messages for `dot`, `Java`, or `PlantUML` then you will not
get auto-generated entity relationship diagrams (ERDs).

### Maintain Deno dependencies

You can check which deps need to be updated:

```bash
find . -name 'deps*.ts' -type f -not -path "./support/*" -exec udd --dry-run {} \;   # check first
find . -name 'deps*.ts' -type f -not -path "./support/*" -exec udd {} \;             # update deps
```
