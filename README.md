# Operations Toolkit

A suite of web-based applications designed to assist with daily operational tasks such as stock counting, cash control, and more.

## Overview

This project provides a central hub for various internal tools. Each tool is a self-contained single-page application. The main goal is to create a scalable and easy-to-maintain collection of utilities for operational teams.

## Tools Included

- **Stock Count**: A tool for performing physical inventory counts and reconciling them against system data.
- **Cash Control**: A tool for end-of-day cash drawer reconciliation, including cash, vouchers, and sales reporting.
- and more**

## How to Use

1. Clone this repository.
2. Open the `index.html` file in your web browser.
3. Select the desired tool from the main menu.

## How to Add a New Tool

1. Create your new tool as a self-contained `new-tool.html` file.
2. Place the file inside the `/tools` directory.
3. Open `index.html` and copy one of the existing "tool-card" `<a>` blocks.
4. Update the `href` to point to `tools/new-tool.html`.
5. Change the icon, title, and description to match your new tool.
