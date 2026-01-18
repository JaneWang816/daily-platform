// components/study/note-editor.tsx
"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Underline } from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { useCallback, useRef } from "react"
import { Button } from "@daily/ui"
import { createClient } from "@daily/database"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Image as ImageIcon,
  Palette,
  Highlighter,
  Undo,
  Redo,
} from "lucide-react"

interface NoteEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
}

const TEXT_COLORS = [
  { name: "黑色", value: "#000000" },
  { name: "紅色", value: "#dc2626" },
  { name: "藍色", value: "#2563eb" },
  { name: "綠色", value: "#16a34a" },
  { name: "紫色", value: "#9333ea" },
  { name: "橘色", value: "#ea580c" },
]

const HIGHLIGHT_COLORS = [
  { name: "黃色", value: "#fef08a" },
  { name: "綠色", value: "#bbf7d0" },
  { name: "粉紅", value: "#fbcfe8" },
  { name: "藍色", value: "#bfdbfe" },
  { name: "橘色", value: "#fed7aa" },
]

export function NoteEditor({ content, onChange, placeholder = "開始輸入筆記...", editable = true }: NoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit 不包含 underline，但為了避免潛在衝突
        // 明確配置
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // 避免 SSR hydration 不匹配
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3",
      },
    },
  })

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file || !editor) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from("note-images")
      .upload(fileName, file)

    if (error) {
      console.error("上傳失敗:", error)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from("note-images")
      .getPublicUrl(fileName)

    editor.chain().focus().setImage({ src: publicUrl }).run()
  }, [editor])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    e.target.value = ""
  }, [handleImageUpload])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* 工具列 */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
          {/* 格式按鈕 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-gray-200" : ""}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "bg-gray-200" : ""}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive("underline") ? "bg-gray-200" : ""}
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive("strike") ? "bg-gray-200" : ""}
          >
            <Strikethrough className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 清單 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 文字顏色 */}
          <div className="relative group">
            <Button type="button" variant="ghost" size="sm">
              <Palette className="w-4 h-4" />
            </Button>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg hidden group-hover:flex gap-1 z-10">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* 螢光筆 */}
          <div className="relative group">
            <Button type="button" variant="ghost" size="sm">
              <Highlighter className="w-4 h-4" />
            </Button>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg hidden group-hover:flex gap-1 z-10">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                  title={color.name}
                />
              ))}
              <button
                type="button"
                className="w-6 h-6 rounded border bg-white hover:scale-110 transition-transform text-xs"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                title="清除"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* 圖片上傳 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="flex-1" />

          {/* 復原/重做 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 編輯區域 */}
      <EditorContent editor={editor} />

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
        }
        .ProseMirror ul li {
          list-style-type: disc;
        }
        .ProseMirror ol li {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  )
}

// 唯讀顯示組件
export function NoteContent({ content }: { content: string }) {
  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
