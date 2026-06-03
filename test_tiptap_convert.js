import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Node } from '@tiptap/core';

const ToggleTitle = Node.create({ name: 'toggleTitle', group: 'block', content: 'inline*', defining: true });
const ToggleContent = Node.create({ name: 'toggleContent', group: 'block', content: 'block+', defining: true });
const ToggleBlock = Node.create({ name: 'toggleBlock', group: 'block', content: 'toggleTitle toggleContent', defining: true });

const editor = new Editor({
  extensions: [ StarterKit, TaskList, TaskItem, ToggleTitle, ToggleContent, ToggleBlock ],
  content: {
    type: 'doc',
    content: [
      {
        type: 'toggleBlock',
        content: [
          { type: 'toggleTitle', content: [{ type: 'text', text: 'Titulo' }] },
          { 
            type: 'toggleContent', 
            content: [
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Meta Ads' }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [] }] }
                ]
              }
            ] 
          }
        ]
      }
    ]
  }
});

// Cursor at the empty list item (the second one)
editor.commands.setTextSelection(31);
editor.commands.toggleTaskList();

console.log(JSON.stringify(editor.getJSON().content[0].content[1], null, 2));
