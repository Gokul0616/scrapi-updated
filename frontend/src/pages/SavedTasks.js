import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Database, ExternalLink } from 'lucide-react';
import api from '../services/api';

export function SavedTasks() {
  const navigate = useNavigate();
  const [scrapedData, setScrapedData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchScrapedData();
  }, []);
  
  const fetchScrapedData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/scraped-data');
      setScrapedData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching scraped data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = scrapedData.filter(item =>
    JSON.stringify(item.dataItem).toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.actorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

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

  const getFirstFewFields = (dataItem) => {
    if (!dataItem || typeof dataItem !== 'object') return [];
    const entries = Object.entries(dataItem);
    return entries.slice(0, 4); // Show first 4 fields
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    return String(value);
  };
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Scraped Data"
        actions={
          <Button variant="outline">Export</Button>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scraped data"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="ml-auto text-sm font-medium">
            {filteredData.length} Records
          </div>
        </div>
        
        {/* Scraped Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="border-b bg-muted/50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left p-4 font-medium w-12 bg-muted/50"></th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Actor</th>
                    <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Run ID</th>
                    <th className="text-left p-4 font-medium min-w-[80px] text-center bg-muted/50">Item</th>
                    <th className="text-left p-4 font-medium min-w-[400px] bg-muted/50">Data Preview</th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Scraped At</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Usage</th>
                    <th className="text-left p-4 font-medium min-w-[80px] bg-muted/50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr 
                        key={item.id} 
                        className="border-b hover:bg-muted/50 transition-colors" 
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {item.actorName?.charAt(0) || 'D'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm whitespace-nowrap">{item.actorName || 'Unknown Actor'}</p>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">{item.actorId?.replace('-', '/') || 'unknown'}-scraper</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span 
                            className="text-blue-600 dark:text-blue-400 text-xs font-mono cursor-pointer hover:underline"
                            onClick={() => navigate(`/runs/${item.runId}`)}
                          >
                            {item.runId?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm font-medium">
                            {item.itemIndex} / {item.totalItems}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 max-w-md">
                            {getFirstFewFields(item.dataItem).map(([key, value]) => (
                              <div key={key} className="flex gap-2 text-xs">
                                <span className="font-medium text-muted-foreground min-w-[80px]">{key}:</span>
                                <span className="truncate">{formatValue(value)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          {item.scrapedAt ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(item.scrapedAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                })}
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(item.scrapedAt).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">${item.usage?.toFixed(2) || '0.00'}</span>
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/runs/${item.runId}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Database className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">No scraped data found</h3>
                            <p className="text-sm text-muted-foreground">
                              Run a scraper to collect data and see it here
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
            {paginatedData.length > 0 && (
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
