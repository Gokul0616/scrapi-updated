import React, { useState } from 'react';
import { Header } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Settings as SettingsIcon, User, Lock, Key, Bell, CreditCard, Copy, Trash2, Plus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

export function Settings() {
  const { user, updateUser, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Settings" icon={SettingsIcon} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-48 shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-card border rounded-lg p-6">
                {activeTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} token={token} />}
                {activeTab === 'security' && <SecurityTab token={token} />}
                {activeTab === 'api-keys' && <ApiKeysTab token={token} />}
                {activeTab === 'notifications' && <NotificationsTab user={user} updateUser={updateUser} token={token} />}
                {activeTab === 'billing' && <BillingTab user={user} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ user, updateUser, token }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put('/api/auth/profile', {
        username: formData.username,
        fullName: formData.fullName
      });

      updateUser(response.data.user);
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Profile Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your account information</p>
      
      {message && (
        <Alert variant={message.includes('success') ? 'default' : 'destructive'} className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="username"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <Input
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input
            value={formData.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Security Tab Component
function SecurityTab({ token }) {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/api/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      toast({
        title: 'Success',
        description: 'Password changed successfully'
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Security Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Change your password</p>
      
      {message && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">Current Password</label>
          <Input
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <Input
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Confirm New Password</label>
          <Input
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            placeholder="••••••••"
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        <Separator className="my-4" />

        <Button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </Button>
      </form>
    </div>
  );
}

// API Keys Tab Component
function ApiKeysTab({ token }) {
  const [apiTokens, setApiTokens] = useState([]);
  const [tokenName, setTokenName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewToken, setShowNewToken] = useState('');
  const { toast } = useToast();

  React.useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await api.get('/api/auth/api-tokens');
      setApiTokens(response.data.tokens);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/auth/api-tokens', { name: tokenName });
      
      setShowNewToken(response.data.token.token);
      setTokenName('');
      fetchTokens();
      toast({
        title: 'Success',
        description: 'API token created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API token',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleDeleteToken = async (tokenId) => {
    try {
      await api.delete(`/api/auth/api-tokens/${tokenId}`);
      
      fetchTokens();
      toast({
        title: 'Success',
        description: 'API token deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API token',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard'
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">API Keys</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your API tokens for integrations</p>

      {showNewToken && (
        <Alert className="mb-4">
          <AlertDescription>
            <p className="font-medium mb-2">Your new API token (save it now, it won't be shown again):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-sm break-all">{showNewToken}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(showNewToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowNewToken('')}>
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleCreateToken} className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Token name (e.g., Production API)"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        </div>
      </form>

      <Separator className="my-4" />

      <div className="space-y-3">
        {apiTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API tokens yet</p>
        ) : (
          apiTokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{token.name}</p>
                <code className="text-xs text-muted-foreground">{token.token}</code>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ user, updateUser, token }) {
  const [notifications, setNotifications] = useState(user?.notifications || {});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (key) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    setLoading(true);

    try {
      const response = await api.put('/api/auth/notifications', newNotifications);

      updateUser({ ...user, notifications: response.data.notifications });
      toast({
        title: 'Success',
        description: 'Notification preferences updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Notification Preferences</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage how you receive notifications</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.email}
            onChange={() => handleToggle('email')}
            disabled={loading}
            className="h-4 w-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Platform Notifications</p>
            <p className="text-sm text-muted-foreground">Receive in-app notifications</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.platform}
            onChange={() => handleToggle('platform')}
            disabled={loading}
            className="h-4 w-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Actor Run Notifications</p>
            <p className="text-sm text-muted-foreground">Get notified when actor runs complete</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.actorRuns}
            onChange={() => handleToggle('actorRuns')}
            disabled={loading}
            className="h-4 w-4"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Billing Notifications</p>
            <p className="text-sm text-muted-foreground">Receive billing and payment updates</p>
          </div>
          <input
            type="checkbox"
            checked={notifications.billing}
            onChange={() => handleToggle('billing')}
            disabled={loading}
            className="h-4 w-4"
          />
        </div>
      </div>
    </div>
  );
}

// Billing Tab Component
function BillingTab({ user }) {
  const planDetails = {
    free: { name: 'Free', price: '$0', credits: '$5', ram: '8 GB' },
    starter: { name: 'Starter', price: '$49', credits: '$49', ram: '16 GB' },
    scale: { name: 'Scale', price: '$499', credits: '$499', ram: '64 GB' },
    business: { name: 'Business', price: '$999', credits: '$999', ram: '128 GB' },
    enterprise: { name: 'Enterprise', price: 'Custom', credits: 'Custom', ram: 'Custom' }
  };

  const currentPlan = planDetails[user?.plan || 'free'];
  
  // Calculate usage percentages and display strings
  const ramPercentage = ((user?.usage?.ramUsedMB || 0) / (user?.usage?.ramLimitMB || 8192)) * 100;
  const creditsPercentage = ((user?.usage?.creditsUsed || 0) / (user?.usage?.creditsLimit || 5)) * 100;
  const creditsDisplay = '$' + (user?.usage?.creditsUsed?.toFixed(2) || '0.00') + ' / $' + (user?.usage?.creditsLimit?.toFixed(2) || '5.00');

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Billing & Usage</h2>
      <p className="text-sm text-muted-foreground mb-6">Manage your subscription and view usage</p>

      <div className="space-y-6">
        {/* Current Plan */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Current Plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">{currentPlan.price}/month</p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-4">
          <h3 className="font-medium">Usage This Month</h3>
          
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">RAM Usage</span>
              <span className="text-sm font-medium">
                {user?.usage?.ramUsedMB || 0} MB / {user?.usage?.ramLimitMB || 8192} MB
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: ramPercentage + '%' }}
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Credits Used</span>
              <span className="text-sm font-medium">
                {creditsDisplay}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: creditsPercentage + '%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
