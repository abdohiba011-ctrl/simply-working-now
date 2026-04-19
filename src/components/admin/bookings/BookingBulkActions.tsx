import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  Download,
  Trash2,
  Send
} from "lucide-react";

interface BookingBulkActionsProps {
  selectedCount: number;
  onBulkConfirm: () => void;
  onBulkReject: () => void;
  onBulkAssign: () => void;
  onExportCsv: () => void;
  onClearSelection: () => void;
}

export const BookingBulkActions = ({
  selectedCount,
  onBulkConfirm,
  onBulkReject,
  onBulkAssign,
  onExportCsv,
  onClearSelection
}: BookingBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-3 bg-background border rounded-lg shadow-lg">
        <span className="text-sm font-medium mr-2">
          {selectedCount} selected
        </span>

        <div className="h-6 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={onBulkAssign}>
          <Send className="h-4 w-4 mr-1" />
          Assign
        </Button>

        <Button variant="outline" size="sm" onClick={onBulkConfirm}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Confirm
        </Button>

        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onBulkReject}>
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
};
