import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { JSONContent, Editor as TiptapEditor } from "@tiptap/react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { Editor } from "@/components/tiptap-editor";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { categoryOptionsQuery } from "@/features/categories/queries";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlockHighlightProvider } from "@/features/posts/editor/extensions/code-block/code-block-highlight-context";
import { postContentOf } from "@/features/posts/editor/extensions/image-placeholder";
import {
  matchMarkdownImageFiles,
  parseMarkdownImport,
  type MarkdownImportDocument,
} from "@/features/posts/editor/extensions/markdown-paste/markdown-import";
import type { ResolvedMarkdownImage } from "@/features/posts/editor/extensions/markdown-paste/parse-markdown";
import { postRevisionListQuery } from "@/features/posts/queries";
import { isPostBodyEmpty } from "@/features/posts/utils/is-post-body-empty";
import { normalizePostContent } from "@/features/posts/utils/normalize-content";
import { m } from "@/paraglide/messages";
import { useDeletePost } from "../post-manager/hooks";
import { readPostListLocation } from "../post-manager/list-position";
import { useAutoSave, usePostActions } from "./hooks";
import { PostEditorHeader } from "./post-editor-header";
import { PostEditorMetadata } from "./post-editor-metadata";
import { PostEditorInfoPanel } from "./post-editor-info-panel";
import { PostEditorSummary } from "./post-editor-summary";
import type { PostEditorData, PostEditorProps } from "./types";
import { orpc, orpcClient } from "@/lib/orpc";

interface PendingMarkdownImport {
  fileName: string;
  markdownPath: string;
  source: string;
  document: MarkdownImportDocument;
  imageFiles: Array<File>;
}

async function uploadMarkdownImages(
  files: Array<File>,
  onProgress: (completed: number, total: number) => void,
) {
  const uploaded = new Map<File, ResolvedMarkdownImage>();
  const failed = new Set<File>();
  let nextIndex = 0;
  let completed = 0;

  const uploadNext = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= files.length) return;

      const file = files[index];
      if (!file) continue;

      try {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          throw new Error("Unsupported image type");
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error("Image exceeds the upload size limit");
        }

        const result = await orpcClient.media.upload({ image: file });
        uploaded.set(file, {
          url: result.url,
          width: result.width ?? undefined,
          height: result.height ?? undefined,
        });
      } catch (error) {
        failed.add(file);
        console.error(`Markdown image upload failed: ${file.name}`, error);
      } finally {
        completed += 1;
        onProgress(completed, files.length);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(3, files.length) }, () => uploadNext()),
  );

  return { uploaded, failed };
}

function markdownImportReplacesExistingData(
  document: MarkdownImportDocument,
  post: PostEditorData,
  content: JSONContent | null,
) {
  const imported = document.metadata;
  return (
    !isPostBodyEmpty(content) ||
    (imported.title !== undefined && Boolean(post.title.trim())) ||
    (imported.summary !== undefined && Boolean(post.summary.trim())) ||
    (imported.slug !== undefined && Boolean(post.slug.trim())) ||
    (imported.category !== undefined && post.categoryId !== null) ||
    (imported.tags !== undefined && post.tagIds.length > 0) ||
    (imported.date !== undefined && post.publishedAt !== null)
  );
}

