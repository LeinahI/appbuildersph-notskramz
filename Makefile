# Needs GNU make and pnpm 10 on PATH. Each target calls the matching root pnpm script,
# so you can run "pnpm install", "pnpm test", or "pnpm build" directly if make is not installed.
.PHONY: install test build

install:
	pnpm install

test:
	pnpm test

build:
	pnpm build
