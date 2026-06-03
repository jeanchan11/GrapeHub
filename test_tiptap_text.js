import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';

const ToggleTitle = Node.create({ name: 'toggleTitle', group: 'block', content: 'inline*', defining: true });
const ToggleContent = Node.create({ name: 'toggleContent', group: 'block', content: 'block+', defining: true });
const ToggleBlock = Node.create({ name: 'toggleBlock', group: 'block', content: 'toggleTitle toggleContent', defining: true });

const editor = new Editor({
  extensions: [ StarterKit, ToggleTitle, ToggleContent, ToggleBlock ],
  content: {
    type: 'doc',
    content: [
      {
        type: 'toggleBlock',
        content: [
          { type: 'toggleTitle', content: [{ type: 'text', text: 'Titulo' }] },
          { type: 'toggleContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: '/' }] }] }
        ]
      }
    ]
  }
});

const from = 13; // Position of '/'
editor.commands.setTextSelection(from);

const textBefore = editor.state.doc.textBetween(Math.max(0, from - 60), from, '\n');
const currentLine = textBefore.slice(textBefore.lastIndexOf('\n') + 1);

console.log("textBefore:", JSON.stringify(textBefore));
console.log("currentLine:", JSON.stringify(currentLine));
