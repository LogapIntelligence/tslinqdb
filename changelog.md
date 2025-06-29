# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-06-29

### ⚠️ Breaking Changes
- Rewrote query system to use expression-based API exclusively
- Removed `Where` helper class - use inline expressions instead
- Changed `orderBy()` to only accept lambda expressions: `orderBy(u => u.name)`
- Changed `select()` to use projections: `select(u => ({ name: u.name }))`
- Changed `include()` to use expressions: `include(o => o.user)`
- Use native `includes()` instead of custom `contains()` method

### Added
- Aggregation methods: `sum()`, `average()`, `min()`, `max()`
- `groupBy()` method for grouping results
- `distinct()` method for unique results
- `all()` method to check if all items match a predicate
- Full support for native JavaScript string methods in queries

### Changed
- All query methods now use lambda expressions for better type safety
- Improved TypeScript type inference throughout the query system
- Better error messages for query operations

### Removed
- `Where` helper class and all its static methods
- `ExpressionParser` class (no longer needed)
- String-based method signatures for `orderBy`, `orderByDescending`, and `select`

### Fixed
- `remove()` method now correctly updates the data store
- `single()` method properly throws when multiple elements exist
- Improved null/undefined handling in query expressions