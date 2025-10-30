# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning when applicable.

## [Unreleased]

- **prompt** Expand system instruction with more categories and color map
- **output** Increase `maxOutputTokens` from 500 to 3000 to avoid truncation

### Details

- **Parsing helpers**: Add `findFirstParsableJson()`, `collectStrings()`, and `mapToSchemaIfPossible()` to extract/repair JSON from Gemini responses.
- **Prompt update**: Extend `material_colors` legend (e.g., brown bin `#643924`, Pfand, Sperrmüll) and require `<span style="background-color:#HEX;">` in `description`.
