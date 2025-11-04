import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, ShoppingBag, Play, Save, Layers, 
  Calendar, Code, MessageCircle, Globe, Settings,
  ChevronDown, Sun, Moon, Search, Bell, Flame, ArrowLeft,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Code, label: 'Actors', path: '/actors' },
    { icon: Play, label: 'Runs', path: '/runs' },
    { icon: Save, label: 'Saved tasks', path: '/saved' },
    { icon: Layers, label: 'Integrations', path: '/integrations' },
    { icon: Calendar, label: 'Schedules', path: '/schedules' },
    { icon: Globe, label: 'Proxy', path: '/proxy' },
  ];
  
  const devMenuItems = [
    { icon: Code, label: 'My Actors', path: '/my-actors' },
    { icon: ShoppingBag, label: 'Insights', path: '/insights' },
    { icon: MessageCircle, label: 'Messaging', path: '/messaging' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  // Menu Item Component with Tooltip
  const MenuItem = ({ item, isActive }) => {
    const content = (
      <div className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent rounded-md cursor-pointer ${
        isActive ? 'bg-accent' : ''
      }`}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </div>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={item.path}>{content}</Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <Link to={item.path}>{content}</Link>;
  };
  
  return (
    <div className={`h-screen border-r bg-background flex flex-col transition-all duration-300 ${
      collapsed ? 'w-[60px]' : 'w-[180px]'
    }`}>
      {/* User Profile */}
      {!collapsed ? (
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg p-2">
                <Avatar className="h-8 w-8 bg-purple-600">
                  <AvatarFallback className="bg-purple-600 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user?.username || 'User'}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user?.plan || 'Free'}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="p-2 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 bg-purple-600 cursor-pointer">
                <AvatarFallback className="bg-purple-600 text-white text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Search */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-8 pr-8 h-9 text-sm"
            />
            <kbd className="absolute right-2 top-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      )}
      
      {/* Get Started Progress */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span className="font-medium">Get started</span>
            <span className="text-muted-foreground ml-auto">1/4 steps</span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-primary"></div>
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          <MenuItem item={{ icon: ShoppingBag, label: 'Scrapi Store', path: '/store' }} isActive={location.pathname === '/store'} />
          
          {menuItems.map((item) => (
            <MenuItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>
        
        <Separator className="my-4" />
        
        {/* Development Section */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground">
              <span>Development</span>
              <ChevronDown className="h-3 w-3 ml-auto" />
            </div>
          </div>
        )}
        
        <nav className="space-y-1 px-2">
          {devMenuItems.map((item) => (
            <MenuItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>
      </div>
      
      {/* Bottom Menu */}
      <div className="border-t">
        {/* Usage Stats */}
        {!collapsed && user && (
          <div className="px-4 py-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">RAM</span>
              <span>{user.usage?.ramUsedMB || 0} MB / {(user.usage?.ramLimitMB / 1024).toFixed(0) || 8} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Usage</span>
              <span>${user.usage?.creditsUsed?.toFixed(2) || '0.00'} / ${user.usage?.creditsLimit?.toFixed(2) || '5.00'}</span>
            </div>
          </div>
        )}
        
        {!collapsed && (
          <div className="px-4 pb-4">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/settings')}>
              Upgrade to Starter
              <span className="ml-auto">→</span>
            </Button>
          </div>
        )}
        
        {/* Logo and Collapse Button */}
        <div className="px-4 pb-4 flex items-center gap-2">
          {!collapsed && (
            <img 
              src="/logo.png" 
              alt="Scrapi Logo" 
              className="h-6 w-auto dark:invert"
            />
          )}
          <div className="ml-auto flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? "right" : "top"}>
                  <p>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header({ title, actions, icon }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Define menu icons mapping
  const menuIcons = {
    'Home': Home,
    'Scrapi Console': Home,
    'Actors': Code,
    'Runs': Play,
    'Saved Tasks': Save,
    'Saved tasks': Save,
    'Integrations': Layers,
    'Schedules': Calendar,
    'My Actors': Code,
    'Insights': ShoppingBag,
    'Messaging': MessageCircle,
    'Proxy': Globe,
    'Scrapi Store': ShoppingBag,
  };
  
  // Get the icon for this page
  const IconComponent = icon || menuIcons[title];
  const showBackButton = !IconComponent;
  
  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : IconComponent ? (
              <IconComponent className="h-5 w-5 text-orange-500" />
            ) : (
              <Flame className="h-5 w-5 text-orange-500" />
            )}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <div key={index} className="px-4 py-3 hover:bg-accent border-b last:border-b-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
          {actions}
        </div>
      </div>
    </div>
  );
}
