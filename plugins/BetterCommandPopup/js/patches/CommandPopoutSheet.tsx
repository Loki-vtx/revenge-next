import { ToastActionCreators } from '@revenge-mod/discord/actions';
import { lookupModule } from '@revenge-mod/modules/finders';
import { withProps } from '@revenge-mod/modules/finders/filters';
import { after, before } from '@revenge-mod/patcher';
import { findInReactTree } from '@revenge-mod/utils/tree';
const { React } = revenge.react

const ActionSheet = lookupModule(withProps('openLazy', 'hideActionSheet'))[0]
const ActionSheetRow = lookupModule(withProps('ActionSheetRow'))[0]?.ActionSheetRow
const CopyIcon = revenge.assets.getAssetIdByName('CopyIcon')

const findInReactTree = (node: any, filter: (n: any) => boolean) =>
	findInTree(node, filter as any, { walkable: new Set(['props', 'children']) })

function showToast(text: string) {
	ToastActionCreators.open(`command-copy-${Date.now()}`, {
		text,
		icon: CopyIcon,
	} as any)
}

function copy(text: string, message: string) {
	revenge.externals.ReactNativeClipboard.Clipboard.setString(text)
	showToast(message)
}

export default plugin({
  start({ cleanup }) {
    cleanup(
     before(ActionSheet, 'openLazy', (args: any[]) => {
      const [comp, tag] = args
if (!tag?.startsWith?.('ExecutedCommandPopout')) return args

  comp.then((instance: any) => {
const unpatchSheet = after(instance, 'default', (_: any, sheet: any) => { unpatchSheet()
      
      const container = findInTree(sheet, c => c?.type?.name === "CommandActionsContainer");
      if (!container) return;
      
      const unpatchContainer = after("type", container, (info: any, containerComp) => {
     unpatchContainer()
        
        const command = info?.[0]?.data;
        if (!command) return;
        
        const rows = findInReactTree(containerComp, t => t?.[0]?.props?.children?.type?.name === "TableRow");
        if (!rows) return;
        
        rows.unshift(
          <><ActionSheetRow
            label="Copy Command Mention"
            onPress={() => {
              const mention = `</${command.name}:${command.id}>`;
              revenge.externals.ReactNativeClipboard.Clipboard.setString(mention);
              showToast("Copied command mention to clipboard", CopyIcon);
            }} /></>
          ,
          <><ActionSheetRow
            label="Copy Command ID"
            onPress={() => {
              revenge.externals.ReactNativeClipboard.Clipboard.setString(command.id);
              showToast("Copied command ID to clipboard", CopyIcon);
            }} /></>
        );
      });
    });
  });
}),
