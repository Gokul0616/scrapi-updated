import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Play } from 'lucide-react';
import api from '../services/api';

export function Runs() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  
  useEffect(() => {
    fetchRuns();
  }, []);
  
  const fetchRuns = async () => {
    try {
      const response = await api.get('/api/runs');
      setRuns(response.data.runs || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
    }
  };

  const totalPages = Math.ceil(runs.length / itemsPerPage);

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
  
  const getStatusBadge = (status) => {
    const styles = {
      succeeded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    
    return (
      <Badge className={`${styles[status] || styles.running} hover:${styles[status]}`}>
        {status === 'succeeded' && '✓ '}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Runs"
        actions={
          <Button variant="outline">API</Button>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by run ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="ml-auto text-sm font-medium">
            {runs.length} Runs
          </div>
        </div>
        
        {/* Runs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="border-b bg-muted/50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left p-4 font-medium w-12 bg-muted/50"></th>
                    <th className="text-left p-4 font-medium min-w-[200px] bg-muted/50">Actor</th>
                    <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Status</th>
                    <th className="text-left p-4 font-medium min-w-[140px] bg-muted/50">Run ID</th>
                    <th className="text-left p-4 font-medium text-center min-w-[100px] bg-muted/50">Results</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Usage</th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Started</th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Finished</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Duration</th>
                    <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length > 0 ? (
                    runs.map((run) => (
                      <tr 
                        key={run.runId} 
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors" 
                        onClick={() => navigate(`/runs/${run.runId}`)}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {run.actorName?.charAt(0) || 'R'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm whitespace-nowrap">{run.actorName || 'Unknown Actor'}</p>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">{run.actorId?.replace('-', '/') || 'unknown'}-scraper</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(run.status)}
                        </td>
                        <td className="p-4">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-mono">
                            {run.runId?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {run.resultCount || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">${run.usage?.toFixed(2) || '0.00'}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">
                              {new Date(run.startedAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit' 
                              })}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(run.startedAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {run.finishedAt ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(run.finishedAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                })}
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(run.finishedAt).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Running...</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {run.duration || '-'}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="font-normal">
                            Web
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">No runs found</h3>
                            <p className="text-sm text-muted-foreground">
                              Start a scraper to see runs appear here
                            </p>
                          </div>
                          <Link to="/store">
                            <Button>Browse Scrapers</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {runs.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t">
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
                    </SelectContent>
                  </Select>
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
                  />
                  <Button variant="outline" size="sm" onClick={handleGoToPage}>Go</Button>
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>‹</Button>
                  <span className="text-sm px-2">{currentPage} / {totalPages || 1}</span>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>›</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
