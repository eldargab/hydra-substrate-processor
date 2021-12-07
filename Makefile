ts:
	@rm -rf lib
	@npx tsc

pack: ts
	@npm pack

.PHONY: ts
