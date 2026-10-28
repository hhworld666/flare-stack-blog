import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, FilePlus2, Pencil, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-heading";
import { isValidSitePageSlug } from "@/features/site-pages/site-page-path";
import { adminSitePagesQuery } from "@/features/site-pages/queries";
import type { AdminSitePage } from "@/features/site-pages/site-pages.schema";
import { SitePageContent } from "@/features/site-pages/components/site-page-content";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function SitePagesAdminList() {
  const { data: pages } = useSuspenseQuery(adminSitePagesQuery);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={m.site_pages_title()}
        actions={
          <Link
            to="/admin/site-pages/new"
            className={buttonClass({ variant: "primary" })}
          >
            <FilePlus2 size={17} strokeWidth={1.7} />
            {m.site_pages_create()}
          </Link>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title={m.site_pages_empty_title()}
          description={m.site_pages_empty_description()}
          action={
            <Link
              to="/admin/site-pages/new"
              className={buttonClass({ variant: "primary" })}
            >
              {m.site_pages_create()}
            </Link>
          }
        />
      ) : (
        <ul className="fuwari-card-base divide-y divide-black/5 overflow-hidden dark:divide-white/10">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                to="/admin/site-pages/$id"
                params={{ id: String(page.id) }}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/3 dark:hover:bg-white/4 md:px-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 fuwari-text-50 transition-colors group-hover:text-(--fuwari-primary) dark:bg-white/8">
                  <Pencil size={18} strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium fuwari-text-90">
                    {page.title}
                  </span>
                  <span className="mt-1 block truncate text-sm fuwari-text-50">
                    /{page.slug}
                  </span>
                </span>
                <span className="shrink-0 text-sm fuwari-text-50">
                  {m.site_pages_edit()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function slugFromTitle(title: string) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function SitePageEditor({ page }: { page?: AdminSitePage }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [contentMarkdown, setContentMarkdown] = useState(
    page?.contentMarkdown ?? "",
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(page));
  const [slugError, setSlugError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (input: {
      title: string;
      slug: string;
      contentMarkdown: string;
    }) =>
      page
        ? orpcClient.pages.admin.update({ id: page.id, ...input })
        : orpcClient.pages.admin.create(input),
    onSuccess: async (savedPage) => {
      await queryClient.invalidateQueries({ queryKey: orpc.pages.key() });
      toast.success(page ? m.site_pages_saved() : m.site_pages_created());
      if (!page) {
        await navigate({
          to: "/admin/site-pages/$id",
          params: { id: String(savedPage.id) },
          replace: true,
        });
      }
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("already in use")
      ) {
        setSlugError(m.site_pages_path_taken());
        return;
      }
      toast.error(m.site_pages_save_failed());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!page) throw new Error("Only saved pages can be deleted.");
      return orpcClient.pages.admin.remove({ id: page.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.pages.key() });
      toast.success(m.site_pages_deleted());
      await navigate({ to: "/admin/site-pages" });
    },
    onError: () => toast.error(m.site_pages_delete_failed()),
  });

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedTitle) {
      setTitleError(m.site_pages_title_required());
      return;
    }
    setTitleError("");
    if (!isValidSitePageSlug(normalizedSlug)) {
      setSlugError(m.site_pages_path_invalid());
      return;
    }
    setSlugError("");
    saveMutation.mutate({
      title: normalizedTitle,
      slug: normalizedSlug,
      contentMarkdown,
    });
  };

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <PageHeader
          title={page ? m.site_pages_edit() : m.site_pages_new()}
          actions={
            <>
              <Link
                to="/admin/site-pages"
                className={buttonClass({ variant: "regular" })}
              >
                <ArrowLeft size={16} />
                {m.site_pages_back()}
              </Link>
              {page ? (
                <Button
                  variant="danger"
                  type="button"
                  icon={<Trash2 size={16} />}
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending || saveMutation.isPending}
                >
                  {m.site_pages_delete()}
                </Button>
              ) : null}
              <Button
                variant="primary"
                type="submit"
                loading={saveMutation.isPending}
                disabled={deleteMutation.isPending}
                icon={<Save size={16} />}
              >
                {m.site_pages_save()}
              </Button>
            </>
          }
        />

        <section className="fuwari-card-base flex flex-col gap-5 p-5 md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label={m.site_pages_field_title()}
              error={titleError || undefined}
              required
            >
              <Input
                value={title}
                maxLength={120}
                required
                onChange={(event) => {
                  const nextTitle = event.currentTarget.value;
                  setTitle(nextTitle);
                  setTitleError("");
                  if (!slugEdited) setSlug(slugFromTitle(nextTitle));
                }}
              />
            </FormField>
            <FormField
              label={m.site_pages_field_path()}
              error={slugError || undefined}
              required
            >
              <Input
                value={slug}
                maxLength={100}
                required
                aria-invalid={slugError ? true : undefined}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.currentTarget.value.toLowerCase());
                  setSlugError("");
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium fuwari-text-90">
                {m.site_pages_field_markdown()}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={showPreview ? "regular" : "primary"}
                  size="sm"
                  icon={<Pencil size={15} />}
                  aria-pressed={!showPreview}
                  onClick={() => setShowPreview(false)}
                >
                  {m.site_pages_edit()}
                </Button>
                <Button
                  type="button"
                  variant={showPreview ? "primary" : "regular"}
                  size="sm"
                  icon={<Eye size={15} />}
                  aria-pressed={showPreview}
                  onClick={() => setShowPreview(true)}
                >
                  {m.site_pages_preview()}
                </Button>
              </div>
            </div>

            {showPreview ? (
              <div className="min-h-[32rem] overflow-auto rounded-xl border border-black/10 p-5 dark:border-white/12 md:p-7">
                <h1 className="mb-6 text-3xl font-bold fuwari-text-90">
                  {title.trim() || m.site_pages_preview_title()}
                </h1>
                <div className="prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
                  <SitePageContent markdown={contentMarkdown} />
                </div>
              </div>
            ) : (
              <Textarea
                value={contentMarkdown}
                onChange={(event) =>
                  setContentMarkdown(event.currentTarget.value)
                }
                rows={24}
                maxLength={200_000}
                className="min-h-[32rem] resize-y font-mono text-sm leading-6"
                aria-label={m.site_pages_field_markdown()}
              />
            )}
          </div>
        </section>
      </form>

      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => {
          if (!deleteMutation.isPending) setConfirmDelete(false);
        }}
        onConfirm={() => {
          void deleteMutation.mutateAsync().catch(() => {});
        }}
        title={m.site_pages_delete_title()}
        message={m.site_pages_delete_message({ title: page?.title ?? "" })}
        confirmLabel={m.site_pages_delete()}
        isDanger
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
