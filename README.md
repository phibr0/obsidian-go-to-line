# Obsidian Go To Line [![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/phibr0/obsidian-go-to-line)](https://github.com/phibr0/obsidian-go-to-line/releases) ![GitHub all releases](https://img.shields.io/github/downloads/phibr0/obsidian-go-to-line/total)

> This Plugin was created by request of @arvn over on Discord

This Plugin adds new Commands to go to specific Lines and Characters in Obsidian.
You can find the Commands using the Command Palette or set a Hotkey for it.

By default, a single Cursor's location is saved as `line:column` and multiple Cursors
are saved as `line:column,line:column,...`. The `:` and `,` seperators can be customized
in the "Go to Line" settings pane.

### Commands

#### 1. `Go to line`

A Textfield will appear, you can type in just the Line Number or do `line:column`,
for example `15:27` for Line 15 and Character 27.

#### 2. `Go to line with clipboard contents`

Bypass the popup asking for line number and use the contents of your clipboard to
automatically set the cursors in the active panel. No action is taken if clipboard
conents are not valid line information.

#### 3. `Copy cursor line number`

Copies the primary line and character information to the clipboard (destroying
the current clipboard contents). If multiple cursors exist, only 1 will be copied.

#### 4. `Copy all cursor line numbers`

Copies all cursor line and character information to the clipboard
(destroying the current clipboard contents).

## How to install

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) Settings and **disable** Safe Mode
2. Click on **Browse** and search for „Go to Line“
3. Click install
4. Toggle the Plugin on in the **Community Plugins** Tab

## Support me

If you find this Plugin helpful, consider supporting me:

<a href="https://www.buymeacoffee.com/phibr0"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=phibr0&button_colour=5F7FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>