function parseMarkdownDate(
  value: string,
  today: string,
): { date?: Date; issue?: "invalid" | "future" } {
  const trimmed = value.trim();
  let dateOnly: string;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00.000Z`);
    if (
      !Number.isFinite(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== trimmed
    ) {
      return { issue: "invalid" };
    }
    dateOnly = trimmed;
  } else {
    const normalized = trimmed.replace(
      /^(\d{4}-\d{2}-\d{2})[ \t]+(?=\d{2}:\d{2})/,
      "$1T",
    );
    const parsed = new Date(normalized);
    if (!Number.isFinite(parsed.valueOf())) return { issue: "invalid" };
    dateOnly = parsed.toISOString().slice(0, 10);
  }

  if (dateOnly > today) return { issue: "future" };
  return { date: new Date(`${dateOnly}T12:00:00.000Z`) };
}

export function PostEditor({
  initialData,
  publicSlug,
  onSave,
}: PostEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPrimaryAction, setMobileTitle } = useAdminChrome();
  const [infoOpen, setInfoOpen] = useState(false);
  const closeInfo = useCallback(() => setInfoOpen(false), []);
  const [post, setPost] = useState<PostEditorData>(() => ({
    title: initialData.title,
    summary: initialData.summary,
    slug: initialData.slug,
    contentJson: normalizePostContent(initialData.contentJson) ?? null,
    publishedAt: initialData.publishedAt,
    pinnedAt: initialData.pinnedAt,
    tagIds: initialData.tagIds,
    categoryId: initialData.categoryId,
    hasPublicSnapshot: initialData.hasPublicSnapshot,
    serverToday: initialData.serverToday,
    coverMediaId: initialData.coverMediaId,
    cover: initialData.cover,
  }));
  const [editorContent] = useState<JSONContent | null>(
    () => normalizePostContent(initialData.contentJson) ?? null,
  );
  const [contentEpoch, setContentEpoch] = useState(0);
  const [editorRenderKey] = useState(`editor:${initialData.id}`);
  const [pendingMarkdownImport, setPendingMarkdownImport] =
    useState<PendingMarkdownImport | null>(null);
  const [isImportingMarkdown, setIsImportingMarkdown] = useState(false);

  const editorRef = useRef<TiptapEditor | null>(null);
  const markdownFileInputRef = useRef<HTMLInputElement | null>(null);
  const markdownFolderInputRef = useRef<HTMLInputElement | null>(null);
  const editorContentRef = useRef(editorContent);
  const postRef = useRef(post);
  editorContentRef.current = editorContent;
  postRef.current = post;

  const getContent = useCallback(() => {
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed) {
      // Autosave and publish both save this.
      return postContentOf(editor.state.doc);
    }
    return editorContentRef.current;
  }, []);

  const {
    saveStatus,
    lastSaved,
    setError,
    flush,
    waitForInFlightSave,
    discardInFlightSave,
  } = useAutoSave({
    post,
    getContent,
    contentEpoch,
    onSave,
  });

  // Unsaved edits of a deleted post have nowhere to go, so leave unguarded.
  const deletedRef = useRef(false);
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => !deletedRef.current && saveStatus !== "SYNCED",
    withResolver: true,
  });

  const deleteMutation = useDeletePost({
    onSuccess: () => {
      deletedRef.current = true;
      void navigate({ to: "/admin/posts", search: readPostListLocation() });
    },
  });
  const [settlingSave, setSettlingSave] = useState(false);
  const handleDelete = useCallback(async () => {
    setSettlingSave(true);
    discardInFlightSave();
    await waitForInFlightSave();
    setSettlingSave(false);
    deleteMutation.mutate({ id: initialData.id, title: post.title });
  }, [
    deleteMutation,
    discardInFlightSave,
    initialData.id,
    post.title,
    waitForInFlightSave,
  ]);

  const {
    isGeneratingSlug,
    handleGenerateSlug,
    handlePublish,
    handleUnpublish,
    processState,
    canPublish,
    lockSlug,
  } = usePostActions({
    postId: initialData.id,
    post,
    setPost,
    setError,
    flush,
  });

  const handleEditorCreated = useCallback((editor: TiptapEditor | null) => {
    editorRef.current = editor;
  }, []);

  const handleEditorUpdate = useCallback(() => {
    setContentEpoch((epoch) => epoch + 1);
  }, []);

  const handlePostChange = useCallback(
    (updates: Partial<PostEditorData>) => {
      if (updates.slug !== undefined) {
        lockSlug();
      }
      setPost((prev) => ({ ...prev, ...updates }));
    },
    [lockSlug],
  );

  const openMarkdownImport = useCallback(() => {
    markdownFileInputRef.current?.click();
  }, []);

  const openMarkdownFolderImport = useCallback(() => {
    const input = markdownFolderInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.click();
  }, []);

  const applyMarkdownImport = useCallback(
    async (pending: PendingMarkdownImport, confirmed = false) => {
      const { fileName, markdownPath, source, document, imageFiles } = pending;
      setIsImportingMarkdown(true);
      let imageUploadToastId: string | number | undefined;
      try {
        const updates: Partial<PostEditorData> = {};
        const warnings: Array<string> = [];
        const metadata = document.metadata;

        if (metadata.title !== undefined) updates.title = metadata.title;
        if (metadata.summary !== undefined) updates.summary = metadata.summary;
        if (metadata.slug !== undefined) updates.slug = metadata.slug;

        if (metadata.category !== undefined) {
          if (metadata.category === null) {
            updates.categoryId = null;
          } else {
            const categories =
              await queryClient.ensureQueryData(categoryOptionsQuery);
            const category = categories.find(
              (item) =>
                item.name.trim().toLocaleLowerCase() ===
                metadata.category?.trim().toLocaleLowerCase(),
            );
            if (category) updates.categoryId = category.id;
            else {
              warnings.push(
                m.editor_markdown_import_category_missing({
                  category: metadata.category,
                }),
              );
            }
          }
        }

        if (metadata.tags !== undefined) {
          if (metadata.tags.length === 0) {
            updates.tagIds = [];
          } else {
            const tags = await queryClient.ensureQueryData(
              tagsAdminQueryOptions(),
            );
            const matchedIds = new Set<number>();
            const missingNames: Array<string> = [];
            for (const name of metadata.tags) {
              const tag = tags.find(
                (item) =>
                  item.name.trim().toLocaleLowerCase() ===
                  name.trim().toLocaleLowerCase(),
              );
              if (tag) matchedIds.add(tag.id);
              else missingNames.push(name);
            }
            updates.tagIds = [...matchedIds];
            if (missingNames.length > 0) {
              warnings.push(
                m.editor_markdown_import_tags_missing({
                  tags: [...new Set(missingNames)].join(", "),
                }),
              );
            }
          }
        }

        if (metadata.date !== undefined) {
          const result = parseMarkdownDate(
            metadata.date,
            postRef.current.serverToday,
          );
          if (result.date) updates.publishedAt = result.date;
          else if (result.issue === "future") {
            warnings.push(m.editor_markdown_import_date_future());
          } else {
            warnings.push(m.editor_markdown_import_date_invalid());
          }
        }

        const currentEditor = editorRef.current;
        const currentContent =
          currentEditor && !currentEditor.isDestroyed
            ? postContentOf(currentEditor.state.doc)
            : editorContentRef.current;
        if (
          !confirmed &&
          markdownImportReplacesExistingData(
            document,
            postRef.current,
            currentContent,
          )
        ) {
          setPendingMarkdownImport(pending);
          return;
        }

        try {
          await flush();
        } catch {
          toast.error(m.editor_status_save_error());
          return;
        }

        const latestEditor = editorRef.current;
        const latestContent =
          latestEditor && !latestEditor.isDestroyed
            ? postContentOf(latestEditor.state.doc)
            : editorContentRef.current;
        if (
          !confirmed &&
          markdownImportReplacesExistingData(
            document,
            postRef.current,
            latestContent,
          )
        ) {
          setPendingMarkdownImport(pending);
          return;
        }

        let importedDocument = document;
        if (document.localImageSources.length > 0 && imageFiles.length > 0) {
          const imageMatches = matchMarkdownImageFiles(
            document.localImageSources,
            imageFiles,
            markdownPath,
          );
          const referencedFiles = [...new Set(imageMatches.bySource.values())];

          if (referencedFiles.length > 0) {
            imageUploadToastId = toast.loading(
              m.editor_markdown_import_upload_progress({
                current: 0,
                total: referencedFiles.length,
              }),
            );
            const uploadResults = await uploadMarkdownImages(
              referencedFiles,
              (current, total) => {
                toast.loading(
                  m.editor_markdown_import_upload_progress({ current, total }),
                  { id: imageUploadToastId },
                );
              },
            );
            const resolvedImages = new Map<string, ResolvedMarkdownImage>();
            for (const [source, file] of imageMatches.bySource) {
              const uploaded = uploadResults.uploaded.get(file);
              if (uploaded) resolvedImages.set(source, uploaded);
            }

            importedDocument = parseMarkdownImport(source, {
              resolveLocalImage: (imageSource) =>
                resolvedImages.get(imageSource),
            });
            if (uploadResults.uploaded.size > 0) {
              void queryClient.invalidateQueries({
                queryKey: orpc.media.key(),
              });
            }
          }
        }
        if (importedDocument.localImageCount > 0) {
          warnings.push(
            m.editor_markdown_import_images_missing({
              count: importedDocument.localImageCount,
            }),
          );
        }

        const editor = editorRef.current;
        if (!editor || editor.isDestroyed) {
          toast.error(m.editor_markdown_import_failed());
          return;
        }

        const contentSet = editor.commands.setContent(
          { type: "doc", content: importedDocument.content },
          { emitUpdate: true },
        );
        if (!contentSet) {
          toast.error(m.editor_markdown_import_failed());
          return;
        }

        if (Object.keys(updates).length > 0) handlePostChange(updates);

        setPendingMarkdownImport(null);
        toast.success(m.editor_markdown_import_success(), {
          description: fileName,
        });
        if (warnings.length > 0) {
          toast.warning(m.editor_markdown_import_partial(), {
            description: warnings.join(" · "),
          });
        }
      } catch (error) {
        console.error("Markdown import failed:", error);
        toast.error(
          m.editor_markdown_import_failed(),
          error instanceof Error &&
            error.message === "Invalid Markdown front matter"
            ? { description: m.editor_markdown_import_invalid_frontmatter() }
            : undefined,
        );
      } finally {
        if (imageUploadToastId !== undefined) {
          toast.dismiss(imageUploadToastId);
        }
        setIsImportingMarkdown(false);
      }
    },
    [flush, handlePostChange, queryClient],
  );

  const handleMarkdownFilesChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, fromFolder = false) => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = "";
      if (files.length === 0) return;

      const markdownFiles = files.filter((file) =>
        /\.(?:md|markdown)$/i.test(file.name),
      );
      if (markdownFiles.length === 0) {
        toast.error(m.editor_markdown_import_invalid_file());
        return;
      }
      if (markdownFiles.length > 1) {
        toast.error(
          fromFolder
            ? m.editor_markdown_import_folder_multiple()
            : m.editor_markdown_import_multiple(),
        );
        return;
      }

      const markdownFile = markdownFiles[0];
      if (!markdownFile) return;

      try {
        const source = await markdownFile.text();
        const document = parseMarkdownImport(source);
        const currentPost = postRef.current;
        const editor = editorRef.current;
        const currentContent =
          editor && !editor.isDestroyed
            ? postContentOf(editor.state.doc)
            : editorContentRef.current;
        const markdownPath =
          markdownFile.webkitRelativePath || markdownFile.name;
        const imageFiles = files.filter(
          (file) =>
            file !== markdownFile && ACCEPTED_IMAGE_TYPES.includes(file.type),
        );
        const hasMatchedImages =
          matchMarkdownImageFiles(
            document.localImageSources,
            imageFiles,
            markdownPath,
          ).bySource.size > 0;
        const pending: PendingMarkdownImport = {
          fileName: markdownFile.name,
          markdownPath,
          source,
          document,
          imageFiles,
        };

        if (
          hasMatchedImages ||
          markdownImportReplacesExistingData(
            document,
            currentPost,
            currentContent,
          )
        ) {
          setPendingMarkdownImport(pending);
        } else void applyMarkdownImport(pending);
      } catch (error) {
        console.error("Markdown import failed:", error);
        toast.error(
          m.editor_markdown_import_failed(),
          error instanceof Error &&
            error.message === "Invalid Markdown front matter"
            ? { description: m.editor_markdown_import_invalid_frontmatter() }
            : undefined,
        );
      }
    },
    [applyMarkdownImport],
  );

  const openHistory = useCallback(async () => {
    try {
      await flush();
    } catch {
      toast.error(m.editor_status_save_error());
      return;
    }
    const revisions = await queryClient.ensureQueryData(
      postRevisionListQuery(initialData.id),
    );
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (desktop && revisions[0]) {
      await navigate({
        to: "/admin/posts/edit/$id/history/$revisionId",
        params: {
          id: String(initialData.id),
          revisionId: String(revisions[0].id),
        },
      });
      return;
    }
    await navigate({
      to: "/admin/posts/edit/$id/history",
      params: { id: String(initialData.id) },
    });
  }, [flush, initialData.id, navigate, queryClient]);

  const publishRef = useRef(handlePublish);
  publishRef.current = handlePublish;

  useEffect(() => {
    if (infoOpen) {
      setMobileTitle(m.editor_info_title());
      setPrimaryAction({
        label: m.editor_info_done(),
        onClick: () => setInfoOpen(false),
      });
    } else {
      setMobileTitle(post.title.trim() || m.common_untitled());
      setPrimaryAction({
        label:
          processState === "PROCESSING"
            ? m.editor_header_processing()
            : m.editor_header_publish(),
        onClick: () => {
          void publishRef.current();
        },
        disabled: processState !== "IDLE" || !canPublish,
      });
    }
  }, [
    canPublish,
    infoOpen,
    post.title,
    processState,
    setMobileTitle,
    setPrimaryAction,
  ]);

  useEffect(() => {
    return () => {
      setMobileTitle(null);
      setPrimaryAction(null);
    };
  }, [setMobileTitle, setPrimaryAction]);

  const metadata = (
    <PostEditorMetadata
      post={post}
      isGeneratingSlug={isGeneratingSlug}
      onPostChange={handlePostChange}
      onGenerateSlug={handleGenerateSlug}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ConfirmationModal
        isOpen={status === "blocked"}
        onClose={() => reset?.()}
        onConfirm={() => proceed?.()}
        title={m.editor_leave_title()}
        message={m.editor_leave_message()}
        confirmLabel={m.editor_leave_confirm()}
      />
      <input
        ref={markdownFileInputRef}
        type="file"
        multiple
        accept={`.md,.markdown,${ACCEPTED_IMAGE_TYPES.join(",")}`}
        className="hidden"
        onChange={(event) => void handleMarkdownFilesChange(event)}
      />
      <input
        ref={markdownFolderInputRef}
        type="file"
        multiple
        accept={`.md,.markdown,${ACCEPTED_IMAGE_TYPES.join(",")}`}
        className="hidden"
        onChange={(event) => void handleMarkdownFilesChange(event, true)}
      />
      <ConfirmationModal
        isOpen={pendingMarkdownImport !== null}
        onClose={() => {
          if (!isImportingMarkdown) setPendingMarkdownImport(null);
        }}
        onConfirm={() => {
          if (pendingMarkdownImport)
            void applyMarkdownImport(pendingMarkdownImport, true);
        }}
        title={m.editor_markdown_import_replace_title()}
        message={m.editor_markdown_import_replace_message({
          fileName: pendingMarkdownImport?.fileName ?? "",
        })}
        confirmLabel={m.editor_markdown_import_replace_confirm()}
        isLoading={isImportingMarkdown}
      />

      <section className="post-editor-workspace fuwari-card-base">
        <PostEditorHeader
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          processState={processState}
          canPublish={canPublish}
          hasPublicSnapshot={post.hasPublicSnapshot}
          publicSlug={post.hasPublicSnapshot ? publicSlug : null}
          title={post.title}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onDelete={() => void handleDelete()}
          isDeleting={settlingSave || deleteMutation.isPending}
          infoOpen={infoOpen}
          onOpenInfo={() => setInfoOpen((value) => !value)}
          onOpenHistory={() => void openHistory()}
          onImportMarkdown={openMarkdownImport}
          onImportMarkdownFolder={openMarkdownFolderImport}
        />
        <div className="post-editor-body">
          <CodeBlockHighlightProvider
            snapshotContent={initialData.publicSnapshotContentJson}
          >
            <Editor
              key={editorRenderKey}
              className="post-editor-surface"
              toolbarClassName="post-editor-toolbar"
              documentClassName="post-editor-document custom-scrollbar"
              scrollContainerId="post-editor-scroll-container"
              contentClassName="min-h-50"
              documentHeader={
                <>
                  <TextareaTitle
                    value={post.title}
                    onChange={(title) => handlePostChange({ title })}
                  />
                  <PostEditorSummary
                    categoryId={post.categoryId}
                    tagIds={post.tagIds}
                    hasCover={Boolean(post.cover)}
                    onOpenInfo={() => setInfoOpen(true)}
                  />
                </>
              }
              extensions={extensions}
              content={editorContent ?? ""}
              onUpdate={handleEditorUpdate}
              onCreated={handleEditorCreated}
            />
          </CodeBlockHighlightProvider>
        </div>
        <PostEditorInfoPanel open={infoOpen} onClose={closeInfo}>
          {metadata}
        </PostEditorInfoPanel>
      </section>
    </div>
  );
}

function TextareaTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (title: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={m.editor_title_placeholder()}
      aria-label={m.editor_title_placeholder()}
      className="post-editor-title w-full resize-none overflow-hidden bg-transparent fuwari-text-90 outline-none placeholder:fuwari-text-30"
      onInput={(event) => {
        const el = event.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
      ref={(el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
    />
  );
}
