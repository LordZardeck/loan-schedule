// @ts-expect-error -- Top level allowed for bun
await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist',
	minify: true,
	external: ['decimal.js', 'date-fns']
})
