# Markdown Widget

The Markdown widget allows you to render formatted text, links, and lists using standard Markdown syntax.

## Description

Perfect for creating custom welcome messages, static links, instruction lists, or embedding simple media. It includes both an editing mode and a live preview mode.

![Markdown Widget](../assets/markdown.png)

## Supported Features

The widget utilizes a custom Markdown parser supporting:
- Headers (H1-H6)
- **Bold**, *Italic*, ~~Strikethrough~~
- Unordered and Ordered Lists
- Checkboxes (`- [ ]`, `- [x]`)
- Blockquotes
- Inline `code` and multi-line code blocks
- Links and Images

> **🛡️ Security Note:** All rendered Markdown output is passed through an HTML sanitizer (DOMPurify) before being attached to the DOM, protecting you from XSS attacks when rendering custom HTML blocks.

---
[← Previous page](notepad.md) | [Next page →](docker.md)
