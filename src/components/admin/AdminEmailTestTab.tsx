import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Send, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SendLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent: { label: "Sent", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  failed: { label: "Failed", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  dlq: { label: "Failed (DLQ)", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  bounced: { label: "Bounced", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  complained: { label: "Complained", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  suppressed: { label: "Suppressed", icon: AlertTriangle, className: "bg-muted text-muted-foreground border-border" },
};

export const AdminEmailTestTab = () => {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<SendLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setRecipient(user.email);
  }, [user]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("email_send_log" as any)
        .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setLogs((data as unknown as SendLogRow[]) || []);
    } catch (err: any) {
      console.error("Failed to load email logs:", err);
      toast.error(`Failed to load logs: ${err.message ?? err}`);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const sendTestEmail = async () => {
    if (!recipient || !recipient.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    const idempotencyKey = `admin-test-${crypto.randomUUID()}`;
    setLastMessageId(idempotencyKey);
    try {
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-test",
          recipientEmail: recipient,
          idempotencyKey,
          templateData: {
            triggeredAt: new Date().toLocaleString(),
            triggeredBy: user?.email ?? "admin",
          },
        },
      });
      if (error) throw error;
      toast.success("Test email queued successfully");
      console.log("Send result:", data);
      // Give the queue a moment, then refresh
      setTimeout(fetchLogs, 1500);
    } catch (err: any) {
      console.error("Send failed:", err);
      toast.error(`Send failed: ${err.message ?? err}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send a test email
          </CardTitle>
          <CardDescription>
            Triggers a transactional email via your <code className="font-mono text-xs">notify.motonita.ma</code> domain
            and shows the result from the email send log below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-recipient">Recipient email</Label>
            <div className="flex gap-2">
              <Input
                id="test-recipient"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="you@example.com"
                disabled={sending}
              />
              <Button onClick={sendTestEmail} disabled={sending} className="gap-2 shrink-0">
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send test"}
              </Button>
            </div>
          </div>
          {lastMessageId && (
            <p className="text-xs text-muted-foreground">
              Last idempotency key:{" "}
              <code className="font-mono">{lastMessageId}</code>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent email send log</CardTitle>
            <CardDescription>Latest 20 entries from the email send log.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {loadingLogs ? "Loading..." : "No email logs yet. Send a test email to see results here."}
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const cfg = statusConfig[log.status] ?? {
                  label: log.status,
                  icon: Clock,
                  className: "bg-muted text-muted-foreground border-border",
                };
                const Icon = cfg.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{log.recipient_email}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.template_name}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        {log.message_id && (
                          <>
                            {" · "}
                            <code className="font-mono">{log.message_id.slice(0, 24)}…</code>
                          </>
                        )}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                      )}
                    </div>
                    <Badge className={`gap-1 ${cfg.className}`} variant="outline">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
