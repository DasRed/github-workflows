---
title: Docs Check
description: Action that checks a project's docs folder with the same rules the build of marco-starker.de applies.
order: 80
slug: docs-check
section: Actions
---

[`docs-check`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/docs-check) checks the docs of a
project before they appear on [marco-starker.de](https://www.marco-starker.de). The rules are the same the website
applies at build time. If the check is green, the website build accepts the docs too.

## What is checked

- **Folders:** only `de/`, `en/` and `assets/`, no subfolders. `assets/` holds images only (`gif`, `jpg`, `jpeg`,
  `png`, `svg`, `webp`).
- **Pages:** `de/index.md` and `en/index.md` exist, every page exists in both languages with the same file name.
- **Front matter:** `title`, `description` (at most 160 characters) and `order` as a whole number. `slug` is optional,
  contains only a–z, 0–9 and hyphens and is unique per language.
- **Markdown:** no `# ` heading in the text, every code block names its language, HTML only `<details>` and
  `<summary>`.
- **Links:** links to other pages are relative (`page.md`) and point to an existing page.
- **Images:** referenced as `../assets/<file>`, existing, with alt text and below 500 KB (GIF up to 2 MB).

The full rules are in the
[docs contract](https://github.com/DasRed/ai-instructions/blob/main/website-marco-starker.de/docs-contract.md).

## Call

```yaml
- uses: actions/checkout@v6
- uses: DasRed/github-workflows/.github/actions/docs-check@v1
```

## Inputs

| Name   | Required | Default | Description                                 |
|--------|----------|---------|---------------------------------------------|
| `path` | no       | `docs`  | Docs folder relative to the repository      |

## Result

Every problem shows up as an annotation on file and line and as a table in the job summary. If there is at least one
problem, the step fails.

```text
✗ docs: 2 problem(s) in 8 pages
```

## Check locally

The action is a single Node script without dependencies. From a clone of this repository you can check a docs folder
without GitHub:

```bash
GITHUB_WORKSPACE=~/Web/private/my-project node .github/actions/docs-check/docs-check.mjs
```

With `INPUT_PATH=handbook` you check a folder other than `docs`.
