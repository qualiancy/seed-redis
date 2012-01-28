TESTS = test/*.js
REPORTER = dot
BENCHMARKS = benchmark/*.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(TESTS)

benchmark:
	@NODE_ENV=benchmark ./node_modules/.bin/matcha \
		$(BENCHMARKS)

.PHONY: test benchmark
