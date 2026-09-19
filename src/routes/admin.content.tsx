import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCmsBlocks, saveCmsBlock, type CmsBlockRow } from "@/lib/cms";

export const Route = createFileRoute("/admin/content")({
  component: AdminContent,
});

function BlockCard({ block }: { block: CmsBlockRow }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(block);

  const save = useMutation({
    mutationFn: () => saveCmsBlock(draft),
    onSuccess: async () => {
      toast.success("Page content updated");
      await qc.invalidateQueries({ queryKey: ["cms"] });
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not save this section"),
  });

  const set = <K extends keyof CmsBlockRow>(key: K, value: CmsBlockRow[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {block.page}
          </p>
          <p className="font-bold">{block.block_key}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />
          <span className="text-xs text-muted-foreground">Visible</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Heading</Label>
          <Input value={draft.heading} onChange={(e) => set("heading", e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Subheading</Label>
          <Input
            value={draft.subheading ?? ""}
            onChange={(e) => set("subheading", e.target.value || null)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Body</Label>
          <Textarea
            rows={3}
            value={draft.body ?? ""}
            onChange={(e) => set("body", e.target.value || null)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Button label</Label>
          <Input
            value={draft.link_label ?? ""}
            onChange={(e) => set("link_label", e.target.value || null)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Button link</Label>
          <Input
            value={draft.link_url ?? ""}
            onChange={(e) => set("link_url", e.target.value || null)}
          />
        </div>
      </div>

      <Button
        className="mt-4 rounded-full"
        size="sm"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        Save section
      </Button>
    </article>
  );
}

function AdminContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cms"],
    queryFn: () => fetchCmsBlocks(),
  });

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  const blocks = data ?? [];

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          No editable sections yet.
        </div>
      ) : (
        blocks.map((b) => <BlockCard key={b.id} block={b} />)
      )}
    </div>
  );
}
