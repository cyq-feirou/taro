#! /usr/bin/env node

require('../src/util').printPkgVersion()

const CLI = require('../src/cli').default
new CLI().run()
