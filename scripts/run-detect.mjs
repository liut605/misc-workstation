#!/usr/bin/env node
// Pure-node fallback if python shell is unavailable.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
try {
  execFileSync("/usr/bin/python3.12", ["/workspace/scripts/detect_and_compose.py"], {
    stdio: "inherit",
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
