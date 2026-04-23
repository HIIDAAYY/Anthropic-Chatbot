'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
} from 'lucide-react';

interface KBDocument {
  id: string;
  fileName: string;
  originalName: string;
  knowledgeBaseId: string;
  uploadedBy: string;
  fileSize: number;
  chunkCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

interface TestMatch {
  score: number;
  text: string;
  fileName: string;
  documentId: string;
  chunkIndex: number;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<TestMatch[]>([]);
  const [testing, setTesting] = useState(false);

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/knowledge-base/list');
      const data = await res.json();

      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('knowledgeBaseId', 'default');

    try {
      const res = await fetch('/api/admin/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Success! Uploaded ${data.chunks} chunks from ${file.name}`);
        loadDocuments(); // Refresh list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Upload failed: ${error}`);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle delete
  const handleDelete = async (doc: KBDocument) => {
    if (!confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/knowledge-base/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Document deleted successfully');
        loadDocuments(); // Refresh list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Delete failed: ${error}`);
    }
  };

  // Handle test query
  const handleTestQuery = async () => {
    if (!testQuery.trim()) {
      alert('Please enter a test query');
      return;
    }

    setTesting(true);
    setTestResults([]);

    try {
      const res = await fetch('/api/admin/knowledge-base/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          knowledgeBaseId: 'default',
          topK: 5,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestResults(data.matches);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Query failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge className="bg-blue-500">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage documents for the AI chatbot
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload TXT, MD, or PDF files to add knowledge to the chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
            <Input
              type="file"
              accept=".txt,.md,.pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="max-w-md mx-auto cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-3">
              Supported: TXT, Markdown, PDF • Max size: 10MB
            </p>
            {uploading && (
              <p className="text-sm text-blue-600 mt-2 animate-pulse">
                Uploading and processing... This may take a minute.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Uploaded Documents ({documents.length})
          </CardTitle>
          <CardDescription>
            Manage knowledge base documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload your first document above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.originalName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{doc.chunkCount} chunks</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                        <div className="mt-2">{getStatusBadge(doc.status)}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      disabled={doc.status === 'PROCESSING'}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Query */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Test RAG Query
          </CardTitle>
          <CardDescription>
            Test how the bot retrieves information from the knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder='Try: "Ada promo apa bulan ini?"'
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
              disabled={testing}
            />
            <Button onClick={handleTestQuery} disabled={testing || !testQuery.trim()}>
              {testing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="font-medium">
                Results ({testResults.length} matches):
              </h4>
              {testResults.map((match, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {match.fileName} (chunk {match.chunkIndex + 1})
                    </span>
                    <Badge variant="outline">
                      Score: {(match.score * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{match.text}</p>
                </div>
              ))}
            </div>
          )}

          {testResults.length === 0 && testQuery && !testing && (
            <p className="text-sm text-muted-foreground">
              No results found. Try a different query or upload more documents.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
