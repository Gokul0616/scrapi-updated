import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { ArrowLeft, Download, Share2, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';


export function RunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  
  useEffect(() => {
    fetchRun();
    
    // Auto-refresh if running
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchRun(true);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [runId, autoRefresh]);
  
  const fetchRun = async (silent = false) => {
    try {
      const response = await api.get(`/api/runs/${runId}`);
      const runData = response.data;
      
      // Parse output if it's a string
      if (typeof runData.output === 'string') {
        try {
          runData.output = JSON.parse(runData.output);
        } catch (e) {
          console.error('Failed to parse output:', e);
        }
      }
      
      setRun(runData);
      
      // Stop auto-refresh if run is completed
      if (runData.status !== 'running') {
        setAutoRefresh(false);
      }
      
      if (!silent) setLoading(false);
    } catch (error) {
      console.error('Error fetching run:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to load run details',
          variant: 'destructive'
        });
        setLoading(false);
      }
    }
  };
  
  const downloadResults = () => {
    if (!run || !run.output) return;
    
    const dataStr = JSON.stringify(run.output, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper-results-${runId}.json`;
    link.click();
    
    toast({
      title: 'Downloaded',
      description: 'Results downloaded as JSON',
    });
  };
  
  const getStatusColor = (status) => {
    const colors = {
      succeeded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return colors[status] || colors.running;
  };

  // Extract results array from output if it exists
  const getResultsData = () => {
    if (!run?.output || run.output.length === 0) return [];
    
    // Check if output items have a 'results' array property
    if (run.output[0]?.results && Array.isArray(run.output[0].results)) {
      // Flatten all results from all output items
      return run.output.flatMap(item => item.results || []);
    }
    
    // Otherwise return output as-is
    return run.output;
  };
  
  const resultsData = getResultsData();
  
  // Pagination handlers
  const totalPages = Math.ceil((resultsData?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOutput = resultsData?.slice(startIndex, startIndex + itemsPerPage) || [];

  const handleGoToPage = () => {
    let pageNum = parseInt(goToPageInput);
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    } else if (pageNum > totalPages) {
      pageNum = totalPages;
    }
    setCurrentPage(pageNum);
    setGoToPageInput(pageNum.toString());
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setGoToPageInput((currentPage - 1).toString());
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setGoToPageInput((currentPage + 1).toString());
    }
  };
  
  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Loading..." />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
      </div>
    );
  }
  
  if (!run) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Run Not Found" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">The run you're looking for doesn't exist.</p>
          <Link to="/runs">
            <Button>Back to Runs</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Run Details"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={downloadResults}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Run Status Card */}
        <Card className={run.status === 'succeeded' ? 'border-green-200 dark:border-green-800' : ''}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge className={getStatusColor(run.status)}>
                    {run.status === 'succeeded' && '✓ '}
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                  {run.status === 'running' && (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Auto-refreshing...
                    </span>
                  )}
                </div>
                
                <Link to={`/actors/${run.actorId}`}>
                  <h2 className="text-2xl font-bold mb-2 hover:underline cursor-pointer">{run.actorName}</h2>
                </Link>
                
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Results</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resultsData?.length || run.resultCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-2xl font-bold">{run.duration || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usage</p>
                    <p className="text-2xl font-bold">${run.usage?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Run ID</p>
                    <p className="text-sm font-mono truncate">{run.runId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {run.finishedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Finished</p>
                      <p className="font-medium">
                        {new Date(run.finishedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs */}
        <Tabs defaultValue="output">
          <TabsList>
            <TabsTrigger value="output">Output ({run.output?.length || 0})</TabsTrigger>
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="output">
            {/* Search Metadata */}
            {run.output && run.output.length > 0 && run.output[0]?.results && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base">Search Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(run.output[0]).map(([key, value]) => {
                      if (key === 'results' || typeof value === 'object') return null;
                      return (
                        <div key={key}>
                          <p className="text-sm text-muted-foreground mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </p>
                          <p className="font-medium text-sm">
                            {typeof value === 'string' && value.startsWith('http') ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                View URL
                              </a>
                            ) : (
                              String(value || '-')
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scraped Results ({resultsData?.length || 0} items)</CardTitle>
                  {run.output && run.output.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadResults}>
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {resultsData && resultsData.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50 sticky top-0">
                          <tr className="text-sm text-muted-foreground">
                            <th className="text-left p-4 font-medium w-12 bg-muted/50">#</th>
                            {Object.keys(resultsData[0]).map((key) => (
                              <th key={key} className="text-left p-4 font-medium min-w-[150px] bg-muted/50 whitespace-nowrap">
                                {key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, str => str.toUpperCase())
                                  .replace(/_/g, ' ')
                                  .trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOutput.map((item, index) => (
                            <tr key={startIndex + index} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="p-4 text-sm text-muted-foreground font-mono bg-muted/30">
                                {startIndex + index + 1}
                              </td>
                              {Object.entries(item).map(([key, value]) => (
                                <td key={key} className="p-4 text-sm align-top">
                                  {value === null || value === undefined ? (
                                    <span className="text-muted-foreground">-</span>
                                  ) : typeof value === 'object' ? (
                                    <details className="cursor-pointer">
                                      <summary className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                        {Array.isArray(value) ? `Array (${value.length} items)` : 'View object'}
                                      </summary>
                                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto max-w-md max-h-64 overflow-y-auto">
                                        {JSON.stringify(value, null, 2)}
                                      </pre>
                                    </details>
                                  ) : typeof value === 'string' && value.startsWith('http') ? (
                                    <a 
                                      href={value} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                                      title={value}
                                    >
                                      🔗 Open
                                    </a>
                                  ) : typeof value === 'number' ? (
                                    <span className="font-mono">{value}</span>
                                  ) : typeof value === 'boolean' ? (
                                    <span className={value ? 'text-green-600' : 'text-red-600'}>
                                      {value ? '✓ Yes' : '✗ No'}
                                    </span>
                                  ) : (
                                    <span className="block max-w-xs" title={String(value)}>
                                      {String(value || '-')}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {resultsData.length > 0 && (
                      <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Items per page:</span>
                          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                            setItemsPerPage(parseInt(value));
                            setCurrentPage(1);
                            setGoToPageInput('1');
                          }}>
                            <SelectTrigger className="w-[80px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="500">500</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground ml-4">
                            Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, resultsData.length)} of {resultsData.length}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Go to page:</span>
                          <Input 
                            className="w-16 h-8" 
                            value={goToPageInput} 
                            onChange={(e) => setGoToPageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                            type="number" 
                            min="1"
                            max={totalPages}
                          />
                          <Button variant="outline" size="sm" onClick={handleGoToPage}>Go</Button>
                          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>‹</Button>
                          <span className="text-sm px-2">{currentPage} / {totalPages || 1}</span>
                          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>›</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {run.status === 'running' ? (
                      <>
                        <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
                        <p>Scraping in progress...</p>
                      </>
                    ) : (
                      <p>No output data available</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="input">
            <Card>
              <CardHeader>
                <CardTitle>Input Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(run.input, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="log">
            <Card>
              <CardHeader>
                <CardTitle>Execution Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full">
                  <div className="font-mono text-sm space-y-1">
                    <p>[{new Date(run.startedAt).toLocaleTimeString()}] Run started</p>
                    <p>[{new Date(run.startedAt).toLocaleTimeString()}] Actor: {run.actorName}</p>
                    <p>[{new Date(run.startedAt).toLocaleTimeString()}] Input validated</p>
                    {run.status !== 'running' && (
                      <>
                        <p>[{new Date(run.finishedAt).toLocaleTimeString()}] Scraping completed</p>
                        <p>[{new Date(run.finishedAt).toLocaleTimeString()}] Results: {run.resultCount} items</p>
                        {run.error && (
                          <p className="text-red-600">[ERROR] {run.error}</p>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <CardTitle>Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Dataset</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {run.resultCount} items stored
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Key-Value Store</span>
                      <Badge variant="outline">Empty</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No key-value pairs stored
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}