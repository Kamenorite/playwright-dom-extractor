# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Support for natural language descriptions using `getByDescription` and `getElementByDescription`
- Ambiguity detection in element selection to prevent non-unique matches
- Interactive feedback suggesting more specific alternatives when ambiguity is detected
- New demo script to showcase ambiguity detection (`examples/ambiguity-detection-demo.ts`)
- Updated documentation with best practices for handling element ambiguity
- Natural language description matching for element selection
- Alternative names for elements to improve matching flexibility
- getElementByDescription and getByDescription functions
- Migration documentation from semantic selectors to natural language
- Implementation status document

### Deprecated
- `getSemanticSelector` and `getSelfHealingLocator` in favor of the new natural language-based functions
- getSemanticSelector function (use getElementByDescription instead)
- getSelfHealingLocator function (use getByDescription instead)
- updateSelectorForKey function (no longer needed with new approach)

- MCP integration for direct Cursor AI access without API tokens
- MCPAIService that leverages Cursor's Model Context Protocol
- Comprehensive integration test suite
- Test HTML file with data-testid attributes for testing
- Documentation for setting up and running tests

### Fixed
- Improved error handling in file system operations
- Better handling of missing API keys in tests
- Fixed test cleanup to properly handle directories
- Improved robustness of integration tests

### Changed
- Updated API Integration tests to use MCP
- Improved test reliability and error reporting
- Enhanced test documentation with API key and MCP setup instructions
- Modified DOMMonitor to support MCP integration

## [1.0.0] - 2023-01-01

### Added
- Initial release
- DOM extraction capabilities
- Semantic key generation
- Selector mapping
- CLI tools
- HTML and JSON reporting
- Screenshot functionality 
