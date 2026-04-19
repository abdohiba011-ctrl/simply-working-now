import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import {
  StickyNote,
  File,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  FileImage,
  FileText,
  FileSpreadsheet,
  History,
  FileVideo,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { NoteData, ClientFileData, NoteCategory } from "./types";
import { 
  formatDateTime, 
  formatRelativeTime, 
  formatFileSize, 
  getCategoryBadgeColors,
  isImageFile,
  isVideoFile,
  isPdfFile,
  isDocumentFile,
  isSpreadsheetFile,
} from "./helpers";

interface ClientNotesFilesTabProps {
  notes: NoteData[];
  files: ClientFileData[];
  onAddNote: () => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewFile: (file: { id: string; fileName: string; fileType: string }) => void;
  onDownloadFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onViewDownloadHistory: (fileId: string, fileName: string) => void;
  onBulkDownload: (fileIds: string[]) => void;
  onBulkDelete: (fileIds: string[]) => void;
  isUploadingFile: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(type)) {
    return <FileImage className="h-4 w-4 text-info" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'].includes(type)) {
    return <FileVideo className="h-4 w-4 text-purple-500" />;
  }
  if (['pdf'].includes(type)) {
    return <FileText className="h-4 w-4 text-destructive" />;
  }
  if (['doc', 'docx'].includes(type)) {
    return <FileText className="h-4 w-4 text-info" />;
  }
  if (['xls', 'xlsx'].includes(type)) {
    return <FileSpreadsheet className="h-4 w-4 text-success" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

export const ClientNotesFilesTab = ({
  notes,
  files,
  onAddNote,
  onTogglePin,
  onDeleteNote,
  onFileUpload,
  onPreviewFile,
  onDownloadFile,
  onDeleteFile,
  onViewDownloadHistory,
  onBulkDownload,
  onBulkDelete,
  isUploadingFile,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: ClientNotesFilesTabProps) => {
  const [notesFilesTab, setNotesFilesTab] = useState<"notes" | "files">("notes");
  const [fileSearch, setFileSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [fileSortBy, setFileSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [fileSortOrder, setFileSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes]);

  const filteredFiles = useMemo(() => {
    let filtered = files;
    
    if (fileSearch) {
      const searchLower = fileSearch.toLowerCase();
      filtered = filtered.filter((f) => 
        f.fileName.toLowerCase().includes(searchLower) ||
        f.uploadedByName?.toLowerCase().includes(searchLower)
      );
    }
    
    if (fileTypeFilter !== "all") {
      if (fileTypeFilter === "image") {
        filtered = filtered.filter((f) => isImageFile(f.fileType));
      } else if (fileTypeFilter === "video") {
        filtered = filtered.filter((f) => isVideoFile(f.fileType));
      } else if (fileTypeFilter === "pdf") {
        filtered = filtered.filter((f) => isPdfFile(f.fileType));
      } else if (fileTypeFilter === "document") {
        filtered = filtered.filter((f) => isDocumentFile(f.fileType));
      } else if (fileTypeFilter === "spreadsheet") {
        filtered = filtered.filter((f) => isSpreadsheetFile(f.fileType));
      }
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (fileSortBy) {
        case "name":
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case "date":
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case "size":
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case "type":
          comparison = a.fileType.localeCompare(b.fileType);
          break;
      }
      return fileSortOrder === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [files, fileSearch, fileTypeFilter, fileSortBy, fileSortOrder]);

  const handleFileSortToggle = (column: "name" | "date" | "size" | "type") => {
    if (fileSortBy === column) {
      setFileSortOrder(fileSortOrder === "asc" ? "desc" : "asc");
    } else {
      setFileSortBy(column);
      setFileSortOrder("asc");
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAllFiles = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs for Notes and Files */}
      <div className="flex gap-2 border-b">
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            notesFilesTab === "notes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setNotesFilesTab("notes")}
        >
          <StickyNote className="h-4 w-4 inline mr-2" />
          Notes ({notes.length})
        </button>
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            notesFilesTab === "files"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setNotesFilesTab("files")}
        >
          <File className="h-4 w-4 inline mr-2" />
          Files ({files.length})
        </button>
      </div>

      {/* Notes Section */}
      {notesFilesTab === "notes" && (
        <>
          <div className="flex justify-end">
            <Button onClick={onAddNote}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          {sortedNotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notes yet. Add your first note above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <Card key={note.id} className={note.isPinned ? "border-primary/50" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryBadgeColors(note.category)}>{note.category}</Badge>
                          {note.isPinned && (
                            <Badge variant="outline" className="text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{note.text}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{note.createdBy}</span>
                          <span>•</span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onTogglePin(note.id)}
                        >
                          {note.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDeleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Files Section */}
      {notesFilesTab === "files" && (
        <>
          {/* Upload Area */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <CardContent className="py-8 text-center">
              <div className="flex flex-col items-center gap-3">
                {isUploadingFile ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drag and drop files here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                    <label>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi,.mkv,.webm,.m4v,.3gp"
                        multiple
                        onChange={onFileUpload}
                      />
                      <Button asChild variant="outline" size="sm">
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Supported: Images, Videos, PDF, Word, Excel (max 50MB for videos, 10MB for others)
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Files List */}
          {files.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Uploaded Files</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search files..."
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        className="pl-8 w-[180px] h-8 text-sm"
                      />
                    </div>
                    <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-sm">
                        <Filter className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                        <SelectItem value="pdf">PDFs</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Batch Actions */}
              {selectedFiles.size > 0 && (
                <CardContent className="py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedFiles.size} file(s) selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBulkDownload(Array.from(selectedFiles))}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => onBulkDelete(Array.from(selectedFiles))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              )}
              
              {/* Table */}
              <CardContent className="p-0">
                {filteredFiles.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No files match your search</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                            onCheckedChange={(checked) => handleSelectAllFiles(!!checked)}
                          />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleFileSortToggle("name")}
                        >
                          <div className="flex items-center gap-1">
                            File
                            {fileSortBy === "name" ? (
                              fileSortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleFileSortToggle("type")}
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {fileSortBy === "type" ? (
                              fileSortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleFileSortToggle("size")}
                        >
                          <div className="flex items-center gap-1">
                            Size
                            {fileSortBy === "size" ? (
                              fileSortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleFileSortToggle("date")}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {fileSortBy === "date" ? (
                              fileSortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Downloads</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id} className={cn(selectedFiles.has(file.id) && "bg-muted/50")}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div 
                              className={cn(
                                "flex items-center gap-2",
                                (isImageFile(file.fileType) || isPdfFile(file.fileType)) && "cursor-pointer hover:text-primary"
                              )}
                              onClick={() => {
                                if (isImageFile(file.fileType) || isPdfFile(file.fileType)) {
                                  onPreviewFile({ id: file.id, fileName: file.fileName, fileType: file.fileType });
                                }
                              }}
                            >
                              {getFileIcon(file.fileType)}
                              <span className="font-medium truncate max-w-[200px]">{file.fileName}</span>
                              {(isImageFile(file.fileType) || isPdfFile(file.fileType)) && (
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="uppercase text-xs">
                              {file.fileType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFileSize(file.fileSize)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {file.uploadedByName || file.uploadedBy}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="text-sm">
                              {format(parseISO(file.uploadedAt), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs">
                              {formatRelativeTime(file.uploadedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 gap-1"
                              onClick={() => onViewDownloadHistory(file.id, file.fileName)}
                            >
                              <Download className="h-3 w-3" />
                              <span className="text-xs">{file.downloadCount}</span>
                              {file.downloadCount > 0 && (
                                <History className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {(isImageFile(file.fileType) || isPdfFile(file.fileType)) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onPreviewFile({ id: file.id, fileName: file.fileName, fileType: file.fileType })}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onDownloadFile(file.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => onDeleteFile(file.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
