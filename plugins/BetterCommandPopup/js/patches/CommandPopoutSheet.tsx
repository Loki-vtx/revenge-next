import { ToastActionCreators } from '@revenge-mod/discord/actions';
import { lookupModule, waitForModules } from '@revenge-mod/modules/finders';
import { withProps } from '@revenge-mod/modules/finders/filters';
import { after, before } from '@revenge-mod/patcher';
import { findInTree } from '@revenge-mod/utils/tree';
const { React } = revenge.react

const SHEET_FILTER = withProps('openLazy', 'hideActionSheet')
const LOG = '[command-copy]'

let undoLast: (() => void) | undefined

const findInReactTree = (node: any, filter: (n: any) => boolean) =>
	findInTree(node, filter as any, { walkable: new Set(['props', 'children']) })

function showToast(text: string) {
	ToastActionCreators.open(`command-copy-${Date.now()}`, {
		text,
		icon: revenge.assets.getAssetIdByName('CopyIcon'),
	} as any)
}

// address the shit out of me bro
function patchOpenLazy(ActionSheet: any): () => void {
	return before(ActionSheet, 'openLazy', (args: any[]) => {
		undoLast?.()
		undoLast = undefined

		try {
			const [comp, tag] = args
			if (!tag?.startsWith?.('ExecutedCommandPopout')) return args

			// Looked up here, not at load time, because the module may not be loaded yet.
			const ActionSheetRow = lookupModule(withProps('ActionSheetRow'))[0]?.ActionSheetRow
			if (!ActionSheetRow) {
				console.log(LOG, 'ActionSheetRow not found, skipping')
				return args
			}

			const undo: Array<() => void> = []
			undoLast = () => {
				for (const fn of undo.splice(0)) {
					try {
						fn()
					} catch (error) {
						console.log(LOG, 'undo failed:', error)
					}
				}
			}

			comp?.then?.((instance: any) => {
				const unpatchSheet = after(instance, 'default', (_: any, sheet: any) => {
					unpatchSheet() // only needed for this opening
					try {
						const container = findInReactTree(
							sheet,
							c => c?.type?.name === 'CommandActionsContainer',
						)
						if (!container) return sheet

						const unpatchContainer = after(container, 'type', (info: any, containerComp: any) => {
							unpatchContainer() // same shit as the first one
							try {
								const command = info?.[0]?.data
								if (!command) return containerComp

								const rows = findInReactTree(
									containerComp,
									t => t?.[0]?.props?.children?.type?.name === 'TableRow',
								)
								if (!rows) return containerComp

								rows.unshift(
									<ActionSheetRow
										key="command-copy-mention"
										label="Copy Command Mention"
										onPress={() => {
											const mention = `</${command.name}:${command.id}>`
											revenge.externals.ReactNativeClipboard.Clipboard.setString(mention)
											showToast('Copied command mention to clipboard')
										}}
									/>,
									<ActionSheetRow
										key="command-copy-id"
										label="Copy Command ID"
										onPress={() => {
											revenge.externals.ReactNativeClipboard.Clipboard.setString(command.id)
											showToast('Copied command ID to clipboard')
										}}
									/>,
								)
							} catch (error) {
								console.log(LOG, 'could not add rows:', error)
							}
							return containerComp
						})
						undo.push(unpatchContainer)
					} catch (error) {
						console.log(LOG, 'could not find container:', error)
					}
					return sheet
				})
				undo.push(unpatchSheet)
			})
		} catch (error) {
			console.log(LOG, 'openLazy hook failed:', error)
		}
		return args
	})
}

export default function patchCommandPopoutSheet(): () => void {
	let unpatch: (() => void) | undefined
	let stopWaiting: (() => void) | undefined

	const existing = lookupModule(SHEET_FILTER)[0]
	if (existing) {
		unpatch = patchOpenLazy(existing)
	} else {
		stopWaiting = waitForModules(SHEET_FILTER, (exports: any) => {
			unpatch = patchOpenLazy(exports)
		})
	}

	return () => {
		stopWaiting?.()
		unpatch?.()
		undoLast?.()
		undoLast = undefined
	}
}