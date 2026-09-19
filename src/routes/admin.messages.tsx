import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMessages, markMessageHandled } from "@/lib/orders";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessages,
});

function AdminMessages() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "messages"], queryFn: fetchMessages });

  const toggle = useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) =>
      markMessageHandled(id, handled),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => toast.error("Could not update that message"),
  });

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;

  const messages = data ?? [];

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          No messages yet. Enquiries from the contact page land here.
        </div>
      ) : (
        messages.map((m) => (
          <article
            key={m.id}
            className={`rounded-2xl border p-5 ${
              m.handled ? "border-border bg-surface" : "border-primary/40 bg-accent/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{m.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {m.email}
                  </span>
                  {m.phone ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {m.phone}
                    </span>
                  ) : null}
                  <span>{new Date(m.created_at).toLocaleString("en-IN")}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {m.topic}
                </Badge>
                <Button
                  size="sm"
                  variant={m.handled ? "outline" : "default"}
                  className="rounded-full"
                  onClick={() => toggle.mutate({ id: m.id, handled: !m.handled })}
                >
                  {m.handled ? "Reopen" : "Mark handled"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm whitespace-pre-line">{m.message}</p>
          </article>
        ))
      )}
    </div>
  );
}
