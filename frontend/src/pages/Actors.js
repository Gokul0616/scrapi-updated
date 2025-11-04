import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Star, Users, Filter, Search, Code, MapPin, Package, Instagram, Twitter, Facebook, Music, Globe, Linkedin, Bookmark } from 'lucide-react';
import api from '../services/api';


export function Actors() {
  const [actors, setActors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchActors();
  }, []);
  
  const fetchActors = async () => {
    try {
      setLoading(true);
      // Fetch user's used and bookmarked actors
      const response = await api.get('/api/actors?userActors=true');
      setActors(response.data);
    } catch (error) {
      console.error('Error fetching actors:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleBookmark = async (actorId) => {
    try {
      await api.patch(`/api/actors/${actorId}/bookmark`);
      // Refresh actors list
      fetchActors();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };
  
  const filteredActors = actors.filter(actor =>
    actor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActorIcon = (actorId) => {
    const icons = {
      'google-maps': <MapPin className="h-5 w-5" />,
      'amazon': <Package className="h-5 w-5" />,
      'instagram': <Instagram className="h-5 w-5" />,
      'twitter': <Twitter className="h-5 w-5" />,
      'facebook': <Facebook className="h-5 w-5" />,
      'tiktok': <Music className="h-5 w-5" />,
      'website': <Globe className="h-5 w-5" />,
      'linkedin': <Linkedin className="h-5 w-5" />
    };
    return icons[actorId] || <Globe className="h-5 w-5" />;
  };

  const totalPages = Math.ceil(filteredActors.length / itemsPerPage);

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
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Actors"
        actions={
          <div className="flex gap-2">
            <Button>Go to Store</Button>
            <Button variant="outline">Develop new</Button>
            <Button variant="outline">API</Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-6">
            <button 
              className={`pb-3 text-sm font-medium border-b-2 ${
                selectedTab === 'recent' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedTab('recent')}
            >
              Recent & Bookmarked
            </button>
            <button 
              className={`pb-3 text-sm font-medium border-b-2 ${
                selectedTab === 'issues' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedTab('issues')}
            >
              Issues
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Actor name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Last run status
          </Button>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Bookmarked
          </Button>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Pricing model
          </Button>
          
          <div className="ml-auto text-sm font-medium">
            {filteredActors.length} Actor{filteredActors.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Actors Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left p-4 font-medium w-12"></th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Total runs</th>
                    <th className="text-left p-4 font-medium">Pricing model</th>
                    <th className="text-left p-4 font-medium">Last run started</th>
                    <th className="text-left p-4 font-medium">Last run status</th>
                    <th className="text-left p-4 font-medium">Last run duration</th>
                    <th className="text-left p-4 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredActors.length > 0 ? (
                    filteredActors.map((actor) => (
                      <tr key={actor.actorId} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-4">
                          <Link to={`/actors/${actor.actorId}`} className="flex items-center gap-3 hover:underline">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              {getActorIcon(actor.actorId)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{actor.name}</p>
                              <p className="text-xs text-muted-foreground">{actor.slug}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{(actor.stats.runs / 1000).toFixed(1)}K</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Select defaultValue={actor.pricingModel}>
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pay per event">Pay per event</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 text-sm">2025-10-20 18:01:10</td>
                        <td className="p-4">
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                            ✓ Succeeded
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">12 s</td>
                        <td className="p-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleBookmark(actor.actorId);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Bookmark 
                              className={`h-4 w-4 ${actor.isBookmarkedByUser ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                            />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Code className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">No actors yet</h3>
                            <p className="text-sm text-muted-foreground">
                              {searchTerm 
                                ? 'Try adjusting your search' 
                                : 'Start using actors from the Store, and they will appear here'}
                            </p>
                          </div>
                          <Link to="/store">
                            <Button>Browse Store</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredActors.length > 0 && (
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