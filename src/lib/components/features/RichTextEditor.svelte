<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import Placeholder from "@tiptap/extension-placeholder";
    import BubbleMenu from "@tiptap/extension-bubble-menu";
    import FloatingMenu from "@tiptap/extension-floating-menu";
    import {
        Bold,
        Italic,
        Strikethrough,
        Code,
        List,
        ListOrdered,
        Quote,
        Heading1,
        Heading2,
    } from "lucide-svelte";

    export let content = "";
    export let placeholder = "Digite suas notas aqui...";

    const dispatch = createEventDispatcher();

    let element;
    let editor;
    let bubbleMenuElement;

    onMount(() => {
        editor = new Editor({
            element: element,
            extensions: [
                StarterKit,
                Placeholder.configure({
                    placeholder: placeholder,
                    emptyEditorClass: "is-editor-empty",
                }),
                BubbleMenu.configure({
                    element: bubbleMenuElement,
                    tippyOptions: { duration: 100 },
                }),
            ],
            content: content,
            editorProps: {
                attributes: {
                    class: "prose prose-invert max-w-none focus:outline-none min-h-[150px]",
                },
            },
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                dispatch("change", html);
            },
        });
    });

    onDestroy(() => {
        if (editor) {
            editor.destroy();
        }
    });

    $: if (editor && content !== editor.getHTML()) {
        // Only update if content matches to avoid cursor jumps
        // This is a naive check, for a perfect 2-way bind often we need more complex logic
        // But for "save on blur" or manual save, this might be okay.
        // For now, let's assume one-way flow into editor initially, and out on change.
        // To properly support external updates while typing, we'd need to diff.
        // editor.commands.setContent(content, false)
    }
</script>

<div class="editor-wrapper">
    {#if editor}
        <div class="bubble-menu" bind:this={bubbleMenuElement}>
            <button
                on:click={() => editor.chain().focus().toggleBold().run()}
                class:is-active={editor.isActive("bold")}
                title="Negrito"
            >
                <Bold size={14} />
            </button>
            <button
                on:click={() => editor.chain().focus().toggleItalic().run()}
                class:is-active={editor.isActive("italic")}
                title="Itálico"
            >
                <Italic size={14} />
            </button>
            <button
                on:click={() => editor.chain().focus().toggleStrike().run()}
                class:is-active={editor.isActive("strike")}
                title="Riscado"
            >
                <Strikethrough size={14} />
            </button>
            <button
                on:click={() => editor.chain().focus().toggleCode().run()}
                class:is-active={editor.isActive("code")}
                title="Código"
            >
                <Code size={14} />
            </button>
            <div class="separator"></div>
            <button
                on:click={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()}
                class:is-active={editor.isActive("heading", { level: 1 })}
                title="Título 1"
            >
                <Heading1 size={14} />
            </button>
            <button
                on:click={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()}
                class:is-active={editor.isActive("heading", { level: 2 })}
                title="Título 2"
            >
                <Heading2 size={14} />
            </button>
            <div class="separator"></div>
            <button
                on:click={() => editor.chain().focus().toggleBulletList().run()}
                class:is-active={editor.isActive("bulletList")}
                title="Lista"
            >
                <List size={14} />
            </button>
        </div>
    {/if}

    <div bind:this={element} class="tiptap-content"></div>
</div>

<style>
    .editor-wrapper {
        position: relative;
        width: 100%;
        /* Ensure editor takes space */
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    /* Bubble Menu */
    .bubble-menu {
        display: flex;
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: 8px;
        padding: 6px; /* slightly bigger padding */
        gap: 4px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        z-index: 10000; /* Ensure high z-index */
    }

    .bubble-menu button {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .bubble-menu button:hover {
        background: var(--layer-2);
        color: var(--color-text-primary);
    }

    .bubble-menu button.is-active {
        background: var(--highlight);
        color: #fff; /* Contrast for active state */
    }

    .separator {
        width: 1px;
        background: var(--border-light);
        margin: 0 4px;
    }

    /* Editor Styles */
    :global(.ProseMirror) {
        outline: none;
        min-height: 150px;
        color: var(--color-text-primary);
        font-size: 14px;
        line-height: 1.6;
    }

    :global(.ProseMirror p.is-editor-empty:first-child::before) {
        color: var(--color-text-secondary);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
        opacity: 0.5;
    }

    /* Typography refined for Notes */
    :global(.ProseMirror h1) {
        font-size: 1.4em;
        font-weight: 700;
        color: var(--highlight);
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    :global(.ProseMirror h2) {
        font-size: 1.2em;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    :global(.ProseMirror ul) {
        list-style-type: disc;
        padding-left: 1.2em;
    }
    :global(.ProseMirror ol) {
        list-style-type: decimal;
        padding-left: 1.2em;
    }
    :global(.ProseMirror blockquote) {
        border-left: 3px solid var(--highlight);
        padding-left: 1em;
        color: var(--color-text-secondary);
        font-style: italic;
    }
    :global(.ProseMirror code) {
        background: var(--layer-2);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9em;
        color: var(--accent-2);
    }
</style>
