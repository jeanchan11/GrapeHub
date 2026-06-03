import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Node, mergeAttributes } from '@tiptap/core';

const ToggleTitle = Node.create({ name: 'toggleTitle', group: 'block', content: 'inline*', defining: true });
const ToggleContent = Node.create({ name: 'toggleContent', group: 'block', content: 'block+', defining: true });
const ToggleBlock = Node.create({ name: 'toggleBlock', group: 'block', content: 'toggleTitle toggleContent', defining: true });

const editor = new Editor({
  extensions: [
    StarterKit,
    TaskList,
    TaskItem,
    ToggleTitle,
    ToggleContent,
    ToggleBlock
  ],
  content: {
    type: 'doc',
    content: [
      {
        type: 'toggleBlock',
        content: [
          { type: 'toggleTitle', content: [{ type: 'text', text: 'Titulo' }] },
          { type: 'toggleContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Paragrafo' }] }] }
        ]
      }
    ]
  }
});

// Set cursor inside the paragraph in toggleContent
editor.commands.setTextSelection(12);

// Try to toggleTaskList
const success = editor.commands.toggleTaskList();
console.log("Toggle task list success:", success);
console.log(JSON.stringify(editor.getJSON(), null, 2));
