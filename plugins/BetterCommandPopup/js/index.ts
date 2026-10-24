import patchCommandPopoutSheet from './patches/CommandPopoutSheet'

export default plugin({
	start({ cleanup }) {
		cleanup(patchCommandPopoutSheet())
	},
})