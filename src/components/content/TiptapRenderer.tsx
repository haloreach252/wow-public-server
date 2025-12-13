import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TiptapRendererProps {
  content: unknown
  className?: string
}

export function TiptapRenderer({ content, className }: TiptapRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable input rules since this is read-only
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: content as object,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  })

  // Update content when it changes
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content as object)
    }
  }, [editor, content])

  if (!content) {
    return null
  }

  return (
    <div className={cn('tiptap-content', className)}>
      <EditorContent editor={editor} />
    </div>
  )
}
