.PHONY: build dev install zip clean typecheck e2e

typecheck:
	pnpm typecheck

build:
	pnpm build

dev:
	pnpm dev

install:
	pnpm install

zip:
	pnpm zip

e2e:
	pnpm e2e

clean:
	rm -rf .output .wxt
